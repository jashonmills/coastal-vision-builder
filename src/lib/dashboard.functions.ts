import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getOnboardingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin required");

    const [inv, mappings, staff, staffLogins, bookedJobs, crew] = await Promise.all([
      supabase.from("inventory_items").select("id", { count: "exact", head: true }).gt("total_owned_quantity", 0),
      supabase.from("pricing_inventory_mappings").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("staff").select("id", { count: "exact", head: true }),
      supabase.from("staff").select("id", { count: "exact", head: true }).not("user_id", "is", null),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("event_staff").select("id", { count: "exact", head: true }),
    ]);

    return {
      hasInventoryCounts: (inv.count ?? 0) > 0,
      hasMappings: (mappings.count ?? 0) > 0,
      hasStaff: (staff.count ?? 0) > 0,
      hasStaffLogins: (staffLogins.count ?? 0) > 0,
      hasBookedJob: (bookedJobs.count ?? 0) > 0,
      hasCrewAssigned: (crew.count ?? 0) > 0,
    };
  });

// Event types that represent actual field operations (not internal quote notes)
const OPS_EVENT_TYPES = [
  "delivery",
  "pickup",
  "check_out",
  "check_in",
  "cleaning",
  "maintenance",
  "venue_hold",
  "venue_booked",
  "venue_setup",
  "venue_teardown",
];

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
      pendingConfirmationQuotes,
      bookedQuotes,
      approvedQuotes,
      paidQuotes,
      upcoming,
      recentReq,
      upcomingEvents,
      inventoryAlerts,
      unreadNotifs,
      newVenueReq,
      venueBookings30,
      allInventory,
      pricingItems,
      pricingMappings,
    ] = await Promise.all([
      supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "in_review"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "booked"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("payment_received", true),

      supabase
        .from("rental_calendar_events")
        .select("id", { count: "exact", head: true })
        .gte("start_time", nowIso)
        .lte("start_time", in7)
        .is("deleted_at", null)
        .in("event_type", OPS_EVENT_TYPES),
      supabase
        .from("quote_requests")
        .select("id, customer_name, event_type, event_date, guest_count, status, created_at, request_type, venue")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("rental_calendar_events")
        .select("id, title, start_time, location, event_type, status")
        .gte("start_time", nowIso)
        .lte("start_time", in7)
        .is("deleted_at", null)
        .in("event_type", OPS_EVENT_TYPES)
        .order("start_time", { ascending: true })
        .limit(8),
      supabase
        .from("inventory_items")
        .select(
          "id, name, total_owned_quantity, reserved_quantity, checked_out_quantity, cleaning_quantity, maintenance_quantity, damaged_missing_quantity, visible_to_planner, active",
        )
        .eq("active", true)
        .is("deleted_at", null),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      supabase
        .from("quote_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")
        .eq("request_type", "venue"),
      supabase
        .from("rental_calendar_events")
        .select("id", { count: "exact", head: true })
        .gte("start_time", nowIso)
        .lte("start_time", in30)
        .is("deleted_at", null)
        .in("event_type", ["venue_hold", "venue_booked"]),
      supabase
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("active", true)
        .is("deleted_at", null),
      supabase.from("pricing_items").select("id"),
      supabase.from("pricing_inventory_mappings").select("pricing_item_id").eq("active", true),
    ]);

    // Derive inventory health signals
    type InvRow = {
      id: string;
      name: string;
      total_owned_quantity: number;
      reserved_quantity: number;
      checked_out_quantity: number;
      cleaning_quantity: number;
      maintenance_quantity: number;
      damaged_missing_quantity: number;
      visible_to_planner: boolean;
      active: boolean;
    };
    const invRows: InvRow[] = (allInventory.data ?? []) as InvRow[];
    const overCommitted: InvRow[] = [];
    const plannerNoStock: InvRow[] = [];
    const damaged: InvRow[] = [];
    for (const r of invRows) {
      const used =
        (r.reserved_quantity ?? 0) +
        (r.checked_out_quantity ?? 0) +
        (r.cleaning_quantity ?? 0) +
        (r.maintenance_quantity ?? 0) +
        (r.damaged_missing_quantity ?? 0);
      if (used > (r.total_owned_quantity ?? 0)) overCommitted.push(r);
      if (r.visible_to_planner && (r.total_owned_quantity ?? 0) === 0) plannerNoStock.push(r);
      if ((r.damaged_missing_quantity ?? 0) > 0) damaged.push(r);
    }

    const mappedPricingIds = new Set(
      (pricingMappings.data ?? [])
        .map((m: { pricing_item_id: string | null }) => m.pricing_item_id)
        .filter((v): v is string => !!v),
    );
    const unmappedPricing = (pricingItems.data ?? []).filter(
      (p: { id: string }) => !mappedPricingIds.has(p.id),
    ).length;

    // Combined inventory alerts list (dedupe by id, cap 10)
    const alertSeen = new Set<string>();
    const inventoryAlertsList: Array<InvRow & { alertReason: string }> = [];
    for (const r of overCommitted) {
      if (alertSeen.has(r.id)) continue;
      alertSeen.add(r.id);
      inventoryAlertsList.push({ ...r, alertReason: "over_committed" });
    }
    for (const r of plannerNoStock) {
      if (alertSeen.has(r.id) || inventoryAlertsList.length >= 12) continue;
      alertSeen.add(r.id);
      inventoryAlertsList.push({ ...r, alertReason: "planner_no_stock" });
    }
    for (const r of damaged) {
      if (alertSeen.has(r.id) || inventoryAlertsList.length >= 12) continue;
      alertSeen.add(r.id);
      inventoryAlertsList.push({ ...r, alertReason: "damaged" });
    }

    return {
      counts: {
        newRequests: newReq.count ?? 0,
        inReview: inReview.count ?? 0,
        draftQuotes: draftQuotes.count ?? 0,
        sentQuotes: sentQuotes.count ?? 0,
        pendingConfirmation: pendingConfirmationQuotes.count ?? 0,
        bookedQuotes: bookedQuotes.count ?? 0,
        approvedQuotes: approvedQuotes.count ?? 0,
        paidQuotes: paidQuotes.count ?? 0,
        upcomingEvents: upcoming.count ?? 0,

        unreadNotifications: unreadNotifs.count ?? 0,
        newVenueRequests: newVenueReq.count ?? 0,
        venueBookings30: venueBookings30.count ?? 0,
        overCommittedInventory: overCommitted.length,
        plannerNoStock: plannerNoStock.length,
        zeroOwnedInventory: invRows.filter((r) => (r.total_owned_quantity ?? 0) === 0).length,
        unmappedPricing,
        totalInventoryItems: (allInventory.count ?? invRows.length) as number,

      },
      recentRequests: recentReq.data ?? [],
      upcomingEvents: upcomingEvents.data ?? [],
      inventoryAlerts: inventoryAlertsList.slice(0, 10),
    };
  });
