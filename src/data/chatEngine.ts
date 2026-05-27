// Scripted, rule-based chat engine for the Planning Help widget.
// No live AI / no OpenAI calls. Slot extraction + intent detection + templates.

import type { ChatAction } from "./chatKnowledgeBase";

/* ───────────────────────── Types ───────────────────────── */

export type GuestRange = { min: number; max?: number; raw: string };

export type ParsedMessage = {
  raw: string;
  intent: ScriptedIntent;
  eventType?: string;
  locationType?: string;
  guestCount?: GuestRange;
  setupNeeds: string[];
  surfaceWeather: string[];
};

export type ScriptedResponse = {
  text: string;
  actions: ChatAction[];
};

export type ScriptedIntent =
  | "backyard_party"
  | "wedding"
  | "fundraiser"
  | "beach_event"
  | "tent_size"
  | "inventory"
  | "quote_request"
  | "saved_plans"
  | "contact"
  | "generic_event_with_guests"
  | "generic_event"
  | "unknown";

/* ───────────────────── Number word parser ───────────────────── */

const WORD_TO_NUM: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/** Convert "seventy-five", "one hundred", "two hundred and fifty" → number. */
function wordsToNumber(input: string): number | null {
  const tokens = input
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\band\b/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  let total = 0;
  let current = 0;
  let sawAny = false;
  for (const tok of tokens) {
    const n = WORD_TO_NUM[tok];
    if (n === undefined) return null;
    sawAny = true;
    if (n === 100 || n === 1000) {
      current = (current || 1) * n;
    } else {
      current += n;
    }
  }
  total += current;
  return sawAny ? total : null;
}

/** Try to pull a guest-count or range out of a sentence. */
export function extractGuestCount(text: string): GuestRange | undefined {
  const lower = text.toLowerCase();

  // 1) Digit range: "75-100", "75 to 100", "75 – 100"
  const digitRange = lower.match(/(\d{1,4})\s*(?:-|–|to|through)\s*(\d{1,4})/);
  if (digitRange) {
    const min = parseInt(digitRange[1], 10);
    const max = parseInt(digitRange[2], 10);
    return { min, max, raw: `${min}–${max}` };
  }

  // 2) Word range: "seventy-five to a hundred"
  const wordRange = lower.match(
    /([a-z\- ]+?)\s+(?:to|through)\s+(?:a\s+)?([a-z\- ]+?)(?=\s+(?:people|guests|attendees|persons|adults|kids|of|for|$|[.,!?]))/,
  );
  if (wordRange) {
    const a = wordsToNumber(wordRange[1]);
    const b = wordsToNumber(wordRange[2]);
    if (a !== null && b !== null) {
      return { min: a, max: b, raw: `${a}–${b}` };
    }
  }

  // 3) "around 100", "about 50", "approximately 200"
  const approx = lower.match(/(?:around|about|approximately|roughly|~)\s*(\d{1,4})/);
  if (approx) {
    const n = parseInt(approx[1], 10);
    return { min: n, raw: `around ${n}` };
  }

  // 4) "100 plus", "100+"
  const plus = lower.match(/(\d{1,4})\s*\+|\b(\d{1,4})\s+plus\b/);
  if (plus) {
    const n = parseInt(plus[1] ?? plus[2], 10);
    return { min: n, raw: `${n}+` };
  }

  // 5) "under 50", "less than 100"
  const under = lower.match(/(?:under|less than|fewer than|below)\s*(\d{1,4})/);
  if (under) {
    const n = parseInt(under[1], 10);
    return { min: 0, max: n, raw: `under ${n}` };
  }

  // 6) Plain number near "people/guests"
  const near = lower.match(/(\d{1,4})\s*(?:people|guests|attendees|persons|adults|pax)/);
  if (near) {
    const n = parseInt(near[1], 10);
    return { min: n, raw: String(n) };
  }

  // 7) Word number near "people/guests"
  const wordNear = lower.match(
    /([a-z\- ]+?)\s+(?:people|guests|attendees|persons|adults)/,
  );
  if (wordNear) {
    const n = wordsToNumber(wordNear[1]);
    if (n !== null && n > 0) return { min: n, raw: String(n) };
  }

  return undefined;
}

