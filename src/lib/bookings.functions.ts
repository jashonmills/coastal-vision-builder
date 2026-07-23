import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
   Bookings: wires quotes ↔ inventory ↔ scheduler ↔ returns.
   ============================================================ */


/** Resolve inventory_item_id for a quote_items row (direct or via pricing mapping).
 *  Also returns the list of quote lines that could NOT be resolved (silent-fail surface). */
async function resolveInventoryIdsForQuote(
  supabase: any,
  quoteId: string,
): Promise<{
  resolved: Array<{ quote_item_id: string; inventory_item_id: string; quantity: number; name: string }>;
  unmapped: Array<{ quote_item_id: string; name: string; quantity: number; pricing_item_id: string | null }>;
}> {
  const { data: items, error } = await supabase
    .from("quote_items")
    .select("id, name, quantity, inventory_item_id, pricing_item_id, category")
    .eq("quote_id", quoteId);
  if (error) throw new Error(error.message);
  if (!items || items.length === 0) return { resolved: [], unmapped: [] };

  const needMapPricingIds = items
    .filter((i: any) => !i.inventory_item_id && i.pricing_item_id)
    .map((i: any) => i.pricing_item_id) as string[];

  let mapByPricing: Record<string, string> = {};
  if (needMapPricingIds.length) {
    const { data: maps } = await supabase
      .from("pricing_inventory_mappings")
      .select("pricing_item_id, inventory_item_id, active")
      .in("pricing_item_id", needMapPricingIds)
      .eq("active", true);
    mapByPricing = (maps ?? []).reduce((acc: any, m: any) => {
      if (m.pricing_item_id && m.inventory_item_id) acc[m.pricing_item_id] = m.inventory_item_id;
      return acc;
    }, {});
  }

  // Categories that are non-inventory by nature (services / venues / fees)
  const NON_INV_CATS = new Set(["delivery", "venue", "service", "fee", "labor", "cleaning fee"]);

  const resolved: Array<{ quote_item_id: string; inventory_item_id: string; quantity: number; name: string }> = [];
  const unmapped: Array<{ quote_item_id: string; name: string; quantity: number; pricing_item_id: string | null }> = [];
  for (const it of items) {
    const invId = it.inventory_item_id ?? (it.pricing_item_id ? mapByPricing[it.pricing_item_id] : null);
    if (invId) {
      resolved.push({
        quote_item_id: it.id,
        inventory_item_id: invId,
        quantity: Number(it.quantity ?? 0),
        name: it.name,
      });
    } else {
      const cat = (it.category ?? "").toLowerCase();
      if (NON_INV_CATS.has(cat)) continue; // Delivery / Venue lines don't need inventory
      unmapped.push({
        quote_item_id: it.id,
        name: it.name,
        quantity: Number(it.quantity ?? 0),
        pricing_item_id: it.pricing_item_id ?? null,
      });
    }
  }
  return { resolved, unmapped };
}

