import type { AIRecommendation, Pick } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";

export const BUSINESS_EMAIL = "nichole@damrkom.com";

function line(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `${label}: ${value}`;
}

function summarizePicks(picks: Pick[] | undefined): string {
  if (!picks?.length) return "";
  const byCat = new Map<string, Pick[]>();
  for (const p of picks) {
    const arr = byCat.get(p.category) ?? [];
    arr.push(p);
    byCat.set(p.category, arr);
  }
  const out: string[] = [];
  for (const [cat, list] of byCat) {
    out.push(`  ${cat}:`);
    for (const p of list) {
      out.push(`    - ${p.quantity}x ${p.item_name}${p.reason ? ` (${p.reason})` : ""}`);
    }
  }
  return out.join("\n");
}

export function buildQuoteRequestEmail(args: {
  recommendationId: string;
  input: RecommenderInput;
  recommendation: AIRecommendation;
  contact?: { name?: string; email?: string; phone?: string; preferredContact?: string } | null;
  note?: string;
  viewUrl?: string;
}): { subject: string; body: string } {
  const { input, recommendation, contact, note, recommendationId, viewUrl } = args;

  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, {
        month: "long", day: "numeric", year: "numeric",
      })
    : "TBD";

  const subject = `New Quote Request: ${input.eventType} · ${input.guestCount} guests · ${eventDateLabel}`;

  const recommendedTent = recommendation.picks?.find((p) => p.category === "Canopy")?.item_name ?? "—";

  const sections: string[] = [
    "New quote request received.",
    "",
    "--- CUSTOMER ---",
    line("Name", contact?.name),
    line("Email", contact?.email),
    line("Phone", contact?.phone),
    line("Preferred contact", contact?.preferredContact),
    "",
    "--- EVENT ---",
    line("Event type", input.eventType),
    line("Event date", eventDateLabel),
    line("Location", input.location),
    line("Setting", input.outdoor),
    line("Guest count", input.guestCount),
    line("Setup type", input.setupType),
    line("Seating", input.seated),
    line("Tables", input.tableStyle),
    line("Food", input.food),
    line("Dancing", input.dancing),
    line("Surface", input.surface),
    line("Weather exposure", input.exposure),
    line("Sidewalls", input.sidewalls),
    line("After sunset", input.afterSunset),
    "",
    "--- RECOMMENDATION ---",
    line("Headline", recommendation.headline),
    line("Recommended tent", recommendedTent),
    line("Layout caption", recommendation.layout_caption),
    "",
    "Equipment checklist:",
    summarizePicks(recommendation.picks),
  ];

  if (recommendation.weather_notes?.length) {
    sections.push("", "Weather / setup notes:");
    for (const n of recommendation.weather_notes) sections.push(`  - ${n}`);
  }

  if (note?.trim()) {
    sections.push("", "--- CUSTOMER NOTE ---", note.trim());
  }

  sections.push("", `Recommendation ID: ${recommendationId}`);
  if (viewUrl) sections.push(`View saved plan: ${viewUrl}`);

  return { subject, body: sections.filter((l) => l !== null).join("\n") };
}

export function openQuoteRequestMailto(args: Parameters<typeof buildQuoteRequestEmail>[0]) {
  const { subject, body } = buildQuoteRequestEmail(args);
  const url = `mailto:${encodeURIComponent(BUSINESS_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
