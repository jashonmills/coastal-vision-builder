import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { Lightbox, useLightbox } from "@/components/Lightbox";
import { photoImages, pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Event Inspiration Gallery | Pacific North Events & Tents" },
      { name: "description", content: "Browse tent setups, outdoor gatherings, and coastal event inspiration from Pacific North Events & Tents." },
    ],
  }),
  component: GalleryPage,
});

const FILTERS = ["All", "Coastal Setups", "Reception", "Lighting"] as const;
type Filter = typeof FILTERS[number];

// Filter heuristic uses alt text keywords so we don't need to retag every photo.
function tagsFor(alt: string): Filter[] {
  const a = alt.toLowerCase();
  const tags: Filter[] = [];
  if (/(coast|beach|ocean|sunset|golden|twilight|dusk)/.test(a)) tags.push("Coastal Setups");
  if (/(reception|wedding|dining|banquet|ceremony|party|interior|table|chandelier|floral)/.test(a)) tags.push("Reception");
  if (/(light|lit|string|warm|bistro|evening|night|dusk|twilight)/.test(a)) tags.push("Lighting");
  return tags;
}

function GalleryPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const hero = pickPhoto("gallery-hero");
  const lb = useLightbox();

  const shown = filter === "All"
    ? photoImages
    : photoImages.filter((img) => tagsFor(img.alt).includes(filter));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Gallery"
        title="Event Inspiration Gallery"
        subtitle="Browse tent setups, outdoor gatherings, and coastal event inspiration."
        image={hero.url}
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
          {shown.map((it) => (
            <figure key={it.file} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-card shadow-sm">
              <img src={it.url} alt={it.alt} loading="lazy" className="h-auto w-full transition-transform duration-700 hover:scale-105" />
              <figcaption className="px-4 py-3 text-xs text-muted-foreground">{it.alt}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