/* ───────────────────── Slot extraction ───────────────────── */

const EVENT_TYPES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: "wedding", label: "wedding", patterns: [/\bwedding\b/, /\breception\b/, /\bceremony\b/, /\bbridal\b/] },
  { key: "backyard_party", label: "backyard party", patterns: [/\bbackyard\b.*\bparty\b/, /\bparty\b.*\bbackyard\b/] },
  { key: "birthday", label: "birthday", patterns: [/\bbirthday\b/, /\bbday\b/] },
  { key: "fundraiser", label: "fundraiser", patterns: [/\bfundraiser\b/, /\bgala\b/, /\bbenefit\b/, /\bauction\b/] },
  { key: "festival", label: "festival", patterns: [/\bfestival\b/, /\bfair\b/, /\bmarket\b/] },
  { key: "corporate", label: "corporate event", patterns: [/\bcorporate\b/, /\bcompany\b/, /\bbusiness event\b/, /\boffsite\b/, /\bconference\b/] },
  { key: "graduation", label: "graduation", patterns: [/\bgraduation\b/, /\bgrad party\b/] },
  { key: "reunion", label: "reunion", patterns: [/\breunion\b/, /\bfamily reunion\b/] },
  { key: "community", label: "community event", patterns: [/\bcommunity\b/, /\bneighborhood\b/, /\bblock party\b/] },
  { key: "party", label: "party", patterns: [/\bparty\b/, /\bget[\s-]?together\b/, /\bcelebration\b/] },
  { key: "private", label: "private event", patterns: [/\bprivate event\b/] },
];

const LOCATION_TYPES: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  { key: "backyard", label: "backyard", patterns: [/\bbackyard\b/, /\bback yard\b/, /\bmy yard\b/, /\bat home\b/] },
  { key: "beach", label: "beach", patterns: [/\bbeach\b/, /\bsand\b/, /\bocean\b/, /\bshore\b/, /\bseaside\b/, /\bcoast\b/] },
  { key: "park", label: "park", patterns: [/\bpark\b/] },
  { key: "venue", label: "venue", patterns: [/\bvenue\b/, /\bhall\b/, /\bballroom\b/] },
  { key: "field", label: "field", patterns: [/\bfield\b/, /\bmeadow\b/, /\bpasture\b/, /\bopen field\b/] },
  { key: "business", label: "business location", patterns: [/\bbusiness\b/, /\boffice\b/, /\bparking lot\b/] },
  { key: "school", label: "school", patterns: [/\bschool\b/, /\bcampus\b/] },
  { key: "church", label: "church", patterns: [/\bchurch\b/, /\bchapel\b/] },
  { key: "outdoor", label: "outdoor space", patterns: [/\boutdoor\b/, /\boutside\b/] },
  { key: "indoor", label: "indoor space", patterns: [/\bindoor\b/, /\binside\b/] },
];

const SETUP_NEEDS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "tables",        patterns: [/\btables?\b/] },
  { label: "chairs",        patterns: [/\bchairs?\b/, /\bseating\b/] },
  { label: "seated guests", patterns: [/\bseated\b/, /\bsit[\s-]?down\b/] },
  { label: "standing room", patterns: [/\bstanding\b/, /\bcocktail style\b/] },
  { label: "a dance floor", patterns: [/\bdance floor\b/, /\bdancing\b/] },
  { label: "a DJ",          patterns: [/\bdj\b/] },
  { label: "a live band",   patterns: [/\bband\b/, /\blive music\b/] },
  { label: "a bar",         patterns: [/\bbar\b/, /\bbartender\b/] },
  { label: "a buffet",      patterns: [/\bbuffet\b/] },
  { label: "food service",  patterns: [/\bfood\b/, /\bcatering\b/, /\bcaterer\b/, /\bdinner\b/, /\bmeal\b/] },
  { label: "a stage",       patterns: [/\bstage\b/, /\bplatform\b/] },
  { label: "lighting",      patterns: [/\blighting\b/, /\bstring lights?\b/] },
  { label: "sidewalls",     patterns: [/\bsidewalls?\b/, /\btent walls?\b/] },
  { label: "heaters",       patterns: [/\bheaters?\b/, /\bpatio heat\b/] },
];

