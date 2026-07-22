import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ----------------------------- Types ----------------------------- */

type QuoteRow = {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  event_type: string | null;
  event_date: string | null;
  event_location: string | null;
  guest_count: number | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  cleaning_fee_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  status: string;
  sent_at: string | null;
};

type ItemRow = {
  category: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price_cents: number;
  line_total_cents: number;
  is_auto: boolean;
  sort_order: number;
};

async function loadQuoteBundle(supabase: any, quoteId: string) {
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, customer_name, customer_email, event_type, event_date, event_location, guest_count, subtotal_cents, delivery_fee_cents, cleaning_fee_cents, discount_cents, tax_cents, total_cents, status, sent_at",
    )
    .eq("id", quoteId)
    .single();
  if (qErr) throw new Error(qErr.message);
  const { data: items, error: iErr } = await supabase
    .from("quote_items")
    .select("category, name, description, quantity, unit, unit_price_cents, line_total_cents, is_auto, sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order");
  if (iErr) throw new Error(iErr.message);
  return { quote: quote as QuoteRow, items: (items ?? []) as ItemRow[] };
}

/* --------------------------- draft cover letter --------------------------- */

export const draftQuoteCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ quote_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { quote, items } = await loadQuoteBundle(context.supabase, data.quote_id);

    const money = (cents: number) =>
      (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });

    const topItems = [...items]
      .sort((a, b) => b.line_total_cents - a.line_total_cents)
      .slice(0, 3);

    const pricingSummary = {
      subtotal: money(quote.subtotal_cents),
      delivery: quote.delivery_fee_cents ? money(quote.delivery_fee_cents) : null,
      cleaning: quote.cleaning_fee_cents ? money(quote.cleaning_fee_cents) : null,
      discount: quote.discount_cents ? `-${money(quote.discount_cents)}` : null,
      tax: quote.tax_cents ? money(quote.tax_cents) : null,
      total: money(quote.total_cents),
      top_line_items: topItems.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        line_total: money(it.line_total_cents),
      })),
    };

    const defaultSubject = `Your Pacific North Events Quote ${quote.quote_number}`;
    const defaultLetter =
      `Hi ${quote.customer_name.split(" ")[0] ?? "there"},\n\n` +
      `Thank you for considering Pacific North Events & Tents for your upcoming ${quote.event_type ?? "event"}` +
      `${quote.event_date ? ` on ${quote.event_date}` : ""}${quote.event_location ? ` in ${quote.event_location}` : ""}. ` +
      `Your quote ${quote.quote_number} comes to a total of ${pricingSummary.total}` +
      `${topItems.length ? `, including ${topItems.map((it) => `${it.quantity}× ${it.name}`).join(", ")}` : ""}. ` +
      `Full line items and totals are itemized below.\n\n` +
      `Let us know if you'd like to adjust anything, and we can update this quote before you approve.\n\n` +
      `— Pacific North Events & Tents`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { subject: defaultSubject, coverLetter: defaultLetter };
    }

    const context_summary = {
      customer_name: quote.customer_name,
      quote_number: quote.quote_number,
      event_type: quote.event_type,
      event_date: quote.event_date,
      event_location: quote.event_location,
      guest_count: quote.guest_count,
      pricing_summary: pricingSummary,
      all_line_items: items.map((it) => ({
        category: it.category,
        name: it.name,
        quantity: it.quantity,
      })),
    };

    const systemPrompt = `You draft warm, professional cover letters for event rental quotes sent by Pacific North Events & Tents (Oregon Coast).
- Address the customer by first name.
- Reference their event (type, date, location) naturally in 1-2 sentences.
- Include ONE short paragraph that references the quote total from pricing_summary.total and mentions the 2-3 largest line items (from pricing_summary.top_line_items) naturally in prose — e.g. "Your quote comes to $X, which covers Y and Z." Do NOT reproduce the full line-item table; the email template renders it separately.
- Invite questions and adjustments.
- 3-5 short paragraphs, plain text, no markdown, no signature block beyond "— Pacific North Events & Tents".
- Do NOT invent details or dollar amounts not present in the provided context.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Quote context:\n${JSON.stringify(context_summary, null, 2)}\n\nWrite the cover letter.` },
          ],
        }),
      });
      if (!res.ok) {
        console.warn("[draftQuoteCoverLetter] AI gateway error", res.status);
        return { subject: defaultSubject, coverLetter: defaultLetter };
      }
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content?.trim();
      if (!text) return { subject: defaultSubject, coverLetter: defaultLetter };
      return { subject: defaultSubject, coverLetter: text };
    } catch (e) {
      console.error("[draftQuoteCoverLetter] failed", e);
      return { subject: defaultSubject, coverLetter: defaultLetter };
    }
  });


/* ------------------------------- send email ------------------------------- */

export const sendQuoteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        quote_id: z.string().uuid(),
        to_email: z.string().email().max(255),
        subject: z.string().min(1).max(300),
        cover_letter: z.string().min(1).max(6000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sendCustomerQuoteEmail } = await import("@/lib/quote-email.server");
    const result = await sendCustomerQuoteEmail({
      quote_id: data.quote_id,
      to_email: data.to_email,
      subject: data.subject,
      cover_letter: data.cover_letter,
    });

    // Advance quote status if not already sent/booked
    const { data: q } = await context.supabase
      .from("quotes")
      .select("status")
      .eq("id", data.quote_id)
      .single();
    if (q && q.status !== "sent" && q.status !== "booked") {
      await context.supabase
        .from("quotes")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", data.quote_id);
    }

    return result;
  });
