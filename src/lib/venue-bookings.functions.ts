import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
   Beacon on Broadway — venue booking logic.
   Venue bookings have no counted inventory; they live entirely
   in rental_calendar_events linked via quote_request_id / quote_id.
   ============================================================ */

export const BEACON_VENUE = {
  slug: "beacon-on-broadway",
  name: "Beacon on Broadway",
  address: "735 Broadway, Seaside, OR",
  color: "#7c5cff",
  colorSoft: "#a895ff",
} as const;

const VENUE_EVENT_TYPES = ["venue_hold", "venue_booked", "venue_setup", "venue_teardown"] as const;

function venueLabelFor(slug: string | null | undefined) {
  if (slug === BEACON_VENUE.slug) return BEACON_VENUE.name;
  return slug ?? "Venue";
}

async function loadRequest(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, customer_name, event_date, event_type, guest_count, venue, request_type")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/* ---------------------- Beacon pricing ---------------------- */

/**
 * Price the Beacon venue rental line based on the event date.
 * Rate card (mirrors the public /beacon-on-broadway page):
 *  - Off-season (Oct–Feb): $500 / 1-day, $750 / 2-day (any day)
 *  - Peak (Mar–Sep) Mon–Thu:  $500 / 1-day, $750 / 2-day
 *  - Peak (Mar–Sep) Fri–Sun:  $750 / 1-day, $1,200 / 2-day weekend package
 */
export function priceBeaconVenue(eventDateIso: string | null | undefined): {
  qty: number;
  unit: string;
  unit_price_cents: number;
  label: string;
  needs_review: boolean;
  reason: string | null;
} {
  if (!eventDateIso) {
    return {
      qty: 1,
      unit: "event",
      unit_price_cents: 0,
      label: "Venue Rental — set event date to auto-price",
      needs_review: true,
      reason: "No event date on request — set date to auto-price",
    };
  }
  const d = new Date(eventDateIso + "T00:00:00");
  const month = d.getMonth() + 1; // 1-12
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const isPeak = month >= 3 && month <= 9;
  if (!isPeak) {
    return { qty: 1, unit: "day", unit_price_cents: 50000, label: "Off-season day rate (Oct–Feb)", needs_review: false, reason: null };
  }
  const isWeekend = dow === 5 || dow === 6 || dow === 0;
  if (isWeekend) {
    return { qty: 1, unit: "weekend", unit_price_cents: 120000, label: "Peak weekend package (Fri–Sun, Mar–Sep)", needs_review: false, reason: null };
  }
  return { qty: 1, unit: "day", unit_price_cents: 50000, label: "Peak weekday rate (Mon–Thu, Mar–Sep)", needs_review: false, reason: null };
}

/* ---------------------- Plain helpers (re-usable across server fns) ---------------------- */

/**
 * Insert a "venue hold" calendar event for a quote_request.
 * Idempotent: skips if a hold/booked already exists for the request.
 */
export async function placeVenueHoldHelper(
  supabase: any,
  opts: { quote_request_id: string; userId: string | null },
) {
  const req = await loadRequest(supabase, opts.quote_request_id);
  if (!req.event_date) throw new Error("This request has no event date — add one before placing a hold.");

  const venueName = venueLabelFor(req.venue);
  const startIso = new Date(req.event_date + "T00:00:00").toISOString();
  const title = `${venueName} HOLD — ${req.customer_name}`;

  const { data: existing } = await supabase
    .from("rental_calendar_events")
    .select("id")
    .eq("quote_request_id", opts.quote_request_id)
    .in("event_type", ["venue_hold", "venue_booked"])
    .is("deleted_at", null)
    .limit(1);

  if (!existing || existing.length === 0) {
    const { error: insErr } = await supabase.from("rental_calendar_events").insert({
      title,
      event_type: "venue_hold",
      start_time: startIso,
      all_day: true,
      status: "scheduled",
      color: BEACON_VENUE.color,
      quote_request_id: opts.quote_request_id,
      location: `${venueName} · ${BEACON_VENUE.address}`,
      notes: `Tentative hold for ${req.event_type ?? "event"}${req.guest_count ? " · " + req.guest_count + " guests" : ""}.`,
      created_by: opts.userId,
    });
    if (insErr) throw new Error(insErr.message);
  }

  await supabase
    .from("quote_requests")
    .update({ status: "in_review" })
    .eq("id", opts.quote_request_id);

  return { ok: true, venueName, customerName: req.customer_name, eventDate: req.event_date };
}

/**
 * Upgrade any holds to "venue_booked" and add setup/teardown events.
 * Accepts either a quote_request_id or a quote_id (or both).
 */
export async function confirmVenueBookingHelper(
  supabase: any,
  opts: { quote_request_id?: string | null; quote_id?: string | null; userId: string | null },
) {
  let requestId = opts.quote_request_id ?? null;
  let eventDate: string | null = null;
  let customerName = "";
  let eventType: string | null = null;
  let guests: number | null = null;
  let venueSlug: string | null = null;

  if (opts.quote_id) {
    const { data: q, error } = await supabase
      .from("quotes")
      .select("id, quote_request_id, customer_name, event_date, event_type, guest_count")
      .eq("id", opts.quote_id)
      .single();
    if (error) throw new Error(error.message);
    requestId = requestId ?? q.quote_request_id;
    customerName = q.customer_name;
    eventDate = q.event_date;
    eventType = q.event_type;
    guests = q.guest_count;
  }
  if (requestId) {
    const req = await loadRequest(supabase, requestId);
    customerName ||= req.customer_name;
    eventDate ||= req.event_date;
    eventType ||= req.event_type;
    guests ||= req.guest_count;
    venueSlug = req.venue;
  }
  if (!eventDate) throw new Error("Cannot confirm a booking without an event date.");
  const venueName = venueLabelFor(venueSlug);
  const locText = `${venueName} · ${BEACON_VENUE.address}`;

  const evDate = new Date(eventDate + "T00:00:00");
  const setup = new Date(evDate); setup.setDate(setup.getDate() - 1); setup.setHours(14, 0, 0, 0);
  const teardown = new Date(evDate); teardown.setDate(teardown.getDate() + 1); teardown.setHours(10, 0, 0, 0);
  const baseTitle = `${customerName}${guests ? " · " + guests + " guests" : ""}`;

  const eqCol = opts.quote_id ? "quote_id" : "quote_request_id";
  const eqVal = opts.quote_id ?? requestId;
  if (eqVal) {
    await supabase
      .from("rental_calendar_events")
      .update({ event_type: "venue_booked", status: "scheduled", color: BEACON_VENUE.color, title: `${venueName} BOOKED — ${baseTitle}` })
      .eq(eqCol, eqVal)
      .in("event_type", ["venue_hold", "venue_inquiry"])
      .is("deleted_at", null);
  }

  const wanted = [
    { event_type: "venue_booked", title: `${venueName} BOOKED — ${baseTitle}`, start: evDate, allDay: true, color: BEACON_VENUE.color },
    { event_type: "venue_setup", title: `${venueName} setup — ${baseTitle}`, start: setup, allDay: false, color: BEACON_VENUE.colorSoft },
    { event_type: "venue_teardown", title: `${venueName} teardown — ${baseTitle}`, start: teardown, allDay: false, color: BEACON_VENUE.colorSoft },
  ];

  let existingTypes: Set<string> = new Set();
  if (eqVal) {
    const { data: ex } = await supabase
      .from("rental_calendar_events")
      .select("event_type")
      .eq(eqCol, eqVal)
      .is("deleted_at", null);
    existingTypes = new Set((ex ?? []).map((e: any) => e.event_type));
  }
  const toInsert = wanted
    .filter((w) => !existingTypes.has(w.event_type))
    .map((w) => ({
      title: w.title,
      event_type: w.event_type,
      start_time: w.start.toISOString(),
      all_day: w.allDay,
      status: "scheduled",
      color: w.color,
      quote_request_id: requestId,
      quote_id: opts.quote_id ?? null,
      location: locText,
      notes: null,
      created_by: opts.userId,
    }));
  if (toInsert.length) {
    const { error: insErr } = await supabase.from("rental_calendar_events").insert(toInsert);
    if (insErr) throw new Error(insErr.message);
  }

  if (requestId) {
    await supabase
      .from("quote_requests")
      .update({ status: "booked" })
      .eq("id", requestId);
  }
  if (opts.quote_id) {
    await supabase
      .from("quotes")
      .update({ status: "booked", booked_at: new Date().toISOString() })
      .eq("id", opts.quote_id);
  }

  return { ok: true, events_created: toInsert.length, venueName, customerName, eventDate, eventType, requestId };
}

export async function releaseVenueBookingHelper(
  supabase: any,
  opts: { quote_request_id?: string | null; quote_id?: string | null },
) {
  const eqCol = opts.quote_id ? "quote_id" : "quote_request_id";
  const eqVal = opts.quote_id ?? opts.quote_request_id!;
  const { error } = await supabase
    .from("rental_calendar_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq(eqCol, eqVal)
    .in("event_type", VENUE_EVENT_TYPES as unknown as string[]);
  if (error) throw new Error(error.message);

  if (opts.quote_request_id) {
    await supabase
      .from("quote_requests")
      .update({ status: "in_review" })
      .eq("id", opts.quote_request_id);
  }
  if (opts.quote_id) {
    await supabase
      .from("quotes")
      .update({ status: "approved", booked_at: null })
      .eq("id", opts.quote_id);
  }
  return { ok: true };
}

/* ---------------------- Server fn wrappers ---------------------- */

export const placeVenueHold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const res = await placeVenueHoldHelper(context.supabase, {
      quote_request_id: data.quote_request_id,
      userId: context.userId,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "venue_inquiry",
      severity: "info",
      title: `${res.venueName} hold placed for ${res.customerName}`,
      body: `${res.eventDate}`,
      link: `/admin/quote-requests/${data.quote_request_id}`,
      related_id: data.quote_request_id,
    });
    return { ok: true };
  });