const SURFACE_WEATHER: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "grass",    patterns: [/\bgrass\b/, /\blawn\b/] },
  { label: "sand",     patterns: [/\bsand\b/, /\bsandy\b/] },
  { label: "concrete", patterns: [/\bconcrete\b/, /\bpavement\b/] },
  { label: "asphalt",  patterns: [/\basphalt\b/, /\bblacktop\b/, /\bparking lot\b/] },
  { label: "coastal exposure", patterns: [/\bbeach\b/, /\bcoast\b/, /\bcoastal\b/, /\boceanfront\b/] },
  { label: "wind",     patterns: [/\bwind(y|s)?\b/, /\bgusty\b/] },
  { label: "rain",     patterns: [/\brain(y)?\b/, /\bshowers?\b/, /\bstorm\b/] },
  { label: "exposed conditions", patterns: [/\bexposed\b/] },
];

function firstMatch<T extends { patterns: RegExp[] }>(
  list: T[],
  text: string,
): T | undefined {
  return list.find((entry) => entry.patterns.some((re) => re.test(text)));
}

function allMatches<T extends { label: string; patterns: RegExp[] }>(
  list: T[],
  text: string,
): string[] {
  const found = new Set<string>();
  for (const entry of list) {
    if (entry.patterns.some((re) => re.test(text))) found.add(entry.label);
  }
  return [...found];
}

/* ───────────────────── Intent resolution ───────────────────── */

function resolveIntent(text: string, slots: {
  eventTypeKey?: string;
  locationKey?: string;
  guestCount?: GuestRange;
}): ScriptedIntent {
  const t = text.toLowerCase();

  // Direct intent keywords
  if (/(\bquote\b|\bprice\b|\bpricing\b|\bestimate\b|\bcost\b|how much)/.test(t)) return "quote_request";
  if (/(saved plan|my plan|my recommendation|saved recommendation|pdf|download)/.test(t)) return "saved_plans";
  if (/(\bcontact\b|\bcall\b|\bphone\b|\bemail\b|talk to|speak to|human|someone)/.test(t)) return "contact";
  if (/(what (do|have) you|rentals?|inventory|equipment|do you (have|rent|offer))/.test(t)) return "inventory";
  if (/(what size|how big|tent size|size of tent)/.test(t)) return "tent_size";

  // Slot-driven intents
  if (slots.locationKey === "beach") return "beach_event";
  if (slots.eventTypeKey === "wedding") return "wedding";
  if (slots.eventTypeKey === "fundraiser") return "fundraiser";
  if (slots.locationKey === "backyard" && (slots.eventTypeKey === "party" || slots.eventTypeKey === "backyard_party" || slots.eventTypeKey === "birthday")) {
    return "backyard_party";
  }
  if (slots.eventTypeKey && slots.guestCount) return "generic_event_with_guests";
  if (slots.guestCount) return "generic_event_with_guests";
  if (slots.eventTypeKey) return "generic_event";

  return "unknown";
}

/* ───────────────────── Parser ───────────────────── */

export function parseUserMessage(raw: string): ParsedMessage {
  const text = raw.toLowerCase();
  const eventType = firstMatch(EVENT_TYPES, text);
  const location = firstMatch(LOCATION_TYPES, text);
  const guestCount = extractGuestCount(raw);
  const setupNeeds = allMatches(SETUP_NEEDS, text);
  const surfaceWeather = allMatches(SURFACE_WEATHER, text);

  const intent = resolveIntent(text, {
    eventTypeKey: eventType?.key,
    locationKey: location?.key,
    guestCount,
  });

  return {
    raw,
    intent,
    eventType: eventType?.label,
    locationType: location?.label,
    guestCount,
    setupNeeds,
    surfaceWeather,
  };
}

/* ───────────────────── Action presets ───────────────────── */

