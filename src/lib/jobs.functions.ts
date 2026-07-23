import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";

const JOB_STATUSES = [
  "booked",
  "prep",
  "loaded",
  "en_route",
  "on_site",
  "event",
  "teardown",
  "picked_up",
  "returned",
  "reconciled",
  "closed",
  "cancelled",
] as const;

const ACK_STATUSES = ["assigned", "accepted", "declined"] as const;

const nullableStr = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(max).nullable().optional());

/* ---------------- Admin ---------------- */

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        date: z.string().optional(),
        status: z.enum(JOB_STATUSES).optional(),
        search: z.string().max(200).optional(),
        cursor: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data?.limit ?? 50;

    let q = supabaseAdmin
      .from("jobs")
      .select(
        "id, quote_id, customer_id, title, event_date, start_time, end_time, status, site_address, site_contact_name, site_contact_phone, created_at, updated_at, quote:quote_id (quote_number, customer_name, customer_email, total_cents), customer:customer_id (id, name, email, phone)",
      )
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data?.status) q = q.eq("status", data.status);
    if (data?.date) q = q.eq("event_date", data.date);
    if (data?.search) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`title.ilike.${s},site_address.ilike.${s},site_contact_name.ilike.${s}`);
    }
    if (data?.cursor) q = q.lt("created_at", data.cursor);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const nextCursor = (rows ?? []).length === limit ? rows![rows!.length - 1].created_at : null;
    return { jobs: rows ?? [], nextCursor };
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: quote } = await supabaseAdmin
      .from("quotes")
      .select(
        "id, quote_number, status, customer_name, customer_email, customer_phone, event_type, event_date, event_location, guest_count, total_cents, payment_received",
      )
      .eq("id", job.quote_id)
      .maybeSingle();

    const { data: customer } = job.customer_id
      ? await supabaseAdmin.from("customers").select("*").eq("id", job.customer_id).maybeSingle()
      : { data: null };

    const { data: events } = await supabaseAdmin
      .from("rental_calendar_events")
      .select("id, title, event_type, start_time, end_time, status, location, color, assigned_to")
      .eq("quote_id", job.quote_id)
      .is("deleted_at", null)
      .order("start_time");

    const eventIds = (events ?? []).map((e) => e.id);
    let crew: Array<{
      id: string;
      event_id: string;
      staff_id: string;
      role: string | null;
      ack_status: string;
      acknowledged_at: string | null;
      decline_reason: string | null;
      name: string;
      color: string | null;
      roles: string[] | null;
    }> = [];
    if (eventIds.length) {
      const { data: rows } = await supabaseAdmin
        .from("event_staff")
        .select(
          "id, event_id, staff_id, role, ack_status, acknowledged_at, decline_reason, staff:staff_id (name, color, roles)",
        )
        .in("event_id", eventIds);
      crew = (rows ?? []).map((r) => {
        const s = r.staff as { name?: string; color?: string | null; roles?: string[] | null } | null;
        return {
          id: r.id as string,
          event_id: r.event_id as string,
          staff_id: r.staff_id as string,
          role: (r.role as string | null) ?? null,
          ack_status: (r.ack_status as string) ?? "assigned",
          acknowledged_at: (r.acknowledged_at as string | null) ?? null,
          decline_reason: (r.decline_reason as string | null) ?? null,
          name: s?.name ?? "",
          color: s?.color ?? null,
          roles: s?.roles ?? null,
        };
      });
    }

    return { job, quote, customer, events: events ?? [], crew };
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(JOB_STATUSES).optional(),
        title: nullableStr(300),
        event_date: z.string().nullable().optional(),
        start_time: z.string().datetime().nullable().optional(),
        end_time: z.string().datetime().nullable().optional(),
        site_address: nullableStr(500),
        site_contact_name: nullableStr(200),
        site_contact_phone: nullableStr(50),
        gate_code: nullableStr(100),
        parking_notes: nullableStr(2000),
        access_notes: nullableStr(2000),
        notes: nullableStr(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("jobs").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Staff-facing ---------------- */

async function getCallerStaffId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return data?.id ?? null;
}

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ start_date: z.string(), end_date: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const myStaffId = await getCallerStaffId(context.supabase, context.userId);
    if (!myStaffId) return [];

    // Pull assignments for this staff in the date window (via joined event).
    const { data: assignments, error } = await context.supabase
      .from("event_staff")
      .select(
        "id, role, ack_status, acknowledged_at, decline_reason, event:event_id (id, quote_id, start_time, end_time, event_type, status, location)",
      )
      .eq("staff_id", myStaffId);
    if (error) throw new Error(error.message);

    const filtered = (assignments ?? []).filter((a) => {
      const ev = a.event as { start_time?: string; quote_id?: string | null } | null;
      if (!ev?.quote_id || !ev.start_time) return false;
      return ev.start_time >= data.start_date && ev.start_time <= data.end_date;
    });

    const quoteIds = Array.from(
      new Set(
        filtered
          .map((a) => (a.event as { quote_id?: string | null } | null)?.quote_id)
          .filter((v): v is string => !!v),
      ),
    );
    if (quoteIds.length === 0) return [];

    const { data: jobs } = await context.supabase
      .from("jobs")
      .select(
        "id, quote_id, title, event_date, start_time, end_time, status, site_address, site_contact_name, site_contact_phone, gate_code, parking_notes, access_notes, notes",
      )
      .in("quote_id", quoteIds);

    const jobByQuote = new Map<string, any>();
    for (const j of jobs ?? []) jobByQuote.set(j.quote_id as string, j);

    // One row per job (aggregate this staff's roles + earliest ack status across events).
    const byJob = new Map<
      string,
      {
        job: any;
        events: Array<{ assignment_id: string; role: string | null; ack_status: string; event: any }>;
      }
    >();
    for (const a of filtered) {
      const ev = a.event as { quote_id?: string | null } | null;
      const quoteId = ev?.quote_id;
      if (!quoteId) continue;
      const job = jobByQuote.get(quoteId);
      if (!job) continue;
      const entry = byJob.get(job.id) ?? { job, events: [] };
      entry.events.push({
        assignment_id: a.id as string,
        role: (a.role as string | null) ?? null,
        ack_status: (a.ack_status as string) ?? "assigned",
        event: a.event,
      });
      byJob.set(job.id, entry);
    }

    return Array.from(byJob.values()).sort((x, y) => {
      const a = (x.job.event_date as string | null) ?? "";
      const b = (y.job.event_date as string | null) ?? "";
      return a.localeCompare(b);
    });
  });