/** Apply a status delta on an inventory_items row and write a transaction record. */
async function applyInventoryMove(
  supabase: any,
  opts: {
    inventory_item_id: string;
    from_status: "available" | "reserved" | "checked_out" | "cleaning" | "maintenance" | "damaged_missing";
    to_status: "available" | "reserved" | "checked_out" | "cleaning" | "maintenance" | "damaged_missing";
    quantity: number;
    related_quote_id?: string | null;
    transaction_type: string;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (opts.quantity <= 0) return;
  const cols: Record<string, string> = {
    reserved: "reserved_quantity",
    checked_out: "checked_out_quantity",
    cleaning: "cleaning_quantity",
    maintenance: "maintenance_quantity",
    damaged_missing: "damaged_missing_quantity",
  };
  const { data: row, error } = await supabase
    .from("inventory_items")
    .select(
      "reserved_quantity, checked_out_quantity, cleaning_quantity, maintenance_quantity, damaged_missing_quantity",
    )
    .eq("id", opts.inventory_item_id)
    .single();
  if (error) throw new Error(error.message);

  const patch: Record<string, number> = {};
  if (opts.from_status !== "available") {
    const col = cols[opts.from_status];
    patch[col] = Math.max(0, (row[col] ?? 0) - opts.quantity);
  }
  if (opts.to_status !== "available") {
    const col = cols[opts.to_status];
    patch[col] = (patch[col] ?? row[col] ?? 0) + opts.quantity;
  }
  if (Object.keys(patch).length) {
    const { error: updErr } = await supabase
      .from("inventory_items")
      .update(patch)
      .eq("id", opts.inventory_item_id);
    if (updErr) throw new Error(updErr.message);
  }

  const { error: txErr } = await supabase.from("inventory_transactions").insert({
    inventory_item_id: opts.inventory_item_id,
    quantity: opts.quantity,
    from_status: opts.from_status,
    to_status: opts.to_status,
    transaction_type: opts.transaction_type,
    related_quote_id: opts.related_quote_id ?? null,
    notes: opts.notes ?? null,
    created_by: opts.created_by ?? null,
  });
  if (txErr) throw new Error(txErr.message);
}

/* ---------------------- Booking status query ---------------------- */

export const getQuoteBookingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: tx } = await supabase
      .from("inventory_transactions")
      .select("id, transaction_type, quantity, inventory_item_id")
      .eq("related_quote_id", data.quote_id)
      .eq("transaction_type", "reserve_quote");
    const { data: events } = await supabase
      .from("rental_calendar_events")
      .select("id, title, event_type, start_time, end_time, status, location, assigned_to")
      .eq("quote_id", data.quote_id)
      .is("deleted_at", null)
      .order("start_time");
    return {
      reserved: (tx ?? []).length > 0,
      reserve_tx_count: (tx ?? []).length,
      events: events ?? [],
    };
  });

/* ---------------------- Booking integrity (unmapped lines) ---------------------- */

export const getQuoteBookingIntegrity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { resolved, unmapped } = await resolveInventoryIdsForQuote(context.supabase, data.quote_id);
    return {
      resolved_count: resolved.length,
      unmapped_lines: unmapped,
    };
  });

/* ---------------------- Book quote (reserve + schedule) ---------------------- */

