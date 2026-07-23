// Heuristic mapping from a quote's line items to the right contract type(s).
// Client-safe; no server imports.

export type ContractId =
  | "rental-contract"
  | "beacon-contract"
  | "catering-contract"
  | "credit-card-authorization";

type QuoteLite = { event_type?: string | null; event_location?: string | null };
type ItemLite = { name?: string | null; category?: string | null; description?: string | null };

const CATERING_KEYWORDS = /(cater|menu|bar\b|chef|buffet|hors|platter|entr[ée]e|dessert|beverage|appetiz)/i;
const BEACON_KEYWORDS = /beacon/i;
const RENTAL_KEYWORDS = /(tent|table|chair|linen|dance floor|light|heater|stage|arch|arbor|lounge|glassware|flatware|plate)/i;

function matchAny(items: ItemLite[], quote: QuoteLite, rx: RegExp): boolean {
  if (rx.test(quote.event_type ?? "") || rx.test(quote.event_location ?? "")) return true;
  return items.some(
    (i) => rx.test(i.name ?? "") || rx.test(i.category ?? "") || rx.test(i.description ?? ""),
  );
}

export function detectContractTypesForQuote(
  quote: QuoteLite,
  items: ItemLite[],
): { primary: ContractId; all: ContractId[] } {
  const hasBeacon = matchAny(items, quote, BEACON_KEYWORDS);
  const hasCatering = matchAny(items, quote, CATERING_KEYWORDS);
  const hasRental = matchAny(items, quote, RENTAL_KEYWORDS);

  let primary: ContractId = "rental-contract";
  if (hasBeacon) primary = "beacon-contract";
  else if (hasCatering) primary = "catering-contract";

  const all: ContractId[] = [primary];
  if (primary !== "rental-contract" && hasRental) all.push("rental-contract");
  if (primary !== "catering-contract" && hasCatering) all.push("catering-contract");
  all.push("credit-card-authorization");

  return { primary, all: Array.from(new Set(all)) };
}
