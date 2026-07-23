import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";

const CATEGORIES = ["job", "warehouse", "maintenance", "travel", "admin", "other"] as const;
export type TimeCategory = (typeof CATEGORIES)[number];

async function getMyStaffId(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: unknown) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
      };
    };
  };
}, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not an active staff member.");
  return data.id;
}

// ---------- Staff-self ----------

export const clockIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid().nullable().optional(),
        category: z.enum(CATEGORIES).default("job"),
        task_label: z.string().trim().max(200).nullable().optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const staffId = await getMyStaffId(context.supabase as never, context.userId);

    // Reject if the caller already has an open entry.
    const { data: open, error: openErr } = await context.supabase
      .from("time_entries")
      .select("id")
      .eq("staff_id", staffId)
      .is("clock_out", null)
      .maybeSingle();
    if (openErr) throw new Error(openErr.message);
    if (open) throw new Error("You're already clocked in. Clock out first.");

    const payload = {
      staff_id: staffId,
      job_id: data.job_id ?? null,
      category: data.category,
      task_label: data.task_label ?? null,
      notes: data.notes ?? null,
    };
    const { data: row, error } = await context.supabase
      .from("time_entries")
      .insert(payload as never)
      .select("id, clock_in")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const clockOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ entry_id: z.string().uuid().optional(), notes: z.string().trim().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const staffId = await getMyStaffId(context.supabase as never, context.userId);
    const q = context.supabase
      .from("time_entries")
      .update({
        clock_out: new Date().toISOString(),
        ...(data.notes ? { notes: data.notes } : {}),
      } as never)
      .eq("staff_id", staffId)
      .is("clock_out", null);
    const { data: rows, error } = data.entry_id
      ? await q.eq("id", data.entry_id).select("id, clock_out")
      : await q.select("id, clock_out");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("No open entry found.");
    return rows[0];
  });

export const getActiveTimeEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff } = await context.supabase
      .from("staff")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (!staff) return null;

    const { data, error } = await context.supabase
      .from("time_entries")
      .select("id, staff_id, job_id, category, task_label, clock_in, notes, jobs:job_id(id,title,event_date)")
      .eq("staff_id", staff.id)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const listMyTimeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        start_date: z.string().datetime().optional(),
        end_date: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase
      .from("staff")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (!staff) return { entries: [], total_seconds: 0 };

    let q = context.supabase
      .from("time_entries")
      .select("id, job_id, category, task_label, clock_in, clock_out, notes, jobs:job_id(id,title,event_date)")
      .eq("staff_id", staff.id)
      .order("clock_in", { ascending: false });
    if (data.start_date) q = q.gte("clock_in", data.start_date);
    if (data.end_date) q = q.lte("clock_in", data.end_date);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const entries = (rows ?? []).map((r) => ({
      ...r,
      duration_seconds: r.clock_out
        ? Math.max(0, Math.floor((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 1000))
        : null,
    }));
    const total_seconds = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
    return { entries, total_seconds };
  });

export const getWeeklyHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff } = await context.supabase
      .from("staff")
      .select("id")
      .eq("user_id", context.userId)
      .eq("active", true)
      .maybeSingle();
    if (!staff) return { seconds: 0 };

    const now = new Date();
    const day = now.getDay(); // 0 = Sun
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const { data, error } = await context.supabase
      .from("time_entries")
      .select("clock_in, clock_out")
      .eq("staff_id", staff.id)
      .gte("clock_in", start.toISOString());
    if (error) throw new Error(error.message);
    const seconds = (data ?? []).reduce((s, r) => {
      const end = r.clock_out ? new Date(r.clock_out).getTime() : Date.now();
      return s + Math.max(0, Math.floor((end - new Date(r.clock_in).getTime()) / 1000));
    }, 0);
    return { seconds };
  });

// ---------- Admin ----------

export const listTimeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        staff_id: z.string().uuid().optional(),
        job_id: z.string().uuid().optional(),
        start_date: z.string().datetime().optional(),
        end_date: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = context.supabase
      .from("time_entries")
      .select(
        "id, staff_id, job_id, category, task_label, clock_in, clock_out, notes, staff:staff_id(id,name), jobs:job_id(id,title,event_date)",
      )
      .order("clock_in", { ascending: false })
      .limit(1000);
    if (data.staff_id) q = q.eq("staff_id", data.staff_id);
    if (data.job_id) q = q.eq("job_id", data.job_id);
    if (data.start_date) q = q.gte("clock_in", data.start_date);
    if (data.end_date) q = q.lte("clock_in", data.end_date);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const entries = (rows ?? []).map((r) => ({
      ...r,
      duration_seconds: r.clock_out
        ? Math.max(0, Math.floor((new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 1000))
        : null,
    }));
    const total_seconds = entries.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);

    const byStaff = new Map<string, { staff_id: string; name: string; seconds: number }>();
    const byJob = new Map<string, { job_id: string; title: string; seconds: number }>();
    for (const e of entries) {
      const s = e.duration_seconds ?? 0;
      const staffRow = e.staff as { id: string; name: string } | null;
      if (staffRow) {
        const cur = byStaff.get(staffRow.id) ?? { staff_id: staffRow.id, name: staffRow.name, seconds: 0 };
        cur.seconds += s;
        byStaff.set(staffRow.id, cur);
      }
      const jobRow = e.jobs as { id: string; title: string | null } | null;
      if (jobRow) {
        const cur = byJob.get(jobRow.id) ?? { job_id: jobRow.id, title: jobRow.title ?? "Job", seconds: 0 };
        cur.seconds += s;
        byJob.set(jobRow.id, cur);
      }
    }
    return {
      entries,
      total_seconds,
      by_staff: Array.from(byStaff.values()).sort((a, b) => b.seconds - a.seconds),
      by_job: Array.from(byJob.values()).sort((a, b) => b.seconds - a.seconds),
    };
  });
