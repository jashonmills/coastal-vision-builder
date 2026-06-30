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

/* ---------------------- Place hold ---------------------- */

export const placeVenueHold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const req = await loadRequest(supabase, data.quote_request_id);
    if (!req.event_date) throw new Error("This request has no event date — add one before placing a hold.");

    const venueName = venueLabelFor(req.venue);
    const startIso = new Date(req.event_date + "T00:00:00").toISOString();
    const title = `${venueName} HOLD — ${req.customer_name}`;

    // Idempotent: skip if a hold already exists for this request
    const { data: existing } = await supabase
      .from("rental_calendar_events")
      .select("id")
      .eq("quote_request_id", data.quote_request_id)
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
        quote_request_id: data.quote_request_id,
        location: `${venueName} · ${BEACON_VENUE.address}`,
        notes: `Tentative hold for ${req.event_type ?? "event"}${req.guest_count ? " · " + req.guest_count + " guests" : ""}.`,
        created_by: userId,
      });
      if (insErr) throw new Error(insErr.message);
    }

    await supabase
      .from("quote_requests")
      .update({ status: "in_review" })
      .eq("id", data.quote_request_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "venue_inquiry",
      severity: "info",
      title: `${venueName} hold placed for ${req.customer_name}`,
      body: `${req.event_date}${req.event_type ? " · " + req.event_type : ""}`,
      link: `/admin/quote-requests/${data.quote_request_id}`,
      related_id: data.quote_request_id,
    });

    return { ok: true };
  });

/* ---------------------- Confirm booking ---------------------- */

export const confirmVenueBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_request_id: z.string().uuid().optional(),
      quote_id: z.string().uuid().optional(),
    }).refine((d) => d.quote_request_id || d.quote_id, { message: "quote_request_id or quote_id required" }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let requestId = data.quote_request_id ?? null;
    let eventDate: string | null = null;
    let customerName = "";
    let eventType: string | null = null;
    let guests: number | null = null;
    let venueSlug: string | null = null;

    if (data.quote_id) {
      const { data: q, error } = await supabase
        .from("quotes")
        .select("id, quote_request_id, customer_name, event_date, event_type, guest_count")
        .eq("id", data.quote_id)
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

    // Upgrade any existing hold → booked (and any prior auto venue_inquiry on event-date)
    const eqCol = data.quote_id ? "quote_id" : "quote_request_id";
    const eqVal = data.quote_id ?? requestId;
    if (eqVal) {
      await supabase
        .from("rental_calendar_events")
        .update({ event_type: "venue_booked", status: "scheduled", color: BEACON_VENUE.color, title: `${venueName} BOOKED — ${baseTitle}` })
        .eq(eqCol, eqVal)
        .in("event_type", ["venue_hold", "venue_inquiry"])
        .is("deleted_at", null);
    }

    // What we want to exist for the booking
    const wanted = [
      { event_type: "venue_booked", title: `${venueName} BOOKED — ${baseTitle}`, start: evDate, allDay: true, color: BEACON_VENUE.color },
      { event_type: "venue_setup", title: `${venueName} setup — ${baseTitle}`, start: setup, allDay: false, color: BEACON_VENUE.colorSoft },
      { event_type: "venue_teardown", title: `${venueName} teardown — ${baseTitle}`, start: teardown, allDay: false, color: BEACON_VENUE.colorSoft },
    ];

    // Skip any we already have
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
        quote_id: data.quote_id ?? null,
        location: locText,
        notes: null,
        created_by: userId,
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
    if (data.quote_id) {
      await supabase
        .from("quotes")
        .update({ status: "booked", booked_at: new Date().toISOString() })
        .eq("id", data.quote_id);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_notifications").insert({
      kind: "venue_inquiry",
      severity: "success",
      title: `${venueName} BOOKED for ${customerName}`,
      body: `${eventDate}${eventType ? " · " + eventType : ""}`,
      link: requestId ? `/admin/quote-requests/${requestId}` : `/admin/quotes/${data.quote_id}/edit`,
      related_id: requestId ?? data.quote_id ?? null,
    });

    return { ok: true, events_created: toInsert.length };
  });

/* ---------------------- Release booking ---------------------- */

export const releaseVenueBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quote_request_id: z.string().uuid().optional(),
      quote_id: z.string().uuid().optional(),
    }).refine((d) => d.quote_request_id || d.quote_id).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const eqCol = data.quote_id ? "quote_id" : "quote_request_id";
    const eqVal = data.quote_id ?? data.quote_request_id!;
    const { error } = await supabase
      .from("rental_calendar_events")
      .update({ deleted_at: new Date().toISOString() })
      .eq(eqCol, eqVal)
      .in("event_type", VENUE_EVENT_TYPES as unknown as string[]);
    if (error) throw new Error(error.message);

    if (data.quote_request_id) {
      await supabase
        .from("quote_requests")
        .update({ status: "in_review" })
        .eq("id", data.quote_request_id);
    }
    if (data.quote_id) {
      await supabase
        .from("quotes")
        .update({ status: "approved", booked_at: null })
        .eq("id", data.quote_id);
    }
    return { ok: true };
  });

/* ---------------------- Availability check ---------------------- */

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
