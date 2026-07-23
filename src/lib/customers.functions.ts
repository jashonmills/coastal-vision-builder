import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admins.functions";

const LIFECYCLE = ["lead", "quoted", "booked", "repeat", "archived"] as const;

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().max(200).optional(),
        stage: z.enum(LIFECYCLE).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        cursor: z.string().datetime().optional(),
      })
      .optional()
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = data?.limit ?? 50;

    let q = supabaseAdmin
      .from("customers")
      .select(
        "id, email, name, phone, company, lifecycle_stage, user_id, first_seen_at, last_activity_at, created_at",
      )
      .order("last_activity_at", { ascending: false })
      .limit(limit);
    if (data?.stage) q = q.eq("lifecycle_stage", data.stage);
    if (data?.search) {
      const s = `%${data.search.trim()}%`;
      q = q.or(`email.ilike.${s},name.ilike.${s},phone.ilike.${s},company.ilike.${s}`);
    }
    if (data?.cursor) q = q.lt("last_activity_at", data.cursor);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    if (ids.length === 0) return { customers: [], nextCursor: null as string | null };

    const [reqs, qts, contracts] = await Promise.all([
      supabaseAdmin.from("quote_requests").select("customer_id").in("customer_id", ids),
      supabaseAdmin.from("quotes").select("customer_id, status").in("customer_id", ids),
      supabaseAdmin.from("contract_submissions").select("customer_id").in("customer_id", ids),
    ]);
    const reqCount: Record<string, number> = {};
    const qtCount: Record<string, number> = {};
    const bookedCount: Record<string, number> = {};
    const contractCount: Record<string, number> = {};
    for (const r of reqs.data ?? []) if (r.customer_id) reqCount[r.customer_id] = (reqCount[r.customer_id] ?? 0) + 1;
    for (const r of qts.data ?? []) {
      if (!r.customer_id) continue;
      qtCount[r.customer_id] = (qtCount[r.customer_id] ?? 0) + 1;
      if (r.status === "booked" || r.status === "pending_confirmation") {
        bookedCount[r.customer_id] = (bookedCount[r.customer_id] ?? 0) + 1;
      }
    }
    for (const r of contracts.data ?? []) if (r.customer_id) contractCount[r.customer_id] = (contractCount[r.customer_id] ?? 0) + 1;

    const customers = (rows ?? []).map((r) => ({
      ...r,
      quote_request_count: reqCount[r.id] ?? 0,
      quote_count: qtCount[r.id] ?? 0,
      booked_count: bookedCount[r.id] ?? 0,
      contract_count: contractCount[r.id] ?? 0,
    }));
    const nextCursor = customers.length === limit ? customers[customers.length - 1].last_activity_at : null;
    return { customers, nextCursor };
  });

export const getCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const emailLc = (customer.email ?? "").toLowerCase();

    const [reqs, quotes, contracts, savedByUser, savedByEmail] = await Promise.all([
      supabaseAdmin
        .from("quote_requests")
        .select("id, customer_name, event_type, event_date, status, created_at, request_type, venue")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("quotes")
        .select("id, quote_number, status, total_cents, event_date, event_type, created_at, payment_received")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("contract_submissions")
        .select("id, contract_type, status, created_at, pdf_path, quote_id, event_date")
        .eq("customer_id", data.id)
        .order("created_at", { ascending: false }),
      customer.user_id
        ? supabaseAdmin
            .from("saved_recommendations")
            .select("id, title, event_date, status, created_at")
            .eq("user_id", customer.user_id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; event_date: string | null; status: string | null; created_at: string }>, error: null }),
      supabaseAdmin
        .from("saved_recommendations")
        .select("id, title, event_date, status, created_at")
        .is("user_id", null)
        .ilike("customer_email", emailLc)
        .order("created_at", { ascending: false }),
    ]);

    // Merge saved recs (dedupe by id)
    const savedMap = new Map<string, { id: string; title: string | null; event_date: string | null; status: string | null; created_at: string }>();
    for (const r of savedByUser.data ?? []) savedMap.set(r.id, r);
    for (const r of savedByEmail.data ?? []) savedMap.set(r.id, r);
    const savedRecommendations = Array.from(savedMap.values());

    // Related calendar events from linked quotes + requests
    const quoteIds = (quotes.data ?? []).map((q) => q.id);
    const requestIds = (reqs.data ?? []).map((r) => r.id);
    let events: Array<{ id: string; title: string; start_time: string; event_type: string; status: string | null }> = [];
    if (quoteIds.length || requestIds.length) {
      const orParts: string[] = [];
      if (quoteIds.length) orParts.push(`quote_id.in.(${quoteIds.join(",")})`);
      if (requestIds.length) orParts.push(`quote_request_id.in.(${requestIds.join(",")})`);
      const { data: ev } = await supabaseAdmin
        .from("rental_calendar_events")
        .select("id, title, start_time, event_type, status")
        .or(orParts.join(","))
        .order("start_time", { ascending: false })
        .limit(100);
      events = ev ?? [];
    }

    return {
      customer,
      quoteRequests: reqs.data ?? [],
      quotes: quotes.data ?? [],
      contracts: contracts.data ?? [],
      savedRecommendations,
      events,
    };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().max(200).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        company: z.string().max(200).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
        lifecycle_stage: z.enum(LIFECYCLE).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("customers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const mergeCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        primary_id: z.string().uuid(),
        duplicate_id: z.string().uuid(),
      })
      .refine((v) => v.primary_id !== v.duplicate_id, "IDs must differ")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Repoint linked rows
    const tables = ["quote_requests", "quotes", "contract_submissions"] as const;
    for (const t of tables) {
      const { error } = await supabaseAdmin
        .from(t)
        .update({ customer_id: data.primary_id })
        .eq("customer_id", data.duplicate_id);
      if (error) throw new Error(`Merge failed on ${t}: ${error.message}`);
    }

    // Bump primary last_activity_at, backfill user_id if primary missing
    const { data: dup } = await supabaseAdmin
      .from("customers")
      .select("user_id, first_seen_at")
      .eq("id", data.duplicate_id)
      .maybeSingle();
    const { data: pri } = await supabaseAdmin
      .from("customers")
      .select("user_id, first_seen_at")
      .eq("id", data.primary_id)
      .maybeSingle();
    const patch: { last_activity_at: string; user_id?: string; first_seen_at?: string } = {
      last_activity_at: new Date().toISOString(),
    };
    if (!pri?.user_id && dup?.user_id) patch.user_id = dup.user_id;
    if (pri?.first_seen_at && dup?.first_seen_at && dup.first_seen_at < pri.first_seen_at) {
      patch.first_seen_at = dup.first_seen_at;
    }
    await supabaseAdmin.from("customers").update(patch).eq("id", data.primary_id);

    // Delete duplicate
    const { error: delErr } = await supabaseAdmin
      .from("customers")
      .delete()
      .eq("id", data.duplicate_id);
    if (delErr) throw new Error(delErr.message);

    return { ok: true as const };
  });
