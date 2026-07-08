import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { Lightbox, useLightbox } from "@/components/Lightbox";
import { LazyImage } from "@/components/LazyImage";
import {
  gallerySetups,
  galleryEquipment,
  galleryFurniture,
  galleryBlueprints,
  pickPhoto,
  type SiteImage,
} from "@/lib/site-images";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Event Inspiration Gallery | Pacific North Events & Tents" },
      { name: "description", content: "Browse tent setups, bar and equipment, furniture, and floor-plan blueprints from Pacific North Events & Tents." },
      { property: "og:title", content: "Event Inspiration Gallery | Pacific North Events & Tents" },
      { property: "og:description", content: "Photos of tent setups, bar equipment, furniture, and floor plans from Oregon Coast events." },
      { property: "og:url", content: "https://pacificnorthrentals.com/gallery" },
    ],
    links: [{ rel: "canonical", href: "https://pacificnorthrentals.com/gallery" }],
  }),
  component: GalleryPage,
});

type CategoryKey = "all" | "setups" | "equipment" | "furniture" | "blueprints";

type CategorySection = {
  key: Exclude<CategoryKey, "all">;
  label: string;
  description: string;
  items: SiteImage[];
};

const SECTIONS: CategorySection[] = [
  {
    key: "setups",
    label: "Event Setups",
    description: "Past events with tents up, tables dressed, and the lights on.",
    items: gallerySetups,
  },
  {
    key: "equipment",
    label: "Bar & Equipment",
    description: "Portable bars, fill-and-chill, heaters, speakers, and other gear.",
    items: galleryEquipment,
  },
  {
    key: "furniture",
    label: "Tables & Chairs",
    description: "Folding chairs and tables available for any setup.",
    items: galleryFurniture,
  },
  {
    key: "blueprints",
    label: "Blueprints & Floor Plans",
    description: "Hand-drawn layouts showing tent, table, and dance-floor options.",
    items: galleryBlueprints,
  },
];

const FILTERS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  ...SECTIONS.map((s) => ({ key: s.key as CategoryKey, label: s.label })),
];

function GalleryPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<CategoryKey>("all");
  const hero = pickPhoto("gallery-hero");
  const lb = useLightbox();

  const visibleSections = useMemo(
    () => (filter === "all" ? SECTIONS : SECTIONS.filter((s) => s.key === filter)),
    [filter],
  );

  // Flattened list drives the lightbox so indices stay aligned with what's shown.
  const flat = useMemo(
    () => visibleSections.flatMap((s) => s.items),
    [visibleSections],
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("gallery.hero.eyebrow")}
        title={t("gallery.hero.title")}
        subtitle={t("gallery.hero.subtitle")}
        image={hero.url}
      />
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-16">
          {visibleSections.map((section) => {
            const offset = flat.indexOf(section.items[0]);
            return (
              <div key={section.key}>
                <header className="mb-6">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {section.label}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </header>
                <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                  {section.items.map((it, i) => (
                    <figure
                      key={it.file}
                      className="mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-card shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => lb.open(offset + i)}
                        className="block w-full"
                        aria-label={`Open image: ${it.alt}`}
                      >
                        <LazyImage
                          src={it.url}
                          alt={it.alt}
                          className="cursor-zoom-in transition-transform duration-700 hover:scale-105"
                        />
                      </button>
                      <figcaption className="px-4 py-3 text-xs text-muted-foreground">
                        {it.caption ?? it.alt}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Lightbox images={flat} index={lb.index} onClose={lb.close} onIndexChange={lb.setIndex} />
      <CTASection />
    </SiteLayout>
  );
}
