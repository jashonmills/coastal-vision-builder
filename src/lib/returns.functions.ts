import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyInventoryMove } from "@/lib/bookings.functions";

/* ============================================================
   Field returns & cleaning-queue backend.

   Reuses `applyInventoryMove` from bookings.functions so all
   bucket math (checked_out ↔ cleaning ↔ damaged_missing ↔
   available) and inventory_transactions writes stay in ONE place.
   ============================================================ */

type PullLineRow = {
  id: string;
  job_id: string;
  name: string;
  category: string | null;
  inventory_item_id: string | null;
  quote_item_id: string | null;
  quantity_required: number;
  quantity_pulled: number;
  quantity_returned_ok: number;
  quantity_cleaning: number;
  quantity_damaged: number;
  quantity_missing: number;
  checked_out_applied: boolean;
  checkin_notes: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
};

const PULL_COLS =
  "id, job_id, name, category, inventory_item_id, quote_item_id, quantity_required, quantity_pulled, quantity_returned_ok, quantity_cleaning, quantity_damaged, quantity_missing, checked_out_applied, checkin_notes, checked_in_at, checked_in_by";

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
}

/* ---------------------- Check-in (returns) ---------------------- */

export const checkInJobLines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        lines: z
          .array(
            z.object({
              line_id: z.string().uuid(),
              returned_ok: z.number().int().min(0).default(0),
              cleaning: z.number().int().min(0).default(0),
              damaged: z.number().int().min(0).default(0),
              missing: z.number().int().min(0).default(0),
              notes: z.string().max(2000).optional().nullable(),
              photo_path: z.string().max(500).optional().nullable(),
            }),
          )
          .min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, quote_id, status")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jErr) throw new Error(jErr.message);
    if (!job) throw new Error("Job not found or not accessible");
    const jobRow = job as { id: string; quote_id: string; status: string };

    // Load current pull lines for this job (RLS: admin or staff-on-job).
    const { data: linesData, error: lErr } = await supabase
      .from("job_pull_lines")
      .select(PULL_COLS)
      .eq("job_id", jobRow.id);
    if (lErr) throw new Error(lErr.message);
    const byId = new Map<string, PullLineRow>((linesData ?? []).map((r: any) => [r.id, r as PullLineRow]));

    const applied: Array<{ line_id: string; applied: true }> = [];
    const skipped: Array<{ line_id: string; reason: string }> = [];

    for (const inp of data.lines) {
      const line = byId.get(inp.line_id);
      if (!line || line.job_id !== jobRow.id) {
        skipped.push({ line_id: inp.line_id, reason: "line not found" });
        continue;
      }
      const sum = inp.returned_ok + inp.cleaning + inp.damaged + inp.missing;
      if (sum === 0) {
        skipped.push({ line_id: inp.line_id, reason: "no quantities" });
        continue;
      }
      if (!line.inventory_item_id) {
        skipped.push({ line_id: inp.line_id, reason: "no inventory mapping" });
        continue;
      }
      const alreadyIn =
        (line.quantity_returned_ok ?? 0) +
        (line.quantity_cleaning ?? 0) +
        (line.quantity_damaged ?? 0) +
        (line.quantity_missing ?? 0);
      const outstanding = Math.max(0, (line.quantity_pulled ?? 0) - alreadyIn);
      if (sum > outstanding) {
        skipped.push({
          line_id: inp.line_id,
          reason: `sum ${sum} exceeds outstanding ${outstanding}`,
        });
        continue;
      }

      try {
        // returned_ok → checked_out−=n (implicitly back to available)
        if (inp.returned_ok > 0) {
          await applyInventoryMove(supabase, {
            inventory_item_id: line.inventory_item_id,
            from_status: "checked_out",
            to_status: "available",
            quantity: inp.returned_ok,
            related_quote_id: jobRow.quote_id,
            transaction_type: "check_in_quote",
            notes: inp.notes ?? null,
            created_by: userId,
          });
        }
        if (inp.cleaning > 0) {
          await applyInventoryMove(supabase, {
            inventory_item_id: line.inventory_item_id,
            from_status: "checked_out",
            to_status: "cleaning",
            quantity: inp.cleaning,
            related_quote_id: jobRow.quote_id,
            transaction_type: "check_in_cleaning",
            notes: inp.notes ?? null,
            created_by: userId,
          });
        }
        if (inp.damaged > 0) {
          await applyInventoryMove(supabase, {
            inventory_item_id: line.inventory_item_id,
            from_status: "checked_out",
            to_status: "damaged_missing",
            quantity: inp.damaged,
            related_quote_id: jobRow.quote_id,
            transaction_type: "check_in_damaged",
            notes: inp.notes ?? null,
            created_by: userId,
          });
        }
        if (inp.missing > 0) {
          await applyInventoryMove(supabase, {
            inventory_item_id: line.inventory_item_id,
            from_status: "checked_out",
            to_status: "damaged_missing",
            quantity: inp.missing,
            related_quote_id: jobRow.quote_id,
            transaction_type: "check_in_missing",
            notes: inp.notes ?? null,
            created_by: userId,
          });
        }

        const patch = {
          quantity_returned_ok: (line.quantity_returned_ok ?? 0) + inp.returned_ok,
          quantity_cleaning: (line.quantity_cleaning ?? 0) + inp.cleaning,
          quantity_damaged: (line.quantity_damaged ?? 0) + inp.damaged,
          quantity_missing: (line.quantity_missing ?? 0) + inp.missing,
          checkin_notes: inp.notes ?? line.checkin_notes,
          checked_in_at: new Date().toISOString(),
          checked_in_by: userId,
        };
        const { error: upErr } = await supabase
          .from("job_pull_lines")
          .update(patch as never)
          .eq("id", line.id);
        if (upErr) throw new Error(upErr.message);

        // Refresh in-memory tallies for post-loop status check
        Object.assign(line, patch);
        applied.push({ line_id: inp.line_id, applied: true });
      } catch (e) {
        skipped.push({ line_id: inp.line_id, reason: (e as Error).message });
      }
    }

    // Recompute job status from live line totals (reuse in-memory rows we just patched).
    const rows = Array.from(byId.values());
    const totalPulled = rows.reduce((n, r) => n + (r.quantity_pulled ?? 0), 0);
    const totalAccountedFor = rows.reduce(
      (n, r) =>
        n +
        (r.quantity_returned_ok ?? 0) +
        (r.quantity_cleaning ?? 0) +
        (r.quantity_damaged ?? 0) +
        (r.quantity_missing ?? 0),
      0,
    );
    const totalRequired = rows.reduce((n, r) => n + (r.quantity_required ?? 0), 0);

    let newStatus: string | null = null;
    if (totalPulled > 0 && totalAccountedFor >= totalPulled) {
      // If everything that went out is accounted for AND we pulled everything asked for,
      // the job is fully reconciled; otherwise just "returned".
      newStatus = totalPulled >= totalRequired ? "reconciled" : "returned";
    }
    if (newStatus && jobRow.status !== newStatus && jobRow.status !== "closed") {
      await supabase.from("jobs").update({ status: newStatus } as never).eq("id", jobRow.id);
    }

    return {
      ok: true as const,
      applied,
      skipped,
      job_status: newStatus ?? jobRow.status,
    };
  });

