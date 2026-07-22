import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdmin } from "./admins.functions";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Read availability for a single item over a date window. Admin-gated. */
export const getItemAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        inventory_item_id: z.string().uuid(),
        start_date: dateStr,
        end_date: dateStr,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: avail, error } = await supabaseAdmin.rpc("inventory_availability", {
      p_item: data.inventory_item_id,
      p_start: data.start_date,
      p_end: data.end_date,
    });
    if (error) throw new Error(error.message);
    return Number(avail ?? 0);
  });

/** Batch availability for many items over a date window. Admin-gated. */
export const getAvailabilityForItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        item_ids: z.array(z.string().uuid()).max(500),
        start_date: dateStr,
        end_date: dateStr,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const results: Array<{ item_id: string; available: number }> = [];
    for (const id of data.item_ids) {
      const { data: avail, error } = await supabaseAdmin.rpc("inventory_availability", {
        p_item: id,
        p_start: data.start_date,
        p_end: data.end_date,
      });
      if (error) throw new Error(error.message);
      results.push({ item_id: id, available: Number(avail ?? 0) });
    }
    return results;
  });

/** Atomically reserve inventory. Returns new reservation id. Admin-gated. */
export const reserveInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        inventory_item_id: z.string().uuid(),
        quote_id: z.string().uuid().nullable(),
        quantity: z.number().int().positive(),
        start_date: dateStr,
        end_date: dateStr,
        hold_type: z.enum(["soft", "firm"]),
        expires_at: z.string().datetime().nullable().optional(),
        allow_overbook: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: id, error } = await supabaseAdmin.rpc("reserve_inventory", {
      p_item: data.inventory_item_id,
      p_quote: data.quote_id as unknown as string,
      p_qty: data.quantity,
      p_start: data.start_date,
      p_end: data.end_date,
      p_hold_type: data.hold_type,
      p_expires: (data.expires_at ?? null) as unknown as string,
      p_allow_overbook: data.allow_overbook ?? false,
    });
    if (error) throw new Error(error.message);
    return id as string;
  });

/** Release all active reservations for a quote. Returns count released. Admin-gated. */
export const releaseQuoteReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: count, error } = await supabaseAdmin.rpc("release_quote_reservations", {
      p_quote: data.quote_id,
    });
    if (error) throw new Error(error.message);
    return Number(count ?? 0);
  });