export const confirmVenueBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_request_id: z.string().uuid().optional(),
      quote_id: z.string().uuid().optional(),
    }).refine((d) => d.quote_request_id || d.quote_id, { message: "quote_request_id or quote_id required" }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const res = await confirmVenueBookingHelper(context.supabase, {
      quote_request_id: data.quote_request_id ?? null,
      quote_id: data.quote_id ?? null,
      userId: context.userId,
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "venue_inquiry",
      severity: "success",
      title: `${res.venueName} BOOKED for ${res.customerName}`,
      body: `${res.eventDate}${res.eventType ? " · " + res.eventType : ""}`,
      link: res.requestId ? `/admin/quote-requests/${res.requestId}` : `/admin/quotes/${data.quote_id}/edit`,
      related_id: res.requestId ?? data.quote_id ?? null,
    });
    return { ok: true, events_created: res.events_created };
  });

export const releaseVenueBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_request_id: z.string().uuid().optional(),
      quote_id: z.string().uuid().optional(),
    }).refine((d) => d.quote_request_id || d.quote_id).parse(d),
  )
  .handler(async ({ data, context }) => {
    return releaseVenueBookingHelper(context.supabase, {
      quote_request_id: data.quote_request_id ?? null,
      quote_id: data.quote_id ?? null,
    });
  });

export const listVenueEventsOnDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const dayStart = new Date(data.date + "T00:00:00");
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const { data: rows, error } = await context.supabase
      .from("rental_calendar_events")
      .select("id, title, event_type, start_time, status, quote_request_id, quote_id")
      .is("deleted_at", null)
      .gte("start_time", dayStart.toISOString())
      .lt("start_time", dayEnd.toISOString())
      .in("event_type", ["venue_hold", "venue_booked", "venue_inquiry"])
      .order("start_time");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
