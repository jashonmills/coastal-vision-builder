import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ----------------------------- Quote Requests ----------------------------- */

const CreateQuoteRequestSchema = z.object({
  saved_recommendation_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().email().max(255),
  customer_phone: z.string().max(50).optional().nullable(),
  preferred_contact_method: z.enum(["email", "phone", "text"]).default("email"),
  event_type: z.string().max(100).optional().nullable(),
  event_date: z.string().optional().nullable(),
  event_location: z.string().max(500).optional().nullable(),
  guest_count: z.number().int().min(1).max(100000).optional().nullable(),
  planner_input: z.unknown().optional().nullable(),
  recommendation: z.unknown().optional().nullable(),
  pdf_url: z.string().url().optional().nullable(),
  customer_note: z.string().max(4000).optional().nullable(),
  request_type: z.enum(["rental", "venue"]).optional().default("rental"),
  venue: z.string().max(100).optional().nullable(),
});


// Public — anyone can submit a quote request. Uses the user-scoped client (anon or authed).
export const createQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateQuoteRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("quote_requests")
      .insert({
        saved_recommendation_id: data.saved_recommendation_id ?? null,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone ?? null,
        preferred_contact_method: data.preferred_contact_method,
        event_type: data.event_type ?? null,
        event_date: data.event_date ?? null,
        event_location: data.event_location ?? null,
        guest_count: data.guest_count ?? null,
        planner_input: (data.planner_input ?? null) as never,
        recommendation: (data.recommendation ?? null) as never,
        pdf_url: data.pdf_url ?? null,
        customer_note: data.customer_note ?? null,
        request_type: data.request_type ?? "rental",
        venue: data.venue ?? null,
        status: "new",
      })

      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Mark linked saved recommendation as quote_requested (if any)
    if (data.saved_recommendation_id) {
      await supabaseAdmin
        .from("saved_recommendations")
        .update({
          status: "quote_requested",
          quote_requested_at: new Date().toISOString(),
          quote_request_note: data.customer_note ?? null,
        })
        .eq("id", data.saved_recommendation_id);
    }

    // Auto-create scheduler entries: one on the request date, one on event date
    const guests = data.guest_count ? `${data.guest_count} guests` : "";
    const evtType = data.event_type ?? "Event";
    const isVenue = (data.request_type ?? "rental") === "venue";
    const venueLabel = data.venue === "beacon-on-broadway" ? "Beacon on Broadway" : (data.venue ?? "Venue");
    const titlePrefix = isVenue ? `New ${venueLabel} Inquiry` : "New Quote Request";
    const baseTitle = `${titlePrefix}: ${evtType}${guests ? " · " + guests : ""}`;
    type CalEvent = {
      title: string;
      event_type: string;
      start_time: string;
      all_day?: boolean;
      status?: string;
      color?: string | null;
      quote_request_id?: string | null;
      saved_recommendation_id?: string | null;
      location?: string | null;
      notes?: string | null;
    };
    const events: CalEvent[] = [
      {
        title: baseTitle,
        event_type: isVenue ? "venue_inquiry" : "quote_request",
        start_time: new Date().toISOString(),
        all_day: false,
        status: "pending",
        color: isVenue ? "#7c5cff" : "#d4a64a",
        quote_request_id: row.id,
        saved_recommendation_id: data.saved_recommendation_id ?? null,
        location: data.event_location ?? null,
        notes: data.customer_note ?? null,
      },
    ];
    if (data.event_date) {
      events.push({
        title: `${isVenue ? "Potential " + venueLabel + " Booking" : "Potential Event"}: ${evtType}${guests ? " · " + guests : ""}`,
        event_type: isVenue ? "venue_inquiry" : "quote_request",
        start_time: new Date(data.event_date).toISOString(),
        all_day: true,
        status: "pending",
        color: isVenue ? "#7c5cff" : "#d4a64a",
        quote_request_id: row.id,
        saved_recommendation_id: data.saved_recommendation_id ?? null,
        location: data.event_location ?? null,
      });
    }
    await supabaseAdmin.from("rental_calendar_events").insert(events);

    // In-app admin notification
    await supabaseAdmin.from("admin_notifications").insert({
      kind: isVenue ? "venue_inquiry" : "quote_request",
      severity: "info",
      title: `${isVenue ? venueLabel + " inquiry" : "New quote request"}: ${data.customer_name}`,
      body: `${evtType}${guests ? " · " + guests : ""}${data.event_date ? " · " + data.event_date : ""}${data.event_location ? " · " + data.event_location : ""}`,
      link: `/admin/quote-requests/${row.id}`,
      related_id: row.id,
    });

    return { id: row.id };
  });

export const listQuoteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quote_requests")
      .select(
        "id, customer_name, customer_email, customer_phone, event_type, event_date, event_location, guest_count, status, created_at, recommendation, pdf_url, saved_recommendation_id, request_type, venue, customer_note",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });


export const countNewQuoteRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const getQuoteRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("quote_requests")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateQuoteRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum([
        "new",
        "in_review",
        "quote_created",
        "quote_sent",
        "booked",
        "closed",
        "archived",
      ]),
      admin_notes: z.string().max(4000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: { status: typeof data.status; admin_notes?: string | null } = {
      status: data.status,
    };
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await context.supabase
      .from("quote_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- Quotes --------------------------------- */

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select(
        "id, quote_number, customer_name, customer_email, event_type, event_date, status, total_cents, created_at, sent_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: q, error } = await context.supabase
      .from("quotes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: items, error: iErr } = await context.supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", data.id)
      .order("sort_order");
    if (iErr) throw new Error(iErr.message);
    return { quote: q, items: items ?? [] };
  });

// Build a draft quote from a quote_request, pre-populating items from recommendation
export const createQuoteFromRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Load the request
    const { data: req, error: rErr } = await supabase
      .from("quote_requests")
      .select("*")
      .eq("id", data.quote_request_id)
      .single();
    if (rErr) throw new Error(rErr.message);

    // Load pricing items for matching
    const { data: pricing, error: pErr } = await supabase
      .from("pricing_items")
      .select("id, category, name, price_cents, unit");
    if (pErr) throw new Error(pErr.message);

    // Create the quote (snapshot customer/event info)
    const { data: q, error: qErr } = await supabase
      .from("quotes")
      .insert({
        quote_request_id: req.id,
        saved_recommendation_id: req.saved_recommendation_id,
        customer_name: req.customer_name,
        customer_email: req.customer_email,
        customer_phone: req.customer_phone,
        event_type: req.event_type,
        event_date: req.event_date,
        event_location: req.event_location,
        guest_count: req.guest_count,
        status: "draft",
      })
      .select("id, quote_number")
      .single();
    if (qErr) throw new Error(qErr.message);

    // Pre-populate items from recommendation picks
    const rec = (req.recommendation ?? {}) as {
      picks?: Array<{
        category?: string;
        item_id?: string;
        item_name?: string;
        quantity?: number;
        reason?: string;
      }>;
    };
    const picks = rec.picks ?? [];

    const rows = picks.map((pick, idx) => {
      const match = pick.item_id
        ? pricing?.find((p) => p.id === pick.item_id)
        : pricing?.find((p) => p.name?.toLowerCase() === (pick.item_name ?? "").toLowerCase());
      const qty = Math.max(1, Math.floor(pick.quantity ?? 1));
      const unit_price_cents = match?.price_cents ?? 0;
      return {
        quote_id: q.id,
        pricing_item_id: match?.id ?? null,
        category: match?.category ?? pick.category ?? null,
        name: match?.name ?? pick.item_name ?? "Item",
        description: null,
        quantity: qty,
        unit: match?.unit ?? "each",
        unit_price_cents,
        line_total_cents: unit_price_cents * qty,
        needs_pricing_review: !match,
        reason: pick.reason ?? null,
        sort_order: idx,
      };
    });

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("quote_items").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    // Recompute totals
    const subtotal = rows.reduce((s, r) => s + r.line_total_cents, 0);
    await supabase
      .from("quotes")
      .update({ subtotal_cents: subtotal, total_cents: subtotal })
      .eq("id", q.id);

    // Update request status
    await supabase
      .from("quote_requests")
      .update({ status: "quote_created" })
      .eq("id", req.id);

    return { id: q.id, quote_number: q.quote_number };
  });

const QuotePatchSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    customer_name: z.string().min(1).max(200).optional(),
    customer_email: z.string().email().max(255).optional(),
    customer_phone: z.string().max(50).nullable().optional(),
    event_type: z.string().max(100).nullable().optional(),
    event_date: z.string().nullable().optional(),
    event_location: z.string().max(500).nullable().optional(),
    guest_count: z.number().int().min(0).max(100000).nullable().optional(),
    delivery_fee_cents: z.number().int().min(0).optional(),
    cleaning_fee_cents: z.number().int().min(0).optional(),
    discount_cents: z.number().int().min(0).optional(),
    tax_cents: z.number().int().min(0).optional(),
    internal_notes: z.string().max(4000).nullable().optional(),
    customer_notes: z.string().max(4000).nullable().optional(),
    terms: z.string().max(4000).nullable().optional(),
    status: z.enum(["draft", "sent", "approved", "booked", "cancelled"]).optional(),
  }),
});

export const updateQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuotePatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quotes")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await recomputeQuoteTotals(context.supabase, data.id);
    return { ok: true };
  });

const QuoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  quote_id: z.string().uuid(),
  pricing_item_id: z.string().uuid().nullable().optional(),
  inventory_item_id: z.string().uuid().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  quantity: z.number().int().min(0).max(100000),
  unit: z.string().max(50),
  unit_price_cents: z.number().int().min(0),
  needs_pricing_review: z.boolean().optional(),
  reason: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const upsertQuoteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuoteItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    const line_total_cents = data.quantity * data.unit_price_cents;
    const payload = { ...data, line_total_cents };
    if (data.id) {
      const { error } = await context.supabase
        .from("quote_items")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("quote_items").insert(payload);
      if (error) throw new Error(error.message);
    }
    await recomputeQuoteTotals(context.supabase, data.quote_id);
    return { ok: true };
  });

export const deleteQuoteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), quote_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quote_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await recomputeQuoteTotals(context.supabase, data.quote_id);
    return { ok: true };
  });

export const sendQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: q, error } = await context.supabase
      .from("quotes")
      .update({ status: "sent", sent_at: now })
      .eq("id", data.id)
      .select("quote_request_id")
      .single();
    if (error) throw new Error(error.message);
    if (q?.quote_request_id) {
      await context.supabase
        .from("quote_requests")
        .update({ status: "quote_sent" })
        .eq("id", q.quote_request_id);
    }
    return { ok: true, sent_at: now };
  });

/* -------------------------------- helpers --------------------------------- */

async function recomputeQuoteTotals(supabase: any, quoteId: string) {
  const { data: items } = await supabase
    .from("quote_items")
    .select("line_total_cents")
    .eq("quote_id", quoteId);
  const subtotal = (items ?? []).reduce(
    (s: number, r: { line_total_cents: number }) => s + (r.line_total_cents ?? 0),
    0,
  );
  const { data: q } = await supabase
    .from("quotes")
    .select("delivery_fee_cents, cleaning_fee_cents, discount_cents, tax_cents")
    .eq("id", quoteId)
    .single();
  const total =
    subtotal +
    (q?.delivery_fee_cents ?? 0) +
    (q?.cleaning_fee_cents ?? 0) +
    (q?.tax_cents ?? 0) -
    (q?.discount_cents ?? 0);
  await supabase
    .from("quotes")
    .update({ subtotal_cents: subtotal, total_cents: Math.max(0, total) })
    .eq("id", quoteId);
}

/* ------------------------- pricing items (admin) -------------------------- */

export const listPricingItemsForBuilder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_items")
      .select("id, category, name, price_cents, unit")
      .order("category")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ----------------------- inventory availability -------------------------- */

// For a given quote, return availability for any line item that maps to an inventory item.
// Map key = quote_item.id, value = { available, total_owned, inventory_name } | null
export const getQuoteItemsAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: items } = await supabase
      .from("quote_items")
      .select("id, pricing_item_id, inventory_item_id, name")
      .eq("quote_id", data.quote_id);
    if (!items || items.length === 0) return {};

    // Collect inventory ids: direct link first, fallback via mappings table
    const directIds = items.map((i) => i.inventory_item_id).filter(Boolean) as string[];
    const pricingIds = items
      .filter((i) => !i.inventory_item_id && i.pricing_item_id)
      .map((i) => i.pricing_item_id) as string[];

    let mappingByPricing: Record<string, string> = {};
    if (pricingIds.length > 0) {
      const { data: maps } = await supabase
        .from("pricing_inventory_mappings")
        .select("pricing_item_id, inventory_item_id, active")
        .in("pricing_item_id", pricingIds)
        .eq("active", true);
      mappingByPricing = (maps ?? []).reduce<Record<string, string>>((acc, m) => {
        if (m.pricing_item_id && m.inventory_item_id) acc[m.pricing_item_id] = m.inventory_item_id;
        return acc;
      }, {});
    }

    const invIds = Array.from(new Set([
      ...directIds,
      ...Object.values(mappingByPricing),
    ]));
    if (invIds.length === 0) return {};

    const { data: inv } = await supabase
      .from("inventory_items")
      .select("id, name, total_owned_quantity, reserved_quantity, checked_out_quantity, cleaning_quantity, maintenance_quantity, damaged_missing_quantity")
      .in("id", invIds);

    const invById = new Map((inv ?? []).map((r) => [r.id, r]));
    const result: Record<string, { available: number; total_owned: number; inventory_name: string } | null> = {};
    for (const it of items) {
      const invId = it.inventory_item_id ?? (it.pricing_item_id ? mappingByPricing[it.pricing_item_id] : null);
      if (!invId) { result[it.id] = null; continue; }
      const row = invById.get(invId);
      if (!row) { result[it.id] = null; continue; }
      const used =
        (row.reserved_quantity ?? 0) +
        (row.checked_out_quantity ?? 0) +
        (row.cleaning_quantity ?? 0) +
        (row.maintenance_quantity ?? 0) +
        (row.damaged_missing_quantity ?? 0);
      const available = Math.max(0, (row.total_owned_quantity ?? 0) - used);
      result[it.id] = { available, total_owned: row.total_owned_quantity ?? 0, inventory_name: row.name };
    }
    return result;
  });
