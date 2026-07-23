import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";

const CATEGORIES = ["fuel", "supplies", "tolls", "meals", "equipment", "other"] as const;
export type ExpenseCategory = (typeof CATEGORIES)[number];

async function getMyStaffId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return data?.id ?? null;
}

// ---------- Staff-self ----------

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid().nullable().optional(),
        category: z.enum(CATEGORIES),
        amount_cents: z.number().int().min(0),
        note: z.string().trim().max(2000).nullable().optional(),
        receipt_path: z.string().trim().max(500).nullable().optional(),
        incurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const staffId = await getMyStaffId(context.supabase, context.userId);
    if (!staffId) throw new Error("You are not an active staff member.");

    const payload = {
      staff_id: staffId,
      job_id: data.job_id ?? null,
      category: data.category,
      amount_cents: data.amount_cents,
      note: data.note ?? null,
      receipt_path: data.receipt_path ?? null,
      ...(data.incurred_on ? { incurred_on: data.incurred_on } : {}),
    };
    const { data: row, error } = await context.supabase
      .from("expenses")
      .insert(payload as never)
      .select("id, incurred_on, amount_cents")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const staffId = await getMyStaffId(context.supabase, context.userId);
    if (!staffId) return { expenses: [], total_cents: 0 };

    let q = context.supabase
      .from("expenses")
      .select("id, job_id, category, amount_cents, note, receipt_path, incurred_on, created_at, jobs:job_id(id,title,event_date)")
      .eq("staff_id", staffId)
      .order("incurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.start_date) q = q.gte("incurred_on", data.start_date);
    if (data.end_date) q = q.lte("incurred_on", data.end_date);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const expenses = rows ?? [];
    const total_cents = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
    return { expenses, total_cents };
  });

export const getReceiptSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    // Authorize: caller must own the expense (staff) OR be admin.
    const staffId = await getMyStaffId(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("expenses")
      .select("id, staff_id")
      .eq("receipt_path", data.path)
      .maybeSingle();

    let allowed = false;
    if (row && staffId && row.staff_id === staffId) allowed = true;
    if (!allowed) {
      // Admin check
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (isAdmin === true) allowed = true;
    }
    if (!allowed) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("receipts")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

// ---------- Admin ----------

export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        staff_id: z.string().uuid().optional(),
        job_id: z.string().uuid().optional(),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("expenses")
      .select(
        "id, staff_id, job_id, category, amount_cents, note, receipt_path, incurred_on, created_at, staff:staff_id(id,name), jobs:job_id(id,title,event_date)",
      )
      .order("incurred_on", { ascending: false })
      .limit(1000);
    if (data.staff_id) q = q.eq("staff_id", data.staff_id);
    if (data.job_id) q = q.eq("job_id", data.job_id);
    if (data.start_date) q = q.gte("incurred_on", data.start_date);
    if (data.end_date) q = q.lte("incurred_on", data.end_date);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const expenses = rows ?? [];
    const total_cents = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0);

    const byStaff = new Map<string, { staff_id: string; name: string; cents: number }>();
    const byJob = new Map<string, { job_id: string; title: string; cents: number }>();
    for (const e of expenses) {
      const s = e.staff as { id: string; name: string } | null;
      if (s) {
        const cur = byStaff.get(s.id) ?? { staff_id: s.id, name: s.name, cents: 0 };
        cur.cents += e.amount_cents ?? 0;
        byStaff.set(s.id, cur);
      }
      const j = e.jobs as { id: string; title: string | null } | null;
      if (j) {
        const cur = byJob.get(j.id) ?? { job_id: j.id, title: j.title ?? "Job", cents: 0 };
        cur.cents += e.amount_cents ?? 0;
        byJob.set(j.id, cur);
      }
    }
    return {
      expenses,
      total_cents,
      by_staff: Array.from(byStaff.values()).sort((a, b) => b.cents - a.cents),
      by_job: Array.from(byJob.values()).sort((a, b) => b.cents - a.cents),
    };
  });

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        category: z.enum(CATEGORIES).optional(),
        amount_cents: z.number().int().min(0).optional(),
        note: z.string().trim().max(2000).nullable().optional(),
        incurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        job_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = {};
    if (data.category !== undefined) patch.category = data.category;
    if (data.amount_cents !== undefined) patch.amount_cents = data.amount_cents;
    if (data.note !== undefined) patch.note = data.note;
    if (data.incurred_on !== undefined) patch.incurred_on = data.incurred_on;
    if (data.job_id !== undefined) patch.job_id = data.job_id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("expenses").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("expenses").select("receipt_path").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.receipt_path) {
      await supabaseAdmin.storage.from("receipts").remove([row.receipt_path]).catch(() => {});
    }
    return { ok: true };
  });
