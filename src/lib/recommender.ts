export type EventType =
  | "Wedding" | "Festival" | "Private Party" | "Corporate Event"
  | "Market / Vendor Event" | "Fundraiser" | "Community Event"
  | "Graduation Party" | "Other";

export type SetupType =
  | "Standing only" | "Ceremony seating" | "Seated dining"
  | "Cocktail tables / mingling" | "Vendor booths" | "Food service area"
  | "Mixed layout" | "Not sure";

export interface RecommenderInput {
  eventType: EventType;
  eventDate: string;
  location: string;
  outdoor: "Fully outdoors" | "Indoors" | "Partially covered" | "Not sure yet";
  guestCount: number;
  setupType: SetupType;
  seated: string;
  tableStyle: string;
  food: string;
  dancing: string;
  extras: string[];
  rentals: string[];
  surface: string;
  exposure: "Yes, very exposed" | "Somewhat exposed" | "Mostly protected" | "Not sure";
  sidewalls: string;
  afterSunset: "Yes" | "No" | "Not sure";
}

export interface Recommendation {
  tentSize: string;
  layoutType: string;
  equipment: string[];
  weatherNotes: string[];
}

const STANDING = [
  { max: 25, size: "10x10 or 10x20" },
  { max: 50, size: "20x20" },
  { max: 75, size: "20x30" },
  { max: 100, size: "20x40" },
  { max: 150, size: "30x45" },
  { max: 200, size: "40x60 or multiple tents" },
  { max: Infinity, size: "Custom large event layout" },
];
const SEATED = [
  { max: 25, size: "20x20" },
  { max: 50, size: "20x30" },
  { max: 75, size: "20x40" },
  { max: 100, size: "30x45 or 30x60" },
  { max: 150, size: "40x60" },
  { max: 200, size: "40x80 or multiple tents" },
  { max: Infinity, size: "Custom large event layout" },
];

function pick(table: { max: number; size: string }[], n: number) {
  return table.find((r) => n <= r.max)?.size ?? "Custom large event layout";
}

function nextSize(table: { max: number; size: string }[], n: number) {
  const idx = table.findIndex((r) => n <= r.max);
  return table[Math.min(idx + 1, table.length - 1)]?.size ?? "Custom large event layout";
}

export function recommend(input: RecommenderInput): Recommendation {
  const g = Number(input.guestCount) || 0;
  const isFestival =
    input.eventType === "Festival" || input.eventType === "Market / Vendor Event";
  const isSeated =
    input.setupType === "Seated dining" || input.setupType === "Ceremony seating";
  const isMixed = input.setupType === "Mixed layout";
  const isWedding = input.eventType === "Wedding";

  let tentSize: string;
  let layoutType: string;

  if (isFestival) {
    layoutType = "Festival vendor layout";
    tentSize =
      g >= 100
        ? "Custom festival layout with vendor tents, check-in tent, and food service area"
        : "Multiple vendor tents (10x10 / 10x20) with central gathering tent";
  } else if (isWedding && (isSeated || isMixed || input.dancing?.startsWith("Yes") || input.extras?.includes("DJ booth") || input.extras?.includes("Bar area"))) {
    tentSize = nextSize(SEATED, g);
    layoutType = "Wedding reception layout";
  } else if (isSeated || isMixed) {
    tentSize = pick(SEATED, g);
    layoutType = isMixed ? "Mixed dining + mingling layout" : "Seated dining layout";
  } else {
    tentSize = pick(STANDING, g);
    layoutType = "Standing / mingling layout";
  }

  // Equipment checklist
  const eq = new Set<string>(["Tent"]);
  if (isSeated || isMixed || input.seated?.startsWith("Yes") || input.seated?.startsWith("Some")) {
    eq.add("Tables");
    eq.add("Chairs");
  }
  if (input.tableStyle && !input.tableStyle.includes("No tables")) eq.add("Linens");
  if (input.dancing?.startsWith("Yes") || input.dancing?.startsWith("Small")) {
    eq.add("Dance floor");
  }
  if (input.food && !input.food.startsWith("No")) eq.add("Buffet / food service table");
  for (const x of input.extras || []) {
    if (x === "Bar area") eq.add("Bar area");
    if (x === "Gift table") eq.add("Gift table");
    if (x === "Dessert table") eq.add("Dessert table");
    if (x === "DJ booth" || x === "Live band" || x === "Small stage") eq.add("Stage / DJ area");
  }
  for (const r of input.rentals || []) eq.add(r);
  if (input.afterSunset === "Yes") eq.add("Lighting / string lights");
  if (input.exposure === "Yes, very exposed" || input.exposure === "Somewhat exposed") {
    eq.add("Sidewalls");
  }
  eq.add("Setup and breakdown");

  // Weather notes
  const notes: string[] = [];
  if (input.exposure === "Yes, very exposed" || input.exposure === "Somewhat exposed") {
    notes.push("Sidewalls recommended for added wind and rain protection.");
  }
  if (input.afterSunset === "Yes") {
    notes.push("Lighting package or string lights recommended for after-sunset events.");
  }
  if (input.dancing?.startsWith("Yes")) {
    notes.push("Add extra square footage for dancing so the dining area does not feel cramped.");
  }
  const tricky = ["Concrete", "Asphalt", "Sand", "Deck / patio", "Mixed surface", "Not sure"];
  if (tricky.includes(input.surface)) {
    notes.push("Setup method may vary based on surface. Anchoring options should be confirmed before final quote.");
  }
  if (notes.length === 0) {
    notes.push("Conditions look straightforward — we'll confirm anchoring and layout during quoting.");
  }

  return {
    tentSize,
    layoutType,
    equipment: Array.from(eq),
    weatherNotes: notes,
  };
}
