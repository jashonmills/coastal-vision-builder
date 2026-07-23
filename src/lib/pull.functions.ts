import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyInventoryMove, resolveInventoryIdsForQuote } from "@/lib/bookings.functions";

type QuoteItem = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  is_auto: boolean;
};

type PullLineRow = {
  id: string;
  job_id: string;
  quote_item_id: string | null;
  inventory_item_id: string | null;
  name: string;
  category: string | null;
  quantity_required: number;
  quantity_pulled: number;
  quantity_returned_ok: number;
  quantity_cleaning: number;
  quantity_damaged: number;
  quantity_missing: number;
  checkin_notes: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checked_out_applied: boolean;
  pulled_at: string | null;
  pulled_by: string | null;
};

function isNonPhysical(name: string, category: string | null) {
  const s = `${category ?? ""} ${name}`.toLowerCase();
  return /\b(delivery|pickup|pick[- ]?up|cleaning|fee|labor|setup fee|service charge|discount|deposit)\b/.test(s);
}

async function loadJobForCaller(supabase: any, jobId: string) {
  // RLS: admins see all, staff see only assigned jobs.
  const { data, error } = await supabase
    .from("jobs")
    .select("id, quote_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job not found or not accessible");
  return data as { id: string; quote_id: string; status: string };
}

async function ensurePullLines(
  supabase: any,
  job: { id: string; quote_id: string },
): Promise<PullLineRow[]> {
  const { data: existing, error: exErr } = await supabase
    .from("job_pull_lines")
    .select("*")
    .eq("job_id", job.id);
  if (exErr) throw new Error(exErr.message);
  if ((existing ?? []).length > 0) return existing as PullLineRow[];

  const { data: items, error: qErr } = await supabase
    .from("quote_items")
    .select("id, name, category, quantity, is_auto")
    .eq("quote_id", job.quote_id)
    .order("sort_order");
  if (qErr) throw new Error(qErr.message);

  const toInsert = (items as QuoteItem[] | null | undefined ?? [])
    .filter((i) => !i.is_auto && !isNonPhysical(i.name, i.category))
    .map((i) => ({
      job_id: job.id,
      quote_item_id: i.id,
      name: i.name,
      category: i.category,
      quantity_required: Math.max(1, i.quantity ?? 1),
      quantity_pulled: 0,
    }));

  if (toInsert.length === 0) return [];

  const { data: inserted, error: insErr } = await supabase
    .from("job_pull_lines")
    .insert(toInsert)
    .select("*");
  if (insErr) throw new Error(insErr.message);
  return (inserted ?? []) as PullLineRow[];
}

function summarize(lines: PullLineRow[]) {
  const total = lines.length;
  const fully_pulled = lines.filter((l) => l.quantity_pulled >= l.quantity_required).length;
  const total_required = lines.reduce((n, l) => n + l.quantity_required, 0);
  const total_pulled = lines.reduce((n, l) => n + Math.min(l.quantity_pulled, l.quantity_required), 0);
  return { total, fully_pulled, total_required, total_pulled };
}

export const getPullList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const job = await loadJobForCaller(context.supabase, data.job_id);
    const lines = await ensurePullLines(context.supabase, job);

    const byCategory = new Map<string, PullLineRow[]>();
    for (const l of lines) {
      const k = (l.category ?? "Other").trim() || "Other";
      const arr = byCategory.get(k) ?? [];
      arr.push(l);
      byCategory.set(k, arr);
    }
    const groups = Array.from(byCategory.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        fully_pulled: items.filter((l) => l.quantity_pulled >= l.quantity_required).length,
        total: items.length,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    return { job_id: job.id, status: job.status, groups, summary: summarize(lines) };
  });

export const setPullLineProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ line_id: z.string().uuid(), quantity_pulled: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: line, error: rErr } = await context.supabase
      .from("job_pull_lines")
      .select("id, quantity_required")
      .eq("id", data.line_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!line) throw new Error("Pull line not found");

    const required = (line as { quantity_required: number }).quantity_required;
    const qty = Math.max(0, Math.min(data.quantity_pulled, required));
    const reachedFull = qty >= required;

    const patch: Record<string, unknown> = {
      quantity_pulled: qty,
      pulled_at: reachedFull ? new Date().toISOString() : null,
      pulled_by: reachedFull ? context.userId : null,
    };

    const { error } = await context.supabase
      .from("job_pull_lines")
      .update(patch as never)
      .eq("id", data.line_id);
    if (error) throw new Error(error.message);
    return { ok: true as const, quantity_pulled: qty, fully_pulled: reachedFull };
  });

export const markJobLoaded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job, error: jErr } = await context.supabase
      .from("jobs")
      .select("id, status")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jErr) throw new Error(jErr.message);
    if (!job) throw new Error("Job not found");
    const status = (job as { status: string }).status;
    if (status !== "booked" && status !== "prep") {
      return { ok: true as const, unchanged: true, status };
    }
    const { error } = await context.supabase
      .from("jobs")
      .update({ status: "loaded" } as never)
      .eq("id", data.job_id);
    if (error) throw new Error(error.message);
    return { ok: true as const, status: "loaded" as const };
  });

export const getPullSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lines, error } = await context.supabase
      .from("job_pull_lines")
      .select("quantity_required, quantity_pulled")
      .eq("job_id", data.job_id);
    if (error) throw new Error(error.message);
    const rows = (lines ?? []) as Array<{ quantity_required: number; quantity_pulled: number }>;
    const total = rows.length;
    const fully_pulled = rows.filter((r) => r.quantity_pulled >= r.quantity_required).length;
    return { total, fully_pulled, generated: total > 0 };
  });