export const bookQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_id: z.string().uuid(),
      allow_overbook: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Idempotency: if reserve tx already exist, don't double-reserve.
    const { data: existingTx } = await supabase
      .from("inventory_transactions")
      .select("id")
      .eq("related_quote_id", data.quote_id)
      .eq("transaction_type", "reserve_quote")
      .limit(1);
    const alreadyReserved = (existingTx ?? []).length > 0;

    const { resolved: lines, unmapped } = await resolveInventoryIdsForQuote(supabase, data.quote_id);

    // Detect venue-only quotes (no resolvable inventory lines, tied to a venue request).
    let isVenueOnly = false;
    if (lines.length === 0 && unmapped.length === 0) {
      const { data: qrow } = await supabase
        .from("quotes")
        .select("quote_request_id")
        .eq("id", data.quote_id)
        .single();
      if (qrow?.quote_request_id) {
        const { data: req } = await supabase
          .from("quote_requests")
          .select("request_type")
          .eq("id", qrow.quote_request_id)
          .single();
        isVenueOnly = req?.request_type === "venue";
      }
    }

    if (isVenueOnly) {
      // Use the venue helper directly (don't invoke another server-fn stub).
      const { confirmVenueBookingHelper } = await import("./venue-bookings.functions");
      const res = await confirmVenueBookingHelper(supabase, {
        quote_id: data.quote_id,
        userId: userId,
      });
      return {
        ok: true,
        already_reserved: alreadyReserved,
        lines_reserved: 0,
        unmapped_lines: [] as Array<{ quote_item_id: string; name: string; quantity: number; pricing_item_id: string | null }>,
        events_created: res.events_created,
        has_event_date: true,
        venue_only: true,
      };
    }

    // Reservation ledger: convert to FIRM holds BEFORE mutating physical
    // inventory buckets. If any line is short (and overbook not allowed),
    // release any holds already created for this quote in this call and
    // abort before status flips to 'booked'.
    {
      const { releaseQuoteHolds, reserveQuoteHolds } = await import("./reservations.server");
      try {
        await releaseQuoteHolds(data.quote_id);
      } catch (e) {
        console.warn("[bookQuote] pre-book release failed", e);
      }
      const res = await reserveQuoteHolds({
        quoteId: data.quote_id,
        holdType: "firm",
        expiresAt: null,
        allowOverbook: !!data.allow_overbook,
      });
      if (res.failures.length) {
        try { await releaseQuoteHolds(data.quote_id); } catch { /* noop */ }
        const list = res.failures
          .map((f) => `${f.name} (need ${f.requested}, ${f.available} available)`)
          .join("; ");
        throw new Error(`Cannot book — insufficient inventory for: ${list}`);
      }
    }

    if (!alreadyReserved) {
      for (const ln of lines) {
        await applyInventoryMove(supabase, {
          inventory_item_id: ln.inventory_item_id,
          from_status: "available",
          to_status: "reserved",
          quantity: ln.quantity,
          related_quote_id: data.quote_id,
          transaction_type: "reserve_quote",
          notes: `Reserved for quote (${ln.name})`,
          created_by: userId,
        });
      }
    }

    // Load quote for event metadata
    const { data: quote } = await supabase
      .from("quotes")
      .select("id, quote_number, customer_name, event_date, event_location, event_type")
      .eq("id", data.quote_id)
      .single();

    let eventsCreated = 0;
    if (quote?.event_date) {
      const evDate = new Date(quote.event_date + "T00:00:00");
      const delivery = new Date(evDate);
      delivery.setDate(delivery.getDate() - 1);
      delivery.setHours(9, 0, 0, 0);
      const pickup = new Date(evDate);
      pickup.setDate(pickup.getDate() + 1);
      pickup.setHours(10, 0, 0, 0);

      const baseTitle = `${quote.quote_number} · ${quote.customer_name}`;
      const wantedEvents: Array<{ event_type: string; title: string; start_time: string; color: string }> = [
        { event_type: "delivery", title: `Delivery — ${baseTitle}`, start_time: delivery.toISOString(), color: "#10b981" },
        { event_type: "pickup", title: `Pickup — ${baseTitle}`, start_time: pickup.toISOString(), color: "#14b8a6" },
      ];

      // Skip event types that already exist for this quote
      const { data: existingEvents } = await supabase
        .from("rental_calendar_events")
        .select("event_type")
        .eq("quote_id", data.quote_id)
        .is("deleted_at", null);
      const have = new Set((existingEvents ?? []).map((e: any) => e.event_type));

      const toInsert = wantedEvents
        .filter((e) => !have.has(e.event_type))
        .map((e) => ({
          title: e.title,
          event_type: e.event_type,
          start_time: e.start_time,
          all_day: false,
          status: "scheduled",
          color: e.color,
          quote_id: data.quote_id,
          location: quote.event_location ?? null,
          notes: null,
          created_by: userId,
        }));

      if (toInsert.length) {
        const { error: insErr } = await supabase.from("rental_calendar_events").insert(toInsert);
        if (insErr) throw new Error(insErr.message);
        eventsCreated = toInsert.length;
      }
    }

    // Set quote status to booked
    await supabase
      .from("quotes")
      .update({ status: "booked", booked_at: new Date().toISOString() })
      .eq("id", data.quote_id);

    // Ensure a Job exists for this booked quote (best-effort).
    try {
      const { upsertJobForQuote } = await import("./jobs.functions");
      await upsertJobForQuote(supabase, data.quote_id);
    } catch (e) {
      console.warn("[bookQuote] upsertJobForQuote failed", e);
    }

    // Emit notifications
    try {
      await supabase.from("admin_notifications").insert({
        kind: "quote_booked",
        title: `Quote ${quote?.quote_number ?? ""} booked`,
        body: `${quote?.customer_name ?? "Customer"} · ${lines.length} reserved line(s)${unmapped.length ? ` · ${unmapped.length} unmapped` : ""}`,
        severity: unmapped.length > 0 ? "warning" : "info",
        related_id: data.quote_id,
        link: `/admin/quotes/${data.quote_id}/edit`,
      });
      if (unmapped.length > 0) {
        await supabase.from("admin_notifications").insert({
          kind: "quote_unmapped_lines",
          title: `Booking has ${unmapped.length} unmapped line(s)`,
          body: `Pricing items missing inventory link on quote ${quote?.quote_number ?? ""}`,
          severity: "warning",
          related_id: data.quote_id,
          link: `/admin/quotes/${data.quote_id}/edit`,
        });
      }
    } catch (e) {
      console.warn("[bookQuote] notification insert failed", e);
    }

    return {
      ok: true,
      already_reserved: alreadyReserved,
      lines_reserved: alreadyReserved ? 0 : lines.length,
      unmapped_lines: unmapped,
      events_created: eventsCreated,
      has_event_date: !!quote?.event_date,
    };
  });

