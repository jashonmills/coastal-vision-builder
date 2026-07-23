// Server-only helper to filter a pricing catalog by date-aware inventory
// availability. If no eventDate is provided, or if any lookup fails, this
// module falls back to returning the catalog unchanged (no exclusions, no
// caps) — the AI planner / drafter must behave exactly as before in those
// cases.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PricingLike = { id: string };

export type AvailabilityInfo = {
  // pricing_item_id -> availability qty for the event window.
  // Only present for pricing items that ARE mapped to an inventory item.
  // Unmapped items are not included and should be treated as fully available.
  availableByPricingId: Record<string, number>;
};

function parseEventWindow(eventDate?: string | null): { start: string; end: string } | null {
  if (!eventDate) return null;
  // Accept YYYY-MM-DD or full ISO; parse as UTC to avoid TZ drift.
  const base = /^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? `${eventDate}T00:00:00Z` : eventDate;
  const d = new Date(base);
  if (isNaN(d.getTime())) return null;
  const start = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

/**
 * Given a pricing catalog and an event date, return:
 *  - filtered: catalog with mapped-but-out-of-stock items removed
 *  - info.availableByPricingId: available qty for mapped items with limited stock
 *
 * Behavior:
 *  - No eventDate / unparseable → returns { filtered: catalog, info: {} } (no-op).
 *  - No mappings → no-op.
 *  - Any error → logs and returns no-op.
 */
export async function filterCatalogByAvailability<T extends PricingLike>(
  catalog: T[],
  eventDate?: string | null,
): Promise<{ filtered: T[]; info: AvailabilityInfo }> {
  const empty: AvailabilityInfo = { availableByPricingId: {} };
  const window = parseEventWindow(eventDate);
  if (!window || catalog.length === 0) return { filtered: catalog, info: empty };

  try {
    const pricingIds = catalog.map((c) => c.id);
    const { data: maps, error: mErr } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .select("pricing_item_id, inventory_item_id, active")
      .in("pricing_item_id", pricingIds)
      .eq("active", true);
    if (mErr) {
      console.warn("[availability-catalog] mappings lookup failed, falling back:", mErr.message);
      return { filtered: catalog, info: empty };
    }
    const pricingToInv = new Map<string, string>();
    for (const m of maps ?? []) {
      if (m.pricing_item_id && m.inventory_item_id) {
        pricingToInv.set(m.pricing_item_id, m.inventory_item_id);
      }
    }
    if (pricingToInv.size === 0) return { filtered: catalog, info: empty };

    // Compute availability per unique inventory item.
    const invIds = Array.from(new Set(pricingToInv.values()));
    const availByInv: Record<string, number> = {};
    const results = await Promise.all(
      invIds.map(async (invId) => {
        try {
          const { data, error } = await supabaseAdmin.rpc("inventory_availability", {
            p_item: invId,
            p_start: window.start,
            p_end: window.end,
          });
          if (error) throw new Error(error.message);
          return { invId, qty: typeof data === "number" ? data : Number(data ?? 0) };
        } catch (e) {
          console.warn("[availability-catalog] inventory_availability failed for", invId, e);
          return { invId, qty: null as number | null };
        }
      }),
    );
    // If any lookup failed, fall back entirely — don't half-filter.
    if (results.some((r) => r.qty === null)) {
      return { filtered: catalog, info: empty };
    }
    for (const r of results) availByInv[r.invId] = r.qty as number;

    const availableByPricingId: Record<string, number> = {};
    const filtered: T[] = [];
    for (const item of catalog) {
      const invId = pricingToInv.get(item.id);
      if (!invId) {
        // Unmapped — leave fully available.
        filtered.push(item);
        continue;
      }
      const qty = availByInv[invId] ?? 0;
      if (qty <= 0) continue; // exclude out-of-stock mapped items
      availableByPricingId[item.id] = qty;
      filtered.push(item);
    }
    return { filtered, info: { availableByPricingId } };
  } catch (e) {
    console.warn("[availability-catalog] unexpected error, falling back:", e);
    return { filtered: catalog, info: empty };
  }
}
