import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** List quotes visible to the signed-in customer (via RLS: matched by user_id OR email). */
export const listMyQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select(
        "id, quote_number, status, event_type, event_date, event_location, guest_count, total_cents, subtotal_cents, tax_cents, discount_cents, sent_at, created_at, pdf_url",
      )
      .in("status", ["sent", "approved", "booked"])
      .order("sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Get a single quote (with line items) if the signed-in customer owns it. */
export const getMyQuote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: quote, error } = await context.supabase
      .from("quotes")
      .select(
        "id, quote_number, status, customer_name, customer_email, customer_phone, event_type, event_date, event_location, guest_count, notes, subtotal_cents, tax_cents, discount_cents, total_cents, sent_at, created_at, pdf_url",
      )
      .eq("id", data.id)
      .in("status", ["sent", "approved", "booked"])
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!quote) throw new Error("Quote not found");
    const { data: items } = await context.supabase
      .from("quote_items")
      .select("id, name, category, description, quantity, unit, unit_price_cents, line_total_cents, sort_order")
      .eq("quote_id", data.id)
      .order("sort_order", { ascending: true });
    return { quote, items: items ?? [] };
  });

/** List contract submissions belonging to the signed-in customer. */
export const listMyContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("contract_submissions")
      .select("id, contract_type, customer_name, event_date, quote_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Return a short-lived signed URL for the customer's own contract PDF. */
export const getMyContractDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS ensures this row is theirs
    const { data: row, error } = await context.supabase
      .from("contract_submissions")
      .select("id, pdf_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.pdf_path) throw new Error("Contract not available");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("contract-submissions")
      .createSignedUrl(row.pdf_path, 60 * 10);
    if (sErr || !signed?.signedUrl) throw new Error("Could not create download link");
    return { url: signed.signedUrl };
  });
