import type { AIRecommendation, Pick } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";
import logoUrl from "@/assets/logo.png";

const CATEGORY_ORDER = ["Canopy", "Canopy Options", "Canopy Cleaning Fee", "Tables", "Chairs", "Specialty Items", "Delivery"];

type BuildArgs = {
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  input: RecommenderInput;
  contactName?: string;
};

async function loadImageDataUrl(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const data: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = data;
    });
    return { data, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function buildRecommendationPdf({ recommendation, blueprintImage, input, contactName }: BuildArgs) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  // Colors (matches site palette approximately)
  const navy: [number, number, number] = [30, 41, 59];
  const gold: [number, number, number] = [180, 142, 65];
  const muted: [number, number, number] = [100, 110, 120];
  const border: [number, number, number] = [220, 220, 220];
  const rowBg: [number, number, number] = [248, 248, 245];

  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Logo
  const logo = await loadImageDataUrl(logoUrl);
  if (logo) {
    const lh = 44;
    const lw = (logo.w / logo.h) * lh;
    pdf.addImage(logo.data, "PNG", (pageW - lw) / 2, y, lw, lh);
    y += lh + 8;
  }

  // Brand line
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...gold);
  pdf.text("PACIFIC NORTH EVENTS & TENTS", pageW / 2, y, { align: "center" });
  y += 16;

  // Headline
  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...navy);
  const headlineLines = pdf.splitTextToSize(recommendation.headline || "Event Setup Recommendation", contentW);
  pdf.text(headlineLines, pageW / 2, y, { align: "center" });
  y += headlineLines.length * 24;

  // Summary
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...muted);
  const sumLines = pdf.splitTextToSize(recommendation.summary || "", contentW - 40);
  pdf.text(sumLines, pageW / 2, y, { align: "center" });
  y += sumLines.length * 13 + 14;

  // Divider
  pdf.setDrawColor(...border);
  pdf.line(margin, y, pageW - margin, y);
  y += 18;

  // Prepared for
  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "your selected date";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...navy);
  const prepared = `Prepared for ${contactName || "your event"}  ·  ${input.eventType}  ·  ${input.guestCount} guests  ·  ${eventDateLabel}${input.location ? "  ·  " + input.location : ""}`;
  const prepLines = pdf.splitTextToSize(prepared, contentW);
  pdf.text(prepLines, margin, y);
  y += prepLines.length * 13 + 10;

  // Blueprint image
  if (blueprintImage) {
    const img = await loadImageDataUrl(blueprintImage);
    if (img) {
      const maxW = contentW;
      const maxH = 280;
      let iw = maxW;
      let ih = (img.h / img.w) * iw;
      if (ih > maxH) { ih = maxH; iw = (img.w / img.h) * ih; }
      ensureSpace(ih + 30);
      pdf.addImage(img.data, "PNG", margin + (contentW - iw) / 2, y, iw, ih);
      y += ih + 6;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...muted);
      const cap = pdf.splitTextToSize(recommendation.layout_caption || "", contentW);
      pdf.text(cap, pageW / 2, y + 8, { align: "center" });
      y += cap.length * 11 + 18;
    }
  }

  // Section heading helper
  const sectionHeading = (label: string) => {
    ensureSpace(28);
    pdf.setFont("times", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...navy);
    pdf.text(label, margin, y);
    y += 6;
    pdf.setDrawColor(...border);
    pdf.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // Event details (two-column key/value)
  sectionHeading("Event Details");
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
  pdf.setFontSize(10);
  for (const [k, v] of recapRows) {
    ensureSpace(18);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...muted);
    pdf.text(k, margin, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...navy);
    const vLines = pdf.splitTextToSize(String(v), contentW - 140);
    pdf.text(vLines, pageW - margin, y, { align: "right" });
    const used = Math.max(vLines.length * 12, 14);
    y += used;
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, y, pageW - margin, y);
    y += 6;
  }
  y += 6;

  // Recommended setup
  sectionHeading("Recommended Setup");
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

  for (const cat of orderedCategories) {
    ensureSpace(24);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...gold);
    pdf.text(cat.toUpperCase(), margin, y);
    y += 4;
    pdf.setDrawColor(...border);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    for (const p of grouped.get(cat)!) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...navy);
      const qty = `${p.quantity}×`;
      const nameLines = pdf.splitTextToSize(p.item_name, contentW - 60);
      const reasonLines = pdf.splitTextToSize(p.reason || "", contentW - 60);
      const blockH = nameLines.length * 12 + reasonLines.length * 11 + 12;
      ensureSpace(blockH);

      // Row background
      pdf.setFillColor(...rowBg);
      pdf.roundedRect(margin, y - 2, contentW, blockH - 4, 4, 4, "F");

      pdf.text(qty, margin + 8, y + 10);
      pdf.text(nameLines, margin + 50, y + 10);
      let inner = y + 10 + nameLines.length * 12;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...muted);
      pdf.text(reasonLines, margin + 50, inner);
      y += blockH;
    }
    y += 6;
  }

  // Weather notes
  const notes = recommendation.weather_notes ?? [];
  if (notes.length > 0) {
    y += 6;
    sectionHeading("Weather & Setup Notes");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...navy);
    for (const n of notes) {
      const lines = pdf.splitTextToSize(`•  ${n}`, contentW);
      ensureSpace(lines.length * 12 + 4);
      pdf.text(lines, margin, y);
      y += lines.length * 12 + 4;
    }
  }

  // Disclaimer
  y += 10;
  ensureSpace(40);
  pdf.setFillColor(...rowBg);
  pdf.roundedRect(margin, y, contentW, 38, 4, 4, "F");
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(...muted);
  const disc = pdf.splitTextToSize(
    "This is an AI-generated estimate. Final tent size, quantities, equipment placement, and anchoring may change based on venue details, surface, weather, access, and availability. Request a quote for confirmed pricing and logistics.",
    contentW - 16,
  );
  pdf.text(disc, margin + 8, y + 12);

  // Footer page numbers
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text(`Pacific North Events & Tents`, margin, pageH - 20);
    pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 20, { align: "right" });
  }

  return pdf;
}

export async function downloadRecommendationPdf(args: BuildArgs, fileName: string) {
  const pdf = await buildRecommendationPdf(args);
  pdf.save(`${fileName}.pdf`);
}

export async function printRecommendationPdf(args: BuildArgs) {
  const pdf = await buildRecommendationPdf(args);
  const blobUrl = pdf.output("bloburl") as unknown as string;
  const w = window.open(blobUrl, "_blank");
  if (w) {
    w.addEventListener("load", () => {
      try { w.focus(); w.print(); } catch { /* noop */ }
    });
  }
}