/* ---------------------- Cleaning queue ---------------------- */

export const listCleaningQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("inventory_items")
      .select(
        "id, name, sku, cleaning_quantity, category:category_id (id, name)",
      )
      .gt("cleaning_quantity", 0)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      inventory_item_id: r.id,
      name: r.name,
      sku: r.sku,
      category: r.category?.name ?? null,
      cleaning_quantity: r.cleaning_quantity ?? 0,
    }));
  });

export const markCleaned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        inventory_item_id: z.string().uuid(),
        quantity: z.number().int().min(1),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Admin-only for now: clamping cleaning bucket back to available touches all jobs.
    if (!(await isAdmin(supabase, userId))) {
      // fall through: still allow staff, but clamp only against current cleaning qty
    }
    const { data: inv, error } = await supabase
      .from("inventory_items")
      .select("id, cleaning_quantity")
      .eq("id", data.inventory_item_id)
      .single();
    if (error) throw new Error(error.message);
    const current = Number((inv as { cleaning_quantity: number }).cleaning_quantity ?? 0);
    const qty = Math.max(0, Math.min(data.quantity, current));
    if (qty <= 0) return { ok: true as const, moved: 0, remaining: current };

    await applyInventoryMove(supabase, {
      inventory_item_id: data.inventory_item_id,
      from_status: "cleaning",
      to_status: "available",
      quantity: qty,
      transaction_type: "mark_cleaned_available",
      notes: data.notes ?? null,
      created_by: userId,
    });
    return { ok: true as const, moved: qty, remaining: Math.max(0, current - qty) };
  });

/* ---------------------- Reconciliation ---------------------- */

export const getJobReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lines, error } = await context.supabase
      .from("job_pull_lines")
      .select(PULL_COLS)
      .eq("job_id", data.job_id)
      .order("name");
    if (error) throw new Error(error.message);

    const rows = (lines ?? []) as PullLineRow[];
    const items = rows.map((r) => {
      const returned_ok = r.quantity_returned_ok ?? 0;
      const cleaning = r.quantity_cleaning ?? 0;
      const damaged = r.quantity_damaged ?? 0;
      const missing = r.quantity_missing ?? 0;
      const accounted = returned_ok + cleaning + damaged + missing;
      const outstanding = Math.max(0, (r.quantity_pulled ?? 0) - accounted);
      return {
        line_id: r.id,
        name: r.name,
        category: r.category,
        inventory_item_id: r.inventory_item_id,
        mapped: !!r.inventory_item_id,
        required: r.quantity_required ?? 0,
        pulled: r.quantity_pulled ?? 0,
        returned_ok,
        cleaning,
        damaged,
        missing,
        outstanding,
        checked_in_at: r.checked_in_at,
      };
    });

    const totals = items.reduce(
      (acc, i) => {
        acc.required += i.required;
        acc.pulled += i.pulled;
        acc.returned_ok += i.returned_ok;
        acc.cleaning += i.cleaning;
        acc.damaged += i.damaged;
        acc.missing += i.missing;
        acc.outstanding += i.outstanding;
        return acc;
      },
      { required: 0, pulled: 0, returned_ok: 0, cleaning: 0, damaged: 0, missing: 0, outstanding: 0 },
    );

    return { job_id: data.job_id, items, totals };
  });
