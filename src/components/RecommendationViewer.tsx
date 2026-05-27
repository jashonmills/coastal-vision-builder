import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/logo.png";
import type { AIRecommendation, Pick } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";
import { downloadRecommendationPdf, printRecommendationPdf } from "@/lib/recommendation-pdf";
import { Check, Download, FileText, Loader2, Printer, X } from "lucide-react";

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

  return (
    <div className="bg-card p-7 text-foreground sm:p-10">
      <div className="border-b border-border pb-6 text-center">
        <img src={logoUrl} alt="Pacific North Event & Tent Rentals" className="mx-auto mb-4 h-16 w-auto" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">Pacific North Events &amp; Tents</p>
        <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">{recommendation.headline}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{recommendation.summary}</p>
      </div>

      <section className="mt-7">
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
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h3 className="font-serif text-xl text-primary">Event Details</h3>
          <dl className="mt-4 space-y-2">
            {recapRows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="font-serif text-xl text-primary">Recommended Setup</h3>
          <div className="mt-4 space-y-5">
            {orderedCategories.map((cat) => (
              <div key={cat}>
                <h4 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">{cat}</h4>
                <ul className="mt-3 space-y-2">
                  {grouped.get(cat)!.map((p, i) => (
                    <li key={`${p.item_id}-${i}`} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg bg-secondary/35 px-3 py-2.5 text-sm">
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{p.quantity}×</span>
                      <span>
                        <span className="block font-medium text-foreground">{p.item_name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{p.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(recommendation.weather_notes?.length ?? 0) > 0 && (
        <section className="mt-8 rounded-xl border border-border bg-background p-5">
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
}: {
  open: boolean;
  onClose: () => void;
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  input: RecommenderInput;
  contactName?: string;
  fileName: string;
}) {
  const reportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  async function downloadPdf() {
    const element = reportRef.current;
    if (!element) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    const imageData = canvas.toDataURL("image/png");
    let rendered = 0;
    pdf.addImage(imageData, "PNG", margin, margin, imageWidth, imageHeight);
    rendered += pageHeight - margin * 2;
    while (rendered < imageHeight) {
      pdf.addPage();
      pdf.addImage(imageData, "PNG", margin, margin - rendered, imageWidth, imageHeight);
      rendered += pageHeight - margin * 2;
    }
    pdf.save(`${fileName}.pdf`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-primary/80 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4" /> PDF Viewer
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
              <Download className="h-3.5 w-3.5" /> Download PDF
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-secondary/60 p-3 sm:p-6">
          <div className="mx-auto max-w-[816px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div ref={reportRef}>
              <RecommendationReport
                recommendation={recommendation}
                blueprintImage={blueprintImage}
                input={input}
                contactName={contactName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
