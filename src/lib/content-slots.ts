// Registry of editable content slots used across the site.
// Add a new slot here and drop <EditableText slot="..."> in the JSX.
// Page hero slots (page.hero.eyebrow/title/subtitle) are wired via <PageHero slot="page.hero" />.

export type TextSlot = {
  key: string;
  label: string;
  multiline?: boolean;
  default: string;
  /** Page grouping shown in the admin editor. */
  page: string;
};

export type ImageSlot = {
  key: string;
  label: string;
  default?: string;
  page: string;
};

function heroSlots(prefix: string, page: string, eyebrow: string, title: string, subtitle: string): TextSlot[] {
  return [
    { key: `${prefix}.eyebrow`, label: `${page} — Hero eyebrow`, default: eyebrow, page },
    { key: `${prefix}.title`, label: `${page} — Hero title`, default: title, page },
    { key: `${prefix}.subtitle`, label: `${page} — Hero subtitle`, multiline: true, default: subtitle, page },
  ];
}

export const TEXT_SLOTS: TextSlot[] = [
  // Home
  ...heroSlots("home.hero", "Home",
    "Pacific North Events & Tents",
    "Event Tents & Rentals for Oregon Coast Celebrations",
    "From weddings and festivals to private parties and corporate events, Pacific North Events & Tents helps bring your vision to life with stylish, reliable, weather-ready event rentals."),
  { key: "home.intro.title", label: "Home — Intro title", page: "Home", default: "Your Event. Your Vision. We Make It Happen." },
  { key: "home.intro.body", label: "Home — Intro body", page: "Home", multiline: true, default: "Planning an outdoor event on the Oregon Coast comes with a unique kind of magic — and a unique kind of weather. Pacific North Events & Tents provides high-quality event tents and rental support designed to keep your celebration comfortable, stylish, and stress-free." },

  // Gallery
  ...heroSlots("gallery.hero", "Gallery",
    "Gallery",
    "Event Inspiration Gallery",
    "Browse tent setups, outdoor gatherings, and coastal event inspiration."),

  // Rentals
  ...heroSlots("rentals.hero", "Rentals",
    "Rentals",
    "Tent, Table & Equipment Rentals",
    "Everything you need for a coastal event — tents, tables, chairs, bars, heaters, and lighting."),

  // Inventory
  ...heroSlots("inventory.hero", "Inventory",
    "Inventory",
    "Full Rental Inventory",
    "Browse our complete inventory of event rental equipment."),

  // Catering
  ...heroSlots("catering.hero", "Catering",
    "Catering",
    "Coastal Catering & Bar Service",
    "Buffets, hors d'oeuvres, platters, and bar packages for weddings and events."),

  // Services
  ...heroSlots("services.hero", "Services",
    "Services",
    "Event Services",
    "Delivery, setup, teardown, staffing, and coordination."),

  // Events
  ...heroSlots("events.hero", "Events",
    "Events",
    "Weddings, Parties & Corporate Events",
    "See the kinds of events we help bring to life along the Oregon Coast."),

  // Contact
  ...heroSlots("contact.hero", "Contact",
    "Contact",
    "Get in Touch",
    "Questions about a rental or planning your event? We'd love to hear from you."),

  // About
  ...heroSlots("about.hero", "About",
    "About",
    "About Pacific North Events & Tents",
    "Family-owned, Oregon Coast-based, obsessed with getting your event right."),

  // AI Planner
  ...heroSlots("planner.hero", "AI Planner",
    "AI Planner",
    "AI Tent Planner",
    "Answer a few questions and get a personalized tent, table, and lighting plan."),

  // Virtual Tour
  ...heroSlots("tour.hero", "Virtual Tour",
    "Virtual Tour",
    "Virtual Tour",
    "Step inside the Beacon on Broadway and browse our tent setups from anywhere."),
];

export const IMAGE_SLOTS: ImageSlot[] = [
  { key: "site.logo", label: "Site logo", page: "Global" },
  { key: "home.hero.image", label: "Home — Hero background", page: "Home" },
  { key: "home.evening.image", label: "Home — Weather-ready background", page: "Home" },
  { key: "gallery.hero.image", label: "Gallery — Hero background", page: "Gallery" },
  { key: "inventory.hero.image", label: "Inventory — Hero background", page: "Inventory" },
];

/** Group text slots by their `page` property for the admin editor UI. */
export function groupTextSlotsByPage(): { page: string; slots: TextSlot[] }[] {
  const map = new Map<string, TextSlot[]>();
  for (const s of TEXT_SLOTS) {
    if (!map.has(s.page)) map.set(s.page, []);
    map.get(s.page)!.push(s);
  }
  return Array.from(map.entries()).map(([page, slots]) => ({ page, slots }));
}

/** Group image slots by their `page` property for the admin editor UI. */
export function groupImageSlotsByPage(): { page: string; slots: ImageSlot[] }[] {
  const map = new Map<string, ImageSlot[]>();
  for (const s of IMAGE_SLOTS) {
    if (!map.has(s.page)) map.set(s.page, []);
    map.get(s.page)!.push(s);
  }
  return Array.from(map.entries()).map(([page, slots]) => ({ page, slots }));
}
