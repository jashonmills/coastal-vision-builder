import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admins.functions";

/** All active pricing→inventory mappings. Admin-gated. */
export const listPricingInventoryMappings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .select("id, pricing_item_id, inventory_item_id, active")
      .eq("active", true);
    if (error) throw new Error(error.message);
    return (data ?? []).filter(
      (m) => m.pricing_item_id && m.inventory_item_id,
    ) as Array<{ id: string; pricing_item_id: string; inventory_item_id: string; active: boolean }>;
  });

/** Minimal inventory list for select dropdowns. Admin-gated. */
export const listInventoryOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("inventory_items")
      .select("id, name, category_id, total_owned_quantity, inventory_categories(name)")
      .eq("active", true)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      name: r.name as string,
      category: (r.inventory_categories?.name as string | undefined) ?? null,
      total_owned_quantity: Number(r.total_owned_quantity ?? 0),
    }));
  });

/** Upsert exactly one active mapping per pricing_item. Deactivates any prior
 *  active rows for that pricing item and inserts a fresh active row. */
export const upsertPricingInventoryMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        pricing_item_id: z.string().uuid(),
        inventory_item_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error: e1 } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .update({ active: false })
      .eq("pricing_item_id", data.pricing_item_id)
      .eq("active", true);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabaseAdmin.from("pricing_inventory_mappings").insert({
      pricing_item_id: data.pricing_item_id,
      inventory_item_id: data.inventory_item_id,
      recommendation_keyword: "",
      active: true,
    });
    if (e2) throw new Error(e2.message);
    return { ok: true as const };
  });

/** Deactivate all active mappings for a pricing_item ("None"). */
export const removePricingInventoryMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pricing_item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .update({ active: false })
      .eq("pricing_item_id", data.pricing_item_id)
      .eq("active", true);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Reverse view: which pricing items are linked to this inventory item. */
export const listPricingItemsForInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inventory_item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: maps, error } = await supabaseAdmin
      .from("pricing_inventory_mappings")
      .select("pricing_item_id, pricing_items(id, category, name, price_cents, unit)")
      .eq("inventory_item_id", data.inventory_item_id)
      .eq("active", true);
    if (error) throw new Error(error.message);
    return (maps ?? [])
      .map((m: any) => m.pricing_items)
      .filter(Boolean) as Array<{
      id: string;
      category: string;
      name: string;
      price_cents: number;
      unit: string;
    }>;
  });

/** Summary of active future holds per inventory item: total held quantity and
 *  the earliest committed start_date. Only counts holds whose window ends
 *  today or later and are not expired. */
export const getInventoryReservationSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("inventory_reservations")
      .select("inventory_item_id, quantity, start_date, end_date, expires_at, status")
      .eq("status", "active")
      .gte("end_date", today);
    if (error) throw new Error(error.message);
    const out: Record<string, { held: number; next_date: string | null }> = {};
    for (const r of (data ?? []) as any[]) {
      if (r.expires_at && r.expires_at <= nowIso) continue;
      const prev = out[r.inventory_item_id] ?? { held: 0, next_date: null };
      prev.held += Number(r.quantity ?? 0);
      const start = r.start_date as string;
      if (!prev.next_date || start < prev.next_date) prev.next_date = start;
      out[r.inventory_item_id] = prev;
    }
    return out;
  });