const A = {
  planner:    { label: "Start AI Tent Planner",   to: "/ai-tent-planner" } as ChatAction,
  beachPlan:  { label: "Plan a Beach Event",      to: "/ai-tent-planner" } as ChatAction,
  weddingPlan:{ label: "Start Wedding Plan",      to: "/ai-tent-planner" } as ChatAction,
  findSize:   { label: "Find My Tent Size",       to: "/ai-tent-planner" } as ChatAction,
  quote:      { label: "Request a Quote",         to: "/contact" } as ChatAction,
  rentals:    { label: "View Rentals",            to: "/inventory" } as ChatAction,
  account:    { label: "View My Plans",           to: "/account" } as ChatAction,
  contact:    { label: "Contact Us",              to: "/contact" } as ChatAction,
  call:       { label: "Call Us",                 href: "tel:+13602253600" } as ChatAction,
};

/* ───────────────────── Helpers ───────────────────── */

function joinNatural(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function guestPhrase(g?: GuestRange): string {
  if (!g) return "your guest count";
  if (g.raw.includes("under")) return `${g.raw} guests`;
  if (g.raw.includes("+")) return `${g.raw} guests`;
  if (g.raw.includes("around")) return `${g.raw} guests`;
  return `${g.raw} people`;
}

function relevantFactorsFor(parsed: ParsedMessage): string {
  const factors = parsed.setupNeeds.length
    ? parsed.setupNeeds.slice(0, 4)
    : ["seating style", "food service", "dancing or staging", "weather protection"];
  return joinNatural(factors);
}

/* ───────────────────── Templates ───────────────────── */

export function generateScriptedResponse(parsed: ParsedMessage): ScriptedResponse {
  const { intent, eventType, locationType, guestCount } = parsed;
  const factors = relevantFactorsFor(parsed);
  const guests = guestPhrase(guestCount);

  switch (intent) {
    case "backyard_party": {
      const evt = eventType ?? "backyard party";
      const lead = guestCount
        ? `That sounds great — a ${evt} for ${guests} in your backyard is exactly the kind of setup we can help you think through.`
        : `That sounds great — a backyard ${evt} is exactly the kind of setup we can help you think through.`;
      return {
        text:
`${lead}

For that guest count, the right tent size depends on ${factors}. A backyard setup also depends on the surface, available space, and access for setup.

The fastest next step is to use the AI Tent Planner so it can build a starting tent recommendation, equipment checklist, and blueprint-style layout for your party.`,
        actions: [A.planner, A.quote],
      };
    }

    case "wedding": {
      const lead = guestCount
        ? `Congratulations — a wedding for ${guests} is a beautiful event to start planning.`
        : `Congratulations — we can definitely help you start thinking through a wedding setup.`;
      return {
        text:
`${lead}

For weddings, it's usually best to plan for more than just guest seating. You may need room for dining, dancing, a bar, DJ or band, ceremony space, buffet, gift table, and comfortable guest flow. The AI Tent Planner can help create a starting layout and equipment checklist based on your guest count and venue.`,
        actions: [A.weddingPlan, A.quote],
      };
    }

    case "fundraiser": {
      const lead = guestCount
        ? `That sounds like a great event — a fundraiser for ${guests} usually needs a layout that supports both gathering and movement.`
        : `That sounds like a great event — fundraisers often need a layout that supports both gathering and movement.`;
      return {
        text:
`${lead}

Depending on your guest count, you may want space for seating, mingling, a speaker area, registration table, silent auction, buffet, bar, or small stage. The AI Tent Planner can help turn those details into a recommended setup and blueprint-style layout.`,
        actions: [A.planner, A.quote],
      };
    }

    case "beach_event": {
      const evtPart = eventType ? `${eventType} ` : "";
      const guestsPart = guestCount ? ` for ${guests}` : "";
      const lead = `A beach ${evtPart}event${guestsPart} can be beautiful, but it does need a little extra planning.`;
      return {
        text:
`${lead}

For sand and coastal wind, the setup may need proper anchoring, water barrels, sidewalls, and cleaning considerations. Tent size also depends on guest count, seating, food service, and whether there will be dancing or staging.

The best next step is to use the AI Tent Planner or request a quote so the team can review the surface and weather exposure.`,
        actions: [A.beachPlan, A.quote],
      };
    }

    case "tent_size": {
      const lead = guestCount
        ? `Great question — for ${guests}, tent size depends on more than just guest count.`
        : `Great question — tent size depends on more than just guest count.`;
      return {
        text:
`${lead}

The biggest factors are whether guests are seated or standing, whether food is served under the tent, whether you need dancing, a DJ, stage, bar, buffet, or extra walking space. If you tell the AI Tent Planner those details, it can create a more useful starting recommendation than a simple size chart.`,
        actions: [A.findSize, A.quote],
      };
    }

    case "inventory": {
      return {
        text:
`Absolutely, we can help with that — here's what most events draw from.

We can cover the core pieces most events need: tents, tables, chairs, sidewalls, anchoring, dance floor sections, staging, PA system, portable bar, food-service items, delivery, setup, and breakdown.

Availability depends on your event date and location, so the best next step is to request a quote or use the planner to build a starting setup.`,
        actions: [A.rentals, A.planner, A.quote],
      };
    }

    case "quote_request": {
      const restate = eventType || guestCount
        ? `Happy to help — for ${eventType ?? "your event"}${guestCount ? ` with ${guests}` : ""}, a final quote comes from the team after they review your setup.`
        : `Happy to help — a final quote comes from the team after they review your setup.`;
      return {
        text:
`${restate}

The fastest way to get a strong starting point is to use the AI Tent Planner so it can build a recommended setup, then submit a quote request. Pricing and availability depend on your date and location, so the team can review and confirm.`,
        actions: [A.quote, A.planner],
      };
    }

    case "saved_plans": {
      return {
        text:
`You can find your saved plans in your account. Each plan keeps the tent recommendation, equipment checklist, and blueprint-style layout you generated.

From there you can open a plan, download it, or send it over as the starting point for a quote request.`,
        actions: [A.account, A.quote],
      };
    }

    case "contact": {
      return {
        text:
`Of course — you can reach the team by phone or through the contact form, and we'll get back to you about your event.`,
        actions: [A.call, A.contact],
      };
    }

    case "generic_event_with_guests": {
      const lead = eventType
        ? `Nice — a ${eventType} for ${guests} gives us a solid starting point.`
        : `Nice — an event for ${guests} gives us a good starting point.`;
      const locLine = locationType
        ? ` You mentioned a ${locationType} setup, which helps shape the recommendation.`
        : ` The next things that matter are where the event will be held, whether guests will be seated or standing, and whether you need food service, dancing, staging, or weather protection.`;
      return {
        text:
`${lead}${locLine}

The AI Tent Planner can walk you through those details and create a recommended setup, equipment checklist, and starting layout.`,
        actions: [A.planner, A.quote],
      };
    }

    case "generic_event": {
      const lead = eventType
        ? `That sounds like a great event — a ${eventType} is something we can definitely help you think through.`
        : `That sounds like a great event — happy to help you think it through.`;
      return {
        text:
`${lead}

To give you a strong starting point, it helps to know guest count, location, and whether guests will be seated, standing, eating, or dancing. The AI Tent Planner can walk through those details and build a recommended setup.`,
        actions: [A.planner, A.quote],
      };
    }

    case "unknown":
    default:
      return {
        text:
`I can help with tent sizes, rentals, beach setups, saved plans, and quote requests.

The easiest way to get a useful answer is to tell me your event type, guest count, location, and whether guests will be seated, standing, eating, or dancing.`,
        actions: [A.planner, A.quote, A.contact],
      };
  }
}

/* ───────────────────── Quick-start shortcut ───────────────────── */

export function respondByIntent(intent: ScriptedIntent): ScriptedResponse {
  // Minimal parsed message that triggers the matching template directly.
  return generateScriptedResponse({
    raw: "",
    intent,
    setupNeeds: [],
    surfaceWeather: [],
  });
}
