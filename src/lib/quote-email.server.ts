// Server-only shared helpers for customer quote emails.
// Used by both sendQuoteEmail (custom subject+letter from the admin dialog)
// and sendQuote (default subject+letter from the "Mark Sent" button) so that
// every admin "send quote" path emails the customer through the same pipeline.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTransactionalEmail } from "@/lib/email/send-admin.server";

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

export async function loadQuoteBundleAdmin(quoteId: string) {
  const { data: quote, error: qErr } = await supabaseAdmin
    .from("quotes")
    .select(
      "id, quote_number, customer_name, customer_email, event_type, event_date, event_location, guest_count, subtotal_cents, delivery_fee_cents, cleaning_fee_cents, discount_cents, tax_cents, total_cents, status, sent_at",
    )
    .eq("id", quoteId)
    .single();
  if (qErr) throw new Error(qErr.message);
  const { data: items, error: iErr } = await supabaseAdmin
    .from("quote_items")
    .select("category, name, description, quantity, unit, unit_price_cents, line_total_cents, is_auto, sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order");
  if (iErr) throw new Error(iErr.message);
  return { quote: quote as QuoteRow, items: (items ?? []) as ItemRow[] };
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function buildDefaultQuoteSubject(quote: QuoteRow) {
  return `Your Pacific North Events Quote ${quote.quote_number}`;
}

export function buildDefaultQuoteCoverLetter(quote: QuoteRow, items: ItemRow[]) {
  const topItems = [...items]
    .sort((a, b) => b.line_total_cents - a.line_total_cents)
    .slice(0, 3);
  return (
    `Hi ${quote.customer_name.split(" ")[0] ?? "there"},\n\n` +
    `Thank you for considering Pacific North Events & Tents for your upcoming ${quote.event_type ?? "event"}` +
    `${quote.event_date ? ` on ${quote.event_date}` : ""}${quote.event_location ? ` in ${quote.event_location}` : ""}. ` +
    `Your quote ${quote.quote_number} comes to a total of ${money(quote.total_cents)}` +
    `${topItems.length ? `, including ${topItems.map((it) => `${it.quantity}× ${it.name}`).join(", ")}` : ""}. ` +
    `Full line items and totals are itemized below.\n\n` +
    `Let us know if you'd like to adjust anything, and we can update this quote before you approve.\n\n` +
    `— Pacific North Events & Tents`
  );
}

/**
 * Enqueue the customer-facing quote email using the `customer-quote` template.
 * If subject/coverLetter are omitted, sensible defaults are generated from the
 * quote so callers like `sendQuote` can email without a human in the loop.
 */
export async function sendCustomerQuoteEmail(args: {
  quote_id: string;
  to_email?: string;
  subject?: string;
  cover_letter?: string;
}): Promise<{ ok: true; recipient: string }> {
  const { quote, items } = await loadQuoteBundleAdmin(args.quote_id);

  const origin = process.env.PUBLIC_SITE_URL || "https://www.pacificnorthrentals.com";
  const viewUrl = `${origin}/admin/quotes/${quote.id}/preview`;
  const recipient = args.to_email || quote.customer_email;
  const subject = args.subject || buildDefaultQuoteSubject(quote);
  const coverLetter = args.cover_letter || buildDefaultQuoteCoverLetter(quote, items);

  const templateData = {
    customerName: quote.customer_name,
    quoteNumber: quote.quote_number,
    coverLetter,
    eventType: quote.event_type,
    eventDate: quote.event_date,
    eventLocation: quote.event_location,
    guestCount: quote.guest_count,
    items: items.map((it) => ({
      category: it.category,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unit_price_cents: it.unit_price_cents,
      line_total_cents: it.line_total_cents,
    })),
    subtotalCents: quote.subtotal_cents,
    deliveryCents: quote.delivery_fee_cents,
    cleaningCents: quote.cleaning_fee_cents,
    discountCents: quote.discount_cents,
    taxCents: quote.tax_cents,
    totalCents: quote.total_cents,
    viewUrl,
    subject,
  };

  const idempotencyKey = `quote-email:${quote.id}:${crypto.randomUUID()}`;

  await sendTransactionalEmail({
    templateName: "customer-quote",
    templateData,
    idempotencyKey,
    recipient,
  });

  return { ok: true, recipient };
}
