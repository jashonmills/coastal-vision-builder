import type { AIRecommendation, Pick } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";
import logoUrl from "@/assets/logo.png";

const CATEGORY_ORDER = ["Canopy", "Canopy Options", "Canopy Cleaning Fee", "Tables", "Chairs", "Specialty Items", "Delivery"];

type BuildArgs = {
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  perspectiveImage?: string | null;
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

export async function buildRecommendationPdf({ recommendation, blueprintImage, perspectiveImage, input, contactName }: BuildArgs) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const footerReserve = 40; // space at bottom reserved for footer
  const contentBottom = pageH - margin - footerReserve;
  const contentW = pageW - margin * 2;

  const navy: [number, number, number] = [30, 41, 59];
  const gold: [number, number, number] = [180, 142, 65];
  const muted: [number, number, number] = [100, 110, 120];
  const border: [number, number, number] = [220, 220, 220];
  const rowBg: [number, number, number] = [248, 248, 245];

  let y = margin;

  const remaining = () => contentBottom - y;
  const newPage = () => { pdf.addPage(); y = margin; };
  const ensureSpace = (needed: number) => { if (y + needed > contentBottom) newPage(); };

  // ---------- HEADER (cover block) ----------
  const logo = await loadImageDataUrl(logoUrl);
  if (logo) {
    const lh = 56;
    const lw = (logo.w / logo.h) * lh;
    pdf.addImage(logo.data, "PNG", (pageW - lw) / 2, y, lw, lh);
    y += lh + 14;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...gold);
  pdf.text("PACIFIC NORTH EVENTS & TENTS", pageW / 2, y, { align: "center", charSpace: 1.2 });
  y += 18;

  pdf.setFont("times", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(...navy);
  const headlineLines = pdf.splitTextToSize(recommendation.headline || "Event Setup Recommendation", contentW - 60);
  pdf.text(headlineLines, pageW / 2, y + 20, { align: "center" });
  y += headlineLines.length * 28 + 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(...muted);
  const sumLines = pdf.splitTextToSize(recommendation.summary || "", contentW - 80);
  pdf.text(sumLines, pageW / 2, y + 6, { align: "center" });
  y += sumLines.length * 14 + 22;

  pdf.setDrawColor(...border);
  pdf.line(margin, y, pageW - margin, y);
  y += 18;

  // ---------- PREPARED FOR ----------
  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "your selected date";
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...navy);
  const prepared = `Prepared for ${contactName || "your event"}  ·  ${input.eventType}  ·  ${input.guestCount} guests  ·  ${eventDateLabel}${input.location ? "  ·  " + input.location : ""}`;
  const prepLines = pdf.splitTextToSize(prepared, contentW);
  pdf.text(prepLines, margin, y);
  y += prepLines.length * 13 + 16;

  // ---------- Pre-group picks (needed for summary line + sections) ----------
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
  const equipmentSummary = orderedCategories
    .map((cat) => {
      const total = grouped.get(cat)!.reduce((s, p) => s + (p.quantity || 0), 0);
      return `${total}x ${cat}`;
    })
    .join("  ·  ");

  // ---------- BLUEPRINT ----------
  if (blueprintImage) {
    const img = await loadImageDataUrl(blueprintImage);
    if (img) {
      const maxW = contentW;
      const maxH = Math.min(300, remaining() - 60);
      let iw = maxW;
      let ih = (img.h / img.w) * iw;
      if (ih > maxH) { ih = maxH; iw = (img.w / img.h) * ih; }
      pdf.addImage(img.data, "PNG", margin + (contentW - iw) / 2, y, iw, ih);
      y += ih + 14;

      if (recommendation.layout_caption) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10);
        pdf.setTextColor(...muted);
        const cap = pdf.splitTextToSize(recommendation.layout_caption, contentW - 40);
        pdf.text(cap, pageW / 2, y, { align: "center" });
        y += cap.length * 12 + 10;
      }

      if (equipmentSummary) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...muted);
        // Narrower wrap width to account for centered layout + letter spacing
        const sLines = pdf.splitTextToSize(equipmentSummary, contentW - 40);
        pdf.text(sLines, pageW / 2, y, { align: "center" });
        y += sLines.length * 12 + 14;
      } else {
        y += 6;
      }

    }
  }

  // ---------- 3D PERSPECTIVE VIEW ----------
  if (perspectiveImage) {
    const img = await loadImageDataUrl(perspectiveImage);
    if (img) {
      const maxW = contentW;
      let iw = maxW;
      let ih = (img.h / img.w) * iw;
      const maxH = Math.min(300, pageH - margin - footerReserve - margin);
      if (ih > maxH) { ih = maxH; iw = (img.w / img.h) * ih; }
      ensureSpace(ih + 28);
      pdf.addImage(img.data, "PNG", margin + (contentW - iw) / 2, y, iw, ih);
      y += ih + 8;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...gold);
      pdf.text("3D VIEW", pageW / 2, y, { align: "center", charSpace: 1.2 });
      y += 16;
    }
  }

  // ---------- Section heading helper ----------
  const sectionHeading = (label: string) => {
    pdf.setFont("times", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...navy);
    pdf.text(label, margin, y);
    y += 8;
    pdf.setDrawColor(...border);
    pdf.line(margin, y, pageW - margin, y);
    y += 16;
  };

  // ---------- EVENT DETAILS (2-column compact grid) ----------
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

  const colGap = 24;
  const colW = (contentW - colGap) / 2;
  const cellH = 18;
  const numRows = Math.ceil(recapRows.length / 2);
  const detailsBlockH = 30 + numRows * cellH + 10;
  if (remaining() < detailsBlockH) newPage();

  sectionHeading("Event Details");
  pdf.setFontSize(10);
  for (let r = 0; r < numRows; r++) {
    const rowY = y;
    for (let c = 0; c < 2; c++) {
      const idx = r * 2 + c;
      if (idx >= recapRows.length) continue;
      const [k, v] = recapRows[idx];
      const cellX = margin + c * (colW + colGap);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...muted);
      pdf.text(k, cellX, rowY + 11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...navy);
      const vStr = pdf.splitTextToSize(String(v), colW - 90)[0] ?? String(v);
      pdf.text(vStr, cellX + colW, rowY + 11, { align: "right" });
    }
    y += cellH - 4;
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, y, pageW - margin, y);
    y += 4;
  }
  y += 14;

  // ---------- RECOMMENDED SETUP ----------
  // (grouped + orderedCategories already computed above)


  // Heading + measure first item to keep heading with first item
  const measureItem = (p: Pick) => {
    const nameLines = pdf.splitTextToSize(p.item_name, contentW - 70);
    const reasonLines = pdf.splitTextToSize(p.reason || "", contentW - 70);
    return nameLines.length * 13 + reasonLines.length * 12 + 16;
  };

  // Reserve room for setup heading + first category header + first item
  const setupHeadingH = 34;
  if (orderedCategories.length > 0) {
    const firstCat = orderedCategories[0];
    const firstItems = grouped.get(firstCat)!;
    const firstNeeded = setupHeadingH + 24 + (firstItems[0] ? measureItem(firstItems[0]) : 30);
    if (remaining() < firstNeeded) newPage();
  }

  sectionHeading("Recommended Setup");

  for (const cat of orderedCategories) {
    const items = grouped.get(cat)!;
    const firstItemH = items[0] ? measureItem(items[0]) : 30;
    // Keep category heading with first item
    if (remaining() < 28 + firstItemH) newPage();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...gold);
    pdf.text(cat.toUpperCase(), margin, y, { charSpace: 1 });
    y += 6;
    pdf.setDrawColor(...border);
    pdf.line(margin, y, pageW - margin, y);
    y += 12;

    for (const p of items) {
      const nameLines = pdf.splitTextToSize(p.item_name, contentW - 70);
      const reasonLines = pdf.splitTextToSize(p.reason || "", contentW - 70);
      const blockH = nameLines.length * 13 + reasonLines.length * 12 + 16;
      if (remaining() < blockH) newPage();

      pdf.setFillColor(...rowBg);
      pdf.roundedRect(margin, y, contentW, blockH - 6, 4, 4, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...navy);
      pdf.text(`${p.quantity}×`, margin + 10, y + 14);
      pdf.text(nameLines, margin + 56, y + 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...muted);
      pdf.text(reasonLines, margin + 56, y + 14 + nameLines.length * 13);

      y += blockH;
    }
    y += 10;
  }

  // ---------- WEATHER NOTES (keep heading with at least 1 note) ----------
  const notes = recommendation.weather_notes ?? [];
  if (notes.length > 0) {
    const firstNote = pdf.splitTextToSize(`•  ${notes[0]}`, contentW);
    if (remaining() < 40 + firstNote.length * 12) newPage();
    sectionHeading("Weather & Setup Notes");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...navy);
    for (const n of notes) {
      const lines = pdf.splitTextToSize(`•  ${n}`, contentW);
      const h = lines.length * 13 + 6;
      if (remaining() < h) newPage();
      pdf.text(lines, margin, y);
      y += h;
    }
    y += 8;
  }

  // ---------- DISCLAIMER ----------
  const discText = "This is an AI-generated estimate. Final tent size, quantities, equipment placement, and anchoring may change based on venue details, surface, weather, access, and availability. Request a quote for confirmed pricing and logistics.";
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  const discLines = pdf.splitTextToSize(discText, contentW - 20);
  const discH = discLines.length * 11 + 18;
  if (remaining() < discH) newPage();
  pdf.setFillColor(...rowBg);
  pdf.roundedRect(margin, y, contentW, discH, 4, 4, "F");
  pdf.setTextColor(...muted);
  pdf.text(discLines, margin + 10, y + 12);

  // ---------- FOOTER ----------
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...muted);
    pdf.text("Pacific North Events & Tents", margin, pageH - 22);
    pdf.text(`Page ${i} of ${total}`, pageW - margin, pageH - 22, { align: "right" });
  }

  return pdf;
}

export async function downloadRecommendationPdf(args: BuildArgs, fileName: string) {
  const pdf = await buildRecommendationPdf(args);
  pdf.save(`${fileName}.pdf`);
}

export async function printRecommendationPdf(args: BuildArgs) {
  const pdf = await buildRecommendationPdf(args);
  const blob = pdf.output("blob") as Blob;
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      /* noop */
    }
  };
  document.body.appendChild(iframe);
  setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* noop */ }
    URL.revokeObjectURL(url);
  }, 60000);
}

