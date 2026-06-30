import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const [
      newReq,
      inReview,
      draftQuotes,
      sentQuotes,
      upcoming,
      recentReq,
      upcomingEvents,
      inventoryAlerts,
      unreadNotifs,
      newVenueReq,
      venueBookings30,
    ] = await Promise.all([
      supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "in_review"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("rental_calendar_events").select("id", { count: "exact", head: true })
        .gte("start_time", nowIso).lte("start_time", in7).is("deleted_at", null),
      supabase.from("quote_requests")
        .select("id, customer_name, event_type, event_date, guest_count, status, created_at, request_type, venue")
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("rental_calendar_events")
        .select("id, title, start_time, location, event_type, status")
        .gte("start_time", nowIso).lte("start_time", in7).is("deleted_at", null)
        .order("start_time", { ascending: true }).limit(5),
      supabase.from("inventory_items")
        .select("id, name, total_owned_quantity, checked_out_quantity, damaged_missing_quantity, cleaning_quantity")
        .eq("active", true).is("deleted_at", null)
        .or("total_owned_quantity.eq.0,damaged_missing_quantity.gt.0")
        .limit(10),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      supabase.from("quote_requests").select("id", { count: "exact", head: true })
        .eq("status", "new").eq("request_type", "venue"),
      supabase.from("rental_calendar_events").select("id", { count: "exact", head: true })
        .gte("start_time", nowIso).lte("start_time", in30).is("deleted_at", null)
        .in("event_type", ["venue_hold", "venue_booked"]),
    ]);

    return {
      counts: {
        newRequests: newReq.count ?? 0,
        inReview: inReview.count ?? 0,
        draftQuotes: draftQuotes.count ?? 0,
        sentQuotes: sentQuotes.count ?? 0,
        upcomingEvents: upcoming.count ?? 0,
        unreadNotifications: unreadNotifs.count ?? 0,
        newVenueRequests: newVenueReq.count ?? 0,
        venueBookings30: venueBookings30.count ?? 0,
      },
      recentRequests: recentReq.data ?? [],
      upcomingEvents: upcomingEvents.data ?? [],
      inventoryAlerts: inventoryAlerts.data ?? [],
    };
  });

