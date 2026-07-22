import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Categories that never map to physical inventory.
const NON_INV_CATS = new Set([
  "delivery",
  "venue",
  "service",
  "fee",
  "labor",
  "cleaning fee",
]);

export type QuoteInventoryLine = {
  inventory_item_id: string;
  quantity: number;
  name: string;
};

/** Aggregate a quote's inventory-mapped line items (direct link or via
 *  pricing_inventory_mappings), grouped by inventory_item_id. Non-inventory
 *  categories and lines with no mapping are skipped silently. */
export async function resolveQuoteInventoryLines(
  quoteId: string,
): Promise<QuoteInventoryLine[]> {
  const { data: items, error } = await supabaseAdmin
    .from("quote_items")
    .select("id, name, quantity, inventory_item_id, pricing_item_id, category")
    .eq("quote_id", quoteId);
  if (error) throw new Error(error.message);
  if (!items?.length) return [];

  const pricingIds = items
    .filter((i) => !i.inventory_item_id && i.pricing_item_id)
    .map((i) => i.pricing_item_id!) as string[];
  let mapByPricing: Record<string, string> = {};
  if (pricingIds.length) {
    const { data: maps } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .select("pricing_item_id, inventory_item_id, active")
      .in("pricing_item_id", pricingIds)
      .eq("active", true);
    mapByPricing = (maps ?? []).reduce<Record<string, string>>((acc, m: any) => {
      if (m.pricing_item_id && m.inventory_item_id) acc[m.pricing_item_id] = m.inventory_item_id;
      return acc;
    }, {});
  }

  const agg = new Map<string, QuoteInventoryLine>();
  for (const it of items as any[]) {
    const invId = it.inventory_item_id ?? (it.pricing_item_id ? mapByPricing[it.pricing_item_id] : null);
    if (!invId) continue;
    const cat = (it.category ?? "").toLowerCase();
    if (NON_INV_CATS.has(cat)) continue;
    const qty = Number(it.quantity ?? 0);
    if (qty <= 0) continue;
    const prev = agg.get(invId);
    if (prev) prev.quantity += qty;
    else agg.set(invId, { inventory_item_id: invId, quantity: qty, name: it.name });
  }
  return [...agg.values()];
}

/** Occupied window = event_date ± 1 day. Returns null when no event_date. */
export function quoteWindowFromEventDate(
  eventDate: string | null | undefined,
): { start: string; end: string } | null {
  if (!eventDate) return null;
  const ev = new Date(eventDate + "T00:00:00Z");
  if (isNaN(ev.getTime())) return null;
  const start = new Date(ev);
  start.setUTCDate(ev.getUTCDate() - 1);
  const end = new Date(ev);
  end.setUTCDate(ev.getUTCDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

/** Release every active reservation for the quote. Returns count released. */
export async function releaseQuoteHolds(quoteId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("release_quote_reservations", {
    p_quote: quoteId,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export type ReserveFailure = {
  inventory_item_id: string;
  name: string;
  requested: number;
  available: number;
  error: string;
};

/** Create reservations for every inventory-mapped line of a quote over its
 *  event window. If event_date is missing, no-ops. Returns per-line failures
 *  when allow_overbook is false and stock is short. */
export async function reserveQuoteHolds(opts: {
  quoteId: string;
  holdType: "soft" | "firm";
  expiresAt: string | null;
  allowOverbook: boolean;
}): Promise<{ created: number; failures: ReserveFailure[]; skipped_no_date: boolean }> {
  const { data: quote, error: qe } = await supabaseAdmin
    .from("quotes")
    .select("event_date")
    .eq("id", opts.quoteId)
    .single();
  if (qe) throw new Error(qe.message);
  const win = quoteWindowFromEventDate(quote?.event_date);
  if (!win) return { created: 0, failures: [], skipped_no_date: true };

  const lines = await resolveQuoteInventoryLines(opts.quoteId);
  const failures: ReserveFailure[] = [];
  let created = 0;
  for (const l of lines) {
    const { error } = await supabaseAdmin.rpc("reserve_inventory", {
      p_item: l.inventory_item_id,
      p_quote: opts.quoteId,
      p_qty: l.quantity,
      p_start: win.start,
      p_end: win.end,
      p_hold_type: opts.holdType,
      p_expires: opts.expiresAt,
      p_allow_overbook: opts.allowOverbook,
    });
    if (error) {
      const m = /Insufficient availability:\s*(-?\d+)\s*available,\s*(\d+)\s*requested/.exec(error.message);
      failures.push({
        inventory_item_id: l.inventory_item_id,
        name: l.name,
        requested: m ? Number(m[2]) : l.quantity,
        available: m ? Number(m[1]) : 0,
        error: error.message,
      });
    } else {
      created++;
    }
  }
  return { created, failures, skipped_no_date: false };
}