/* ---------------------- Unbook quote (release reservations) ---------------------- */

export const unbookQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Release reservation ledger holds first (independent of physical
    // bucket accounting below, which stays untouched).
    try {
      const { releaseQuoteHolds } = await import("./reservations.server");
      await releaseQuoteHolds(data.quote_id);
    } catch (e) {
      console.warn("[unbookQuote] release holds failed", e);
    }

    // Net out previous moves for this quote on each item
    const { data: txs } = await supabase
      .from("inventory_transactions")
      .select("inventory_item_id, from_status, to_status, quantity, transaction_type")
      .eq("related_quote_id", data.quote_id);

    const net: Record<string, Record<string, number>> = {}; // item → status → net qty currently held
    for (const t of txs ?? []) {
      const map = (net[t.inventory_item_id] ??= {});
      if (t.from_status && t.from_status !== "available") {
        map[t.from_status] = (map[t.from_status] ?? 0) - t.quantity;
      }
      if (t.to_status && t.to_status !== "available") {
        map[t.to_status] = (map[t.to_status] ?? 0) + t.quantity;
      }
    }
    // Release whatever quantity is still reserved or checked_out back to available
    for (const [itemId, statuses] of Object.entries(net)) {
      for (const status of ["reserved", "checked_out"] as const) {
        const qty = statuses[status] ?? 0;
        if (qty > 0) {
          await applyInventoryMove(supabase, {
            inventory_item_id: itemId,
            from_status: status,
            to_status: "available",
            quantity: qty,
            related_quote_id: data.quote_id,
            transaction_type: "release_quote",
            notes: "Unbooked quote",
            created_by: userId,
          });
        }
      }
    }

    // Soft-delete the auto-created delivery/pickup events for this quote
    await supabase
      .from("rental_calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("quote_id", data.quote_id)
      .in("event_type", ["delivery", "pickup", "check_out", "check_in", "venue_hold", "venue_booked", "venue_setup", "venue_teardown"]);

    await supabase
      .from("quotes")
      .update({ status: "approved", booked_at: null })
      .eq("id", data.quote_id);

    return { ok: true };
  });

/* ---------------------- Job sheet ---------------------- */

