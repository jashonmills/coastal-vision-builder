// Registry of editable content slots used across the site.
// Add a new slot here and drop <EditableText slot="..."> in the JSX.

export type TextSlot = {
  key: string;
  label: string;
  multiline?: boolean;
  default: string;
};

export type ImageSlot = {
  key: string;
  label: string;
  default?: string;
};

export const TEXT_SLOTS: TextSlot[] = [
  { key: "home.hero.eyebrow", label: "Home — Hero eyebrow", default: "Oregon Coast Event Rentals" },
  { key: "home.hero.title", label: "Home — Hero title", default: "Event Tents & Rentals for Oregon Coast Celebrations" },
  { key: "home.hero.subtitle", label: "Home — Hero subtitle", multiline: true, default: "From weddings and festivals to private parties and corporate events, Pacific North Events & Tents helps bring your vision to life with stylish, reliable, weather-ready event rentals." },
  { key: "home.intro.title", label: "Home — Intro title", default: "Your Event. Your Vision. We Make It Happen." },
  { key: "home.intro.body", label: "Home — Intro body", multiline: true, default: "Planning an outdoor event on the Oregon Coast comes with a unique kind of magic — and a unique kind of weather. Pacific North Events & Tents provides high-quality event tents and rental support designed to keep your celebration comfortable, stylish, and stress-free." },
  { key: "gallery.hero.title", label: "Gallery — Hero title", default: "Event Inspiration Gallery" },
  { key: "gallery.hero.subtitle", label: "Gallery — Hero subtitle", multiline: true, default: "Browse tent setups, outdoor gatherings, and coastal event inspiration." },
];

export const IMAGE_SLOTS: ImageSlot[] = [
  { key: "site.logo", label: "Site logo" },
  { key: "home.hero.image", label: "Home — Hero background" },
  { key: "home.evening.image", label: "Home — Weather-ready background" },
  { key: "gallery.hero.image", label: "Gallery — Hero background" },
  { key: "inventory.hero.image", label: "Inventory — Hero background" },
];
