// Builds a mailto: URL that pre-fills the To, Subject, and full plain-text
// body for a quote or quote-request email. The admin's default mail client
// (Outlook, Apple Mail, Gmail, etc.) opens with everything ready to send.

const CRLF = "\r\n";
const MAX_URL_LEN = 1900; // safe ceiling across mail clients

function money(cents: number | null | undefined): string {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(d?: string | null): string {
  if (!d) return "TBD";
  const parsed = new Date(d.length === 10 ? d + "T00:00:00" : d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function padRight(s: string, len: number): string {
  if (s.length >= len) return s.slice(0, len - 1) + " ";
  return s + " ".repeat(len - s.length);
}

export interface MailtoQuoteItem {
  name: string;
  quantity: number;
  line_total_cents: number;
}

export interface BuildQuoteMailtoArgs {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  eventType?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  guestCount?: number | null;
  items: MailtoQuoteItem[];
  subtotalCents?: number | null;
  deliveryCents?: number | null;
  cleaningCents?: number | null;
  discountCents?: number | null;
  taxCents?: number | null;
  totalCents?: number | null;
}

export function buildQuoteMailto(args: BuildQuoteMailtoArgs): string {
  const {
    quoteNumber,
    customerName,
    customerEmail,
    eventType,
    eventDate,
    eventLocation,
    guestCount,
    items,
    subtotalCents,
    deliveryCents,
    cleaningCents,
    discountCents,
    taxCents,
    totalCents,
  } = args;

  const subject = `Your Pacific North Events Quote ${quoteNumber}`;

  const lines: string[] = [];
  lines.push(`Hi ${customerName || "there"},`);
  lines.push("");
  lines.push(
    "Thank you for your quote request with Pacific North Events & Tents.",
  );
  lines.push(
    "Based on the details you provided, here is your estimated quote:",
  );
  lines.push("");
  lines.push(`Event:    ${eventType || "—"}`);
  lines.push(`Date:     ${fmtDate(eventDate)}`);
  lines.push(`Location: ${eventLocation || "—"}`);
  if (guestCount) lines.push(`Guests:   ${guestCount}`);
  lines.push("");
  lines.push("--- Line Items ---");

  // Reserve room for totals + closing so we know when to truncate items
  const closing: string[] = [];
  closing.push("");
  if (subtotalCents != null)
    closing.push(`Subtotal:  ${money(subtotalCents)}`);
  if (deliveryCents) closing.push(`Delivery:  ${money(deliveryCents)}`);
  if (cleaningCents) closing.push(`Cleaning:  ${money(cleaningCents)}`);
  if (discountCents)
    closing.push(`Discount: -${money(discountCents)}`);
  if (taxCents) closing.push(`Tax:       ${money(taxCents)}`);
  closing.push(`TOTAL:     ${money(totalCents ?? 0)}`);
  closing.push("");
  closing.push(
    "This quote is valid for 30 days. Reply to this email with any",
  );
  closing.push("questions or to confirm your booking.");
  closing.push("");
  closing.push("— Pacific North Events & Tents");
  closing.push("  pacificnorthrentals.com");

  function build(itemLines: string[], truncatedCount: number): string {
    const all = [...lines, ...itemLines];
    if (truncatedCount > 0) {
      all.push(`…and ${truncatedCount} more item${truncatedCount === 1 ? "" : "s"}.`);
    }
    all.push(...closing);
    const body = all.join(CRLF);
    return `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const itemLines = items.map((it) => {
    const left = `${it.quantity} x ${it.name}`;
    const right = money(it.line_total_cents);
    // dot-leader style
    const totalWidth = 52;
    const dots = Math.max(3, totalWidth - left.length - right.length);
    return `${padRight(left, left.length)}${" " + ".".repeat(dots) + " "}${right}`;
  });

  // Try full list first, truncate from end if too long
  let url = build(itemLines, 0);
  let truncated = 0;
  let current = [...itemLines];
  while (url.length > MAX_URL_LEN && current.length > 1) {
    current.pop();
    truncated += 1;
    url = build(current, truncated);
  }
  return url;
}

export interface BuildRequestMailtoArgs {
  customerName: string;
  customerEmail: string;
  eventType?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
}

export function buildQuoteRequestMailto(args: BuildRequestMailtoArgs): string {
  const { customerName, customerEmail, eventType, eventDate, eventLocation } = args;
  const subject = "Your Pacific North Events Quote Request";
  const body = [
    `Hi ${customerName || "there"},`,
    "",
    `Thanks for reaching out to Pacific North Events & Tents about your`,
    `${eventType || "event"} on ${fmtDate(eventDate)}${eventLocation ? " in " + eventLocation : ""}.`,
    "",
    "We're preparing your quote now and will follow up shortly. In the",
    "meantime, feel free to reply with any questions.",
    "",
    "— Pacific North Events & Tents",
    "  pacificnorthrentals.com",
  ].join(CRLF);
  return `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
