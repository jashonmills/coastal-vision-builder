// Pseudo-AI knowledge base for the Planning Help chat widget.
// No live API calls — pure rule-based intent matching + canned responses.

export type ChatAction = {
  labelKey: string;
  to?: string;      // internal route
  href?: string;    // external/tel/mailto
  intent?: string;  // jump to another intent
};

export type ChatAnswer = {
  intent: string;
  bodyKey: string;        // i18n key for the answer body
  actions?: ChatAction[];
};

// Quick-start chips shown when chat opens
export const QUICK_STARTS: { labelKey: string; intent: string }[] = [
  { labelKey: "chat.quick.tentSize",   intent: "tent_size" },
  { labelKey: "chat.quick.planEvent",  intent: "plan_event" },
  { labelKey: "chat.quick.rentals",    intent: "inventory" },
  { labelKey: "chat.quick.beach",      intent: "beach_event" },
  { labelKey: "chat.quick.quote",      intent: "quote_request" },
  { labelKey: "chat.quick.contact",    intent: "contact" },
];

// Keyword → intent map. Lower-cased substring match.
export const INTENT_KEYWORDS: Record<string, string[]> = {
  tent_size:      ["size", "what tent", "how big", "guest", "fit", "people", "capacity"],
  beach_event:    ["beach", "sand", "coast", "ocean", "shore", "seaside"],
  sidewalls:      ["sidewall", "walls", "rain", "wind protection", "cover"],
  anchoring:      ["anchor", "staking", "stake", "water barrel", "weights", "tie down"],
  inventory:      ["rental", "inventory", "what do you have", "equipment", "items", "offer", "tables", "chairs"],
  tables_chairs:  ["table", "chair", "seating"],
  dance_floor:    ["dance", "floor"],
  stage_sound:    ["stage", "pa", "speaker", "sound", "mic", "audio"],
  quote_request:  ["quote", "price", "estimate", "cost", "pricing", "how much"],
  saved_plans:    ["saved", "my plan", "pdf", "download", "my recommendation"],
  account:        ["account", "login", "sign in", "profile"],
  contact:        ["contact", "call", "phone", "email", "talk to", "human", "someone"],
  delivery_setup: ["delivery", "setup", "set up", "breakdown", "deliver", "install"],
  availability:   ["available", "availability", "in stock", "free on"],
  plan_event:     ["plan", "planner", "help me plan", "wedding", "festival", "party", "corporate"],
};

// Canned answers keyed by intent. Body text lives in i18n (chat.answers.*).
export const CHAT_ANSWERS: Record<string, ChatAnswer> = {
  tent_size: {
    intent: "tent_size",
    bodyKey: "chat.answers.tent_size",
    actions: [
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
    ],
  },
  beach_event: {
    intent: "beach_event",
    bodyKey: "chat.answers.beach_event",
    actions: [
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
    ],
  },
  sidewalls: {
    intent: "sidewalls",
    bodyKey: "chat.answers.sidewalls",
    actions: [
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
    ],
  },
  anchoring: {
    intent: "anchoring",
    bodyKey: "chat.answers.anchoring",
    actions: [{ labelKey: "chat.actions.requestQuote", to: "/contact" }],
  },
  inventory: {
    intent: "inventory",
    bodyKey: "chat.answers.inventory",
    actions: [
      { labelKey: "chat.actions.viewRentals", to: "/inventory" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
    ],
  },
  tables_chairs: {
    intent: "tables_chairs",
    bodyKey: "chat.answers.tables_chairs",
    actions: [{ labelKey: "chat.actions.viewRentals", to: "/inventory" }],
  },
  dance_floor: {
    intent: "dance_floor",
    bodyKey: "chat.answers.dance_floor",
    actions: [{ labelKey: "chat.actions.viewRentals", to: "/inventory" }],
  },
  stage_sound: {
    intent: "stage_sound",
    bodyKey: "chat.answers.stage_sound",
    actions: [{ labelKey: "chat.actions.viewRentals", to: "/inventory" }],
  },
  quote_request: {
    intent: "quote_request",
    bodyKey: "chat.answers.quote_request",
    actions: [
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
    ],
  },
  saved_plans: {
    intent: "saved_plans",
    bodyKey: "chat.answers.saved_plans",
    actions: [
      { labelKey: "chat.actions.myAccount", to: "/account" },
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
    ],
  },
  account: {
    intent: "account",
    bodyKey: "chat.answers.account",
    actions: [{ labelKey: "chat.actions.myAccount", to: "/account" }],
  },
  contact: {
    intent: "contact",
    bodyKey: "chat.answers.contact",
    actions: [{ labelKey: "chat.actions.contact", to: "/contact" }],
  },
  delivery_setup: {
    intent: "delivery_setup",
    bodyKey: "chat.answers.delivery_setup",
    actions: [{ labelKey: "chat.actions.requestQuote", to: "/contact" }],
  },
  availability: {
    intent: "availability",
    bodyKey: "chat.answers.availability",
    actions: [{ labelKey: "chat.actions.requestQuote", to: "/contact" }],
  },
  plan_event: {
    intent: "plan_event",
    bodyKey: "chat.answers.plan_event",
    actions: [
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
    ],
  },
  unknown: {
    intent: "unknown",
    bodyKey: "chat.answers.unknown",
    actions: [
      { labelKey: "chat.actions.startPlanner", to: "/ai-tent-planner" },
      { labelKey: "chat.actions.requestQuote", to: "/contact" },
      { labelKey: "chat.actions.contact", to: "/contact" },
    ],
  },
};

// Page-aware nudges. Keyed by route prefix.
export const PAGE_HINTS: { match: (path: string) => boolean; bodyKey: string }[] = [
  { match: (p) => p.startsWith("/ai-tent-planner"), bodyKey: "chat.pageHints.planner" },
  { match: (p) => p.startsWith("/account/") && p !== "/account",  bodyKey: "chat.pageHints.savedPlan" },
  { match: (p) => p === "/account" || p.startsWith("/account"),    bodyKey: "chat.pageHints.account" },
  { match: (p) => p.startsWith("/inventory") || p.startsWith("/tent-rentals"), bodyKey: "chat.pageHints.rentals" },
  { match: (p) => p.startsWith("/contact"), bodyKey: "chat.pageHints.contact" },
];

export function matchIntent(input: string): string {
  const q = input.toLowerCase();
  let best = "unknown";
  let bestScore = 0;
  for (const [intent, kws] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const kw of kws) if (q.includes(kw)) score += kw.length;
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best;
}

// Knowledge facts available to future enhancements (currently used for
// inventory-style answers).
export const INVENTORY_FACTS = {
  categories: [
    "Tents / Canopies",
    "Canopy Accessories",
    "Tables",
    "Chairs",
    "Dance Floors",
    "Staging",
    "Audio / PA",
    "Bars / Food Service",
    "Anchoring / Weights",
    "Delivery / Fees",
    "Cleaning Fees",
  ],
  featuredItems: [
    "20x40 Frame Tent",
    "Canopy Wall 20' with Window",
    "Water Barrels (anchoring)",
    "60\" Round Tables",
    "30\" Round Cocktail Tables",
    "8' x 30\" Rectangular Tables",
    "White Folding Chairs",
    "Dance Floor Sections",
    "Stage 6x8 Sections",
    "PA System – Bluetooth with Mic",
    "Portable Bar",
    "Chafing Dishes",
  ],
};
