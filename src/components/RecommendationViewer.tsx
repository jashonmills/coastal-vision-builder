import { useEffect, useState } from "react";
import logoUrl from "@/assets/logo.png";
import type { AIRecommendation, Pick } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";
import { downloadRecommendationPdf, printRecommendationPdf } from "@/lib/recommendation-pdf";
import { Check, Download, FileText, Loader2, Printer, Send, X } from "lucide-react";
import { RequestQuoteModal, StatusBadge, type PlanStatus } from "@/components/RequestQuoteModal";

const CATEGORY_ORDER = ["Canopy", "Canopy Options", "Canopy Cleaning Fee", "Tables", "Chairs", "Specialty Items", "Delivery"];

export function RecommendationReport({
  recommendation,
  blueprintImage,
  input,
  contactName,
}: {
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  input: RecommenderInput;
  contactName?: string;
}) {
  const grouped = new Map<string, Pick[]>();
  for (const p of recommendation.picks ?? []) {
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "your selected date";

  const recapRows: Array<[string, string]> = [
    ["Event type", input.eventType],
    ["Date", eventDateLabel],
    ["Location", input.location || "—"],
    ["Setting", input.outdoor],
    ["Guests", String(input.guestCount)],
    ["Setup", input.setupType],
    ["Seating", input.seated],
    ["Tables", input.tableStyle],
    ["Food", input.food],
    ["Dancing", input.dancing],
    ["Surface", input.surface],
    ["Exposure", input.exposure],
    ["Sidewalls", input.sidewalls],
    ["After sunset", input.afterSunset],
  ];

  // One-line equipment summary derived from picks
  const equipmentSummary = orderedCategories
    .map((cat) => {
      const total = grouped.get(cat)!.reduce((s, p) => s + (p.quantity || 0), 0);
      return `${total}× ${cat}`;
    })
    .join("  ·  ");

  return (
    <div className="bg-card p-7 text-foreground sm:p-10">
      <div className="border-b border-border pb-6 text-center">
        <img src={logoUrl} alt="Pacific North Event & Tent Rentals" className="mx-auto mb-4 h-16 w-auto" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">Pacific North Events &amp; Tents</p>
        <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">{recommendation.headline}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{recommendation.summary}</p>
      </div>

      <section className="mt-7 print:break-inside-avoid">
        <h3 className="font-serif text-xl text-primary">Event Blueprint</h3>
        <p className="mt-2 text-sm text-foreground">
          Prepared for {contactName || "your event"} · {input.eventType} · {input.guestCount} guests · {eventDateLabel}
          {input.location ? ` · ${input.location}` : ""}
        </p>
        {blueprintImage ? (
          <figure className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
            <img src={blueprintImage} alt="Top-down blueprint sketch of recommended event layout" className="mx-auto block w-full max-w-2xl" />
            <figcaption className="border-t border-border px-4 py-3 text-center text-sm font-medium text-foreground">
              {recommendation.layout_caption}
            </figcaption>
          </figure>
        ) : (
          <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            Blueprint image unavailable — layout note: {recommendation.layout_caption}
          </div>
        )}
        {equipmentSummary && (
          <p className="mt-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {equipmentSummary}
          </p>
        )}
      </section>

      <section className="mt-8 break-inside-avoid print:break-inside-avoid">
        <h3 className="font-serif text-xl text-primary">Event Details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
          {recapRows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border/60 py-1.5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h3 className="font-serif text-xl text-primary">Recommended Setup</h3>
        <div className="mt-4 space-y-5">
          {orderedCategories.map((cat) => (
            <div key={cat} className="break-inside-avoid print:break-inside-avoid">
              <h4 className="border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">{cat}</h4>
              <ul className="mt-2 space-y-1.5">
                {grouped.get(cat)!.map((p, i) => (
                  <li
                    key={`${p.item_id}-${i}`}
                    className="grid grid-cols-[44px_1fr] items-center gap-3 break-inside-avoid rounded-lg border border-border/50 bg-secondary/35 px-3 py-2 text-sm print:break-inside-avoid"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {p.quantity}×
                    </span>
                    <span className="leading-snug">
                      <span className="block font-semibold text-foreground">{p.item_name}</span>
                      {p.reason && <span className="mt-0.5 block text-xs text-muted-foreground">{p.reason}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {(recommendation.weather_notes?.length ?? 0) > 0 && (
        <section className="mt-8 break-inside-avoid rounded-xl border border-border bg-background p-5 print:break-inside-avoid">
          <h3 className="font-serif text-xl text-primary">Weather &amp; Setup Notes</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {(recommendation.weather_notes ?? []).map((n, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-none text-[color:var(--forest)]" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 rounded-lg bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
        This is an AI-generated estimate. Final tent size, quantities, equipment placement, and anchoring may change based on venue details, surface, weather, access, and availability. Request a quote for confirmed pricing and logistics.
      </p>
    </div>
  );
}

export function RecommendationViewer({
  open,
  onClose,
  recommendation,
  blueprintImage,
  input,
  contactName,
  fileName,
  recommendationId,
  contact,
  userEmail,
  status,
  quoteRequestedAt,
}: {
  open: boolean;
  onClose: () => void;
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  input: RecommenderInput;
  contactName?: string;
  fileName: string;
  recommendationId?: string;
  contact?: { name?: string; email?: string; phone?: string; preferredContact?: string } | null;
  userEmail?: string | null;
  status?: PlanStatus | string;
  quoteRequestedAt?: string | null;
}) {
  const [busy, setBusy] = useState<null | "download" | "print">(null);
  const [quoteOpen, setQuoteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  async function handleDownload() {
    if (busy) return;
    setBusy("download");
    try {
      await downloadRecommendationPdf({ recommendation, blueprintImage, input, contactName }, fileName);
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    if (busy) return;
    setBusy("print");
    try {
      await printRecommendationPdf({ recommendation, blueprintImage, input, contactName });
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  const requested = status === "quote_requested" || status === "quote_sent" || status === "booked" || !!quoteRequestedAt;
  const canRequestQuote = !!recommendationId;

  return (
    <div className="fixed inset-0 z-[90] bg-primary/80 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4" /> PDF Viewer
            {status && <StatusBadge status={status} className="ml-1" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canRequestQuote && (requested ? (
              <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
                <Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Quote Requested</span><span className="sm:hidden">Quoted</span>
              </button>
            ) : (
              <button type="button" onClick={() => setQuoteOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
                <Send className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Request Quote</span><span className="sm:hidden">Quote</span>
              </button>
            ))}
            <button type="button" onClick={handleDownload} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60">
              {busy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download PDF
            </button>
            <button type="button" onClick={handlePrint} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60">
              {busy === "print" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-secondary/60 p-3 sm:p-6">
          <div className="mx-auto max-w-[816px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <RecommendationReport
              recommendation={recommendation}
              blueprintImage={blueprintImage}
              input={input}
              contactName={contactName}
            />
          </div>
        </div>
      </div>
      {canRequestQuote && recommendationId && (
        <RequestQuoteModal
          open={quoteOpen}
          onClose={() => setQuoteOpen(false)}
          recommendationId={recommendationId}
          input={input}
          recommendation={recommendation}
          contact={contact ?? null}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