export const getJobSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: quote, error } = await supabase
      .from("quotes")
      .select(
        "id, quote_number, status, customer_name, customer_email, customer_phone, event_type, event_date, event_location, guest_count, internal_notes, customer_notes",
      )
      .eq("id", data.quote_id)
      .single();
    if (error) throw new Error(error.message);

    const { data: items } = await supabase
      .from("quote_items")
      .select("id, name, quantity, unit, inventory_item_id, pricing_item_id, sort_order")
      .eq("quote_id", data.quote_id)
      .order("sort_order");

    const { resolved } = await resolveInventoryIdsForQuote(supabase, data.quote_id);
    const invIdByQuoteItem = new Map<string, string>(resolved.map((r) => [r.quote_item_id, r.inventory_item_id]));

    const invIds = Array.from(new Set(resolved.map((r) => r.inventory_item_id)));
    const { data: invRows } = invIds.length
      ? await supabase.from("inventory_items").select("id, name, requires_cleaning").in("id", invIds)
      : { data: [] as any[] };
    const invById = new Map((invRows ?? []).map((r: any) => [r.id, r]));

    const { data: txs } = await supabase
      .from("inventory_transactions")
      .select("inventory_item_id, from_status, to_status, quantity, transaction_type")
      .eq("related_quote_id", data.quote_id);

    // Compute per-item totals from transactions tied to this quote
    const tally: Record<string, { reserved: number; checked_out: number; returned: number }> = {};
    for (const t of txs ?? []) {
      const m = (tally[t.inventory_item_id] ??= { reserved: 0, checked_out: 0, returned: 0 });
      if (t.transaction_type === "reserve_quote") m.reserved += t.quantity;
      if (t.transaction_type === "release_quote") m.reserved -= t.quantity;
      if (t.transaction_type === "check_out_quote") {
        m.checked_out += t.quantity;
        m.reserved -= t.quantity;
      }
      if (t.transaction_type === "check_in_quote") {
        m.checked_out -= t.quantity;
        m.returned += t.quantity;
      }
    }

    const { data: returns } = await supabase
      .from("quote_returns")
      .select("*")
      .eq("quote_id", data.quote_id)
      .order("returned_at", { ascending: false });

    const { data: events } = await supabase
      .from("rental_calendar_events")
      .select("id, title, event_type, start_time, end_time, status, assigned_to, color, location")
      .eq("quote_id", data.quote_id)
      .is("deleted_at", null)
      .order("start_time");

    const lines = (items ?? []).map((it: any) => {
      const invId = invIdByQuoteItem.get(it.id) ?? null;
      const inv = invId ? invById.get(invId) : null;
      const t = invId ? tally[invId] : null;
      return {
        quote_item_id: it.id,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        inventory_item_id: invId,
        inventory_name: inv?.name ?? null,
        requires_cleaning: inv?.requires_cleaning ?? false,
        reserved: t?.reserved ?? 0,
        checked_out: t?.checked_out ?? 0,
        returned: t?.returned ?? 0,
      };
    });

    return { quote, lines, returns: returns ?? [], events: events ?? [] };
  });

/* ---------------------- Check-out / Check-in ---------------------- */

export const checkOutQuoteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_id: z.string().uuid(),
      inventory_item_id: z.string().uuid(),
      quantity: z.number().int().min(1).max(100000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await applyInventoryMove(context.supabase, {
      inventory_item_id: data.inventory_item_id,
      from_status: "reserved",
      to_status: "checked_out",
      quantity: data.quantity,
      related_quote_id: data.quote_id,
      transaction_type: "check_out_quote",
      notes: "Checked out for job",
      created_by: context.userId,
    });
    return { ok: true };
  });

