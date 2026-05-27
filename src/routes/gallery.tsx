import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import w from "@/assets/wedding-tent.jpg";
import f from "@/assets/festival-tents.jpg";
import p from "@/assets/private-party.jpg";
import c from "@/assets/corporate-event.jpg";
import co from "@/assets/coastal-reception.jpg";
import e from "@/assets/evening-tent.jpg";
import h from "@/assets/hero-tent.jpg";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Event Inspiration Gallery | Pacific North Events & Tents" },
      { name: "description", content: "Browse tent setups, outdoor gatherings, and coastal event inspiration from Pacific North Events & Tents." },
    ],
  }),
  component: GalleryPage,
});

const FILTERS = ["All", "Weddings", "Festivals", "Private Parties", "Corporate", "Coastal Setups"] as const;
type Filter = typeof FILTERS[number];

const items: { src: string; alt: string; tags: Filter[] }[] = [
  { src: w, alt: "Elegant wedding tent with string lights", tags: ["Weddings"] },
  { src: f, alt: "Large festival tent", tags: ["Festivals"] },
  { src: f, alt: "Vendor booth row", tags: ["Festivals"] },
  { src: p, alt: "Backyard party tent", tags: ["Private Parties"] },
  { src: c, alt: "Corporate outdoor event", tags: ["Corporate"] },
  { src: e, alt: "Rain-ready tent setup", tags: ["Coastal Setups"] },
  { src: co, alt: "Coastal reception tent", tags: ["Weddings", "Coastal Setups"] },
  { src: e, alt: "Evening tent with warm lighting", tags: ["Coastal Setups"] },
  { src: f, alt: "Community market tents", tags: ["Festivals"] },
  { src: h, alt: "Ceremony tent near trees", tags: ["Weddings"] },
  { src: c, alt: "Food service tent", tags: ["Corporate"] },
  { src: h, alt: "Large celebration layout", tags: ["Weddings", "Coastal Setups"] },
];

function GalleryPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const shown = filter === "All" ? items : items.filter((i) => i.tags.includes(filter));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Gallery"
        title="Event Inspiration Gallery"
        subtitle="Browse tent setups, outdoor gatherings, and coastal event inspiration."
        image={co}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {shown.map((it, i) => (
            <figure key={i} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-card shadow-sm">
              <img src={it.src} alt={it.alt} loading="lazy" className="h-auto w-full transition-transform duration-700 hover:scale-105" />
              <figcaption className="px-4 py-3 text-xs text-muted-foreground">{it.alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