export const getMyJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const myStaffId = await getCallerStaffId(context.supabase, context.userId);
    if (!myStaffId) throw new Error("Not staff");

    // RLS on jobs enforces staff-on-job membership.
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error("Job not found or not assigned");

    // Fetch events for this quote that the staff is on.
    const { data: assignments } = await context.supabase
      .from("event_staff")
      .select(
        "id, role, ack_status, acknowledged_at, decline_reason, event:event_id (id, quote_id, title, start_time, end_time, event_type, status, location)",
      )
      .eq("staff_id", myStaffId);
    const mine = (assignments ?? []).filter(
      (a) => (a.event as { quote_id?: string | null } | null)?.quote_id === job.quote_id,
    );

    return { job, assignments: mine };
  });

export const acknowledgeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        event_staff_id: z.string().uuid(),
        ack_status: z.enum(["accepted", "declined"]),
        decline_reason: nullableStr(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const myStaffId = await getCallerStaffId(context.supabase, context.userId);
    if (!myStaffId) throw new Error("Not staff");

    // Verify ownership before update.
    const { data: row, error: readErr } = await context.supabase
      .from("event_staff")
      .select("id, staff_id")
      .eq("id", data.event_staff_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row || row.staff_id !== myStaffId) throw new Error("Assignment not found");

    const { error } = await context.supabase
      .from("event_staff")
      .update({
        ack_status: data.ack_status,
        acknowledged_at: new Date().toISOString(),
        decline_reason: data.ack_status === "declined" ? data.decline_reason ?? null : null,
      } as never)
      .eq("id", data.event_staff_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Shared helper used by bookings ---------------- */

export async function upsertJobForQuote(supabase: any, quoteId: string): Promise<void> {
  const { data: existing } = await supabase.from("jobs").select("id").eq("quote_id", quoteId).maybeSingle();
  if (existing?.id) return;
  const { data: q } = await supabase
    .from("quotes")
    .select("id, customer_id, customer_name, event_date, event_location")
    .eq("id", quoteId)
    .maybeSingle();
  if (!q) return;
  const title =
    (q.customer_name ?? "") +
    (q.event_date ? ` — ${q.event_date}` : "");
  await supabase.from("jobs").insert({
    quote_id: q.id,
    customer_id: q.customer_id ?? null,
    title: title || null,
    event_date: q.event_date ?? null,
    site_address: q.event_location ?? null,
    status: "booked",
  });
}