export const checkInQuoteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_id: z.string().uuid(),
      quote_item_id: z.string().uuid().optional(),
      inventory_item_id: z.string().uuid(),
      returned_quantity: z.number().int().min(0).max(100000),
      damaged_quantity: z.number().int().min(0).max(100000).default(0),
      missing_quantity: z.number().int().min(0).max(100000).default(0),
      condition_notes: z.string().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Find out if cleaning is required
    const { data: inv } = await supabase
      .from("inventory_items")
      .select("requires_cleaning, damaged_missing_quantity")
      .eq("id", data.inventory_item_id)
      .single();
    const requiresCleaning = !!inv?.requires_cleaning;

    const totalIn = data.returned_quantity + data.damaged_quantity + data.missing_quantity;
    if (totalIn === 0) return { ok: true };

    // returned (good) → cleaning or available
    if (data.returned_quantity > 0) {
      await applyInventoryMove(supabase, {
        inventory_item_id: data.inventory_item_id,
        from_status: "checked_out",
        to_status: requiresCleaning ? "cleaning" : "available",
        quantity: data.returned_quantity,
        related_quote_id: data.quote_id,
        transaction_type: "check_in_quote",
        notes: data.condition_notes ?? null,
        created_by: userId,
      });
    }
    // damaged → damaged_missing
    if (data.damaged_quantity > 0) {
      await applyInventoryMove(supabase, {
        inventory_item_id: data.inventory_item_id,
        from_status: "checked_out",
        to_status: "damaged_missing",
        quantity: data.damaged_quantity,
        related_quote_id: data.quote_id,
        transaction_type: "check_in_damaged",
        notes: data.condition_notes ?? null,
        created_by: userId,
      });
    }
    // missing → damaged_missing
    if (data.missing_quantity > 0) {
      await applyInventoryMove(supabase, {
        inventory_item_id: data.inventory_item_id,
        from_status: "checked_out",
        to_status: "damaged_missing",
        quantity: data.missing_quantity,
        related_quote_id: data.quote_id,
        transaction_type: "check_in_missing",
        notes: data.condition_notes ?? null,
        created_by: userId,
      });
    }

    await supabase.from("quote_returns").insert({
      quote_id: data.quote_id,
      quote_item_id: data.quote_item_id ?? null,
      inventory_item_id: data.inventory_item_id,
      returned_quantity: data.returned_quantity,
      damaged_quantity: data.damaged_quantity,
      missing_quantity: data.missing_quantity,
      condition_notes: data.condition_notes ?? null,
      returned_by: userId,
    });

    return { ok: true };
  });

export const completeQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quotes")
      .update({ status: "completed" })
      .eq("id", data.quote_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------- Date-range availability ---------------------- */

/**
 * For an inventory item on a given date, sum the reserved+checked_out qty
 * across ALL quotes whose event_date falls within ±1 day (the load-out window).
 */
export const checkInventoryAvailabilityOnDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      inventory_item_id: z.string().uuid(),
      event_date: z.string(),
      exclude_quote_id: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: inv } = await supabase
      .from("inventory_items")
      .select("id, name, total_owned_quantity, damaged_missing_quantity, maintenance_quantity")
      .eq("id", data.inventory_item_id)
      .single();
    if (!inv) return null;

    const target = new Date(data.event_date + "T00:00:00");
    const from = new Date(target);
    from.setDate(from.getDate() - 1);
    const to = new Date(target);
    to.setDate(to.getDate() + 1);

    // All quotes booked/approved with overlapping event_date
    const { data: overlappingQuotes } = await supabase
      .from("quotes")
      .select("id")
      .gte("event_date", from.toISOString().slice(0, 10))
      .lte("event_date", to.toISOString().slice(0, 10))
      .in("status", ["approved", "booked", "sent"]);

    const ids = (overlappingQuotes ?? [])
      .map((q: any) => q.id)
      .filter((id: string) => id !== data.exclude_quote_id);

    let conflictQty = 0;
    if (ids.length) {
      const { data: txs } = await supabase
        .from("inventory_transactions")
        .select("quantity, transaction_type")
        .eq("inventory_item_id", data.inventory_item_id)
        .in("related_quote_id", ids);
      for (const t of txs ?? []) {
        if (t.transaction_type === "reserve_quote" || t.transaction_type === "check_out_quote") {
          conflictQty += t.quantity;
        }
        if (t.transaction_type === "release_quote" || t.transaction_type === "check_in_quote") {
          conflictQty -= t.quantity;
        }
      }
    }

    const total = inv.total_owned_quantity ?? 0;
    const offline = (inv.damaged_missing_quantity ?? 0) + (inv.maintenance_quantity ?? 0);
    const available = Math.max(0, total - offline - Math.max(0, conflictQty));
    return {
      inventory_name: inv.name,
      total_owned: total,
      offline,
      reserved_on_date: Math.max(0, conflictQty),
      available_on_date: available,
    };
  });
