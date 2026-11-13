import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout } from "@/components/SiteLayout";
import { Lightbox, type LightboxImage } from "@/components/Lightbox";
import { BeaconQuoteModal } from "@/components/BeaconQuoteModal";
import { VirtualTour } from "@/components/VirtualTour/VirtualTour";
import beaconHeroAsset from "@/assets/beacon-hero.jpg.asset.json";
import bridalLoungeAsset from "@/assets/bridal/bridal-lounge.jpg.asset.json";
import bridalLoungeIntoPrepRoomAsset from "@/assets/bridal/bridal-lounge-into-prep-room.jpg.asset.json";
import bridalDressingRoomAsset from "@/assets/bridal/bridal-dressing-room.jpg.asset.json";
import bridalVanityStationsAsset from "@/assets/bridal/bridal-vanity-stations.jpg.asset.json";
import bridalSuiteTourAsset from "@/assets/bridal/bridal-suite-tour.mp4.asset.json";
import bridalSuiteTourPosterAsset from "@/assets/bridal/bridal-suite-tour-poster.jpg.asset.json";

import {
  MapPin,
  Users,
  Ruler,
  Accessibility,
  Thermometer,
  CalendarDays,
  Sparkles,
  Phone,
  ArrowRight,
  Check,
  Sofa,
  Bath,
} from "lucide-react";

// Eagerly import all Beacon photo CDN pointers
const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const photoUrls: string[] = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.url);

const heroPhoto = beaconHeroAsset.url;
const galleryPhotos = photoUrls;

// Beacon Bridal Suite — add-on space, kept out of the "Inside the hall" gallery.
const bridalPhotos = [
  {
    url: bridalLoungeIntoPrepRoomAsset.url,
    alt: "Beacon Bridal Suite living room with an open doorway into the getting-ready room",
    caption: "Living room opening into the getting-ready room",
  },
  {
    url: bridalLoungeAsset.url,
    alt: "Beacon Bridal Suite living room with sofa, armchairs, and a refreshment credenza",
    caption: "Sofa, armchairs & refreshment station",
  },
  {
    url: bridalDressingRoomAsset.url,
    alt: "Beacon Bridal Suite dressing room with wall mirrors, accent chairs, and a gown rack",
    caption: "Dressing room with mirrors & gown rack",
  },
  {
    url: bridalVanityStationsAsset.url,
    alt: "Beacon Bridal Suite vanity stations with mirrors, lamps, and seating",
    caption: "Getting-ready vanity stations",
  },
];

const bridalFeatureIcons = [Sofa, Sparkles, Bath] as const;

export const Route = createFileRoute("/beacon-on-broadway")({
  head: () => ({
    meta: [
      { title: "Beacon on Broadway | Pacific North Events & Tents" },
      {
        name: "description",
        content:
          "Beacon on Broadway is a 2,800 sq ft event venue in downtown Seaside, Oregon — a beautifully restored historic space owned and operated by Pacific North Events & Tents.",
      },
    ],
  }),
  component: BeaconPage,
});

const factIcons = [
  { key: "capacity", icon: Users },
  { key: "space", icon: Ruler },
  { key: "access", icon: Accessibility },
  { key: "climate", icon: Thermometer },
] as const;

function BeaconPage() {
  const { t } = useTranslation();
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [bridalLbIndex, setBridalLbIndex] = useState<number | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const lbImages: LightboxImage[] = galleryPhotos.map((url, i) => ({
    url,
    alt: `Beacon on Broadway — photo ${i + 1}`,
  }));
  const bridalLbImages: LightboxImage[] = bridalPhotos.map((p) => ({
    url: p.url,
    alt: p.alt,
  }));

  const included = t("beacon.included.items", { returnObjects: true }) as string[];
  const bridalFeatures = t("beacon.bridal.features", { returnObjects: true }) as string[];

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <img
          src={heroPhoto}
          alt="Beacon on Broadway event hall in Seaside, Oregon"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/55 to-primary/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">
            {t("beacon.hero.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-6xl">
            {t("beacon.hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            {t("beacon.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:brightness-105"
            >
              {t("beacon.hero.requestQuote")} <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="tel:5037175088"
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/5 px-6 py-3 text-sm font-medium text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/10"
            >
              <Phone className="h-4 w-4" /> 503-717-5088
            </a>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-primary-foreground/80">
            <MapPin className="h-4 w-4 text-[color:var(--gold)]" />
            {t("beacon.hero.address")}
          </div>
        </div>
      </section>

      {/* Fact strip */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-none bg-border/60 px-0 sm:grid-cols-4 lg:px-0">
          {factIcons.map((f) => (
            <div
              key={f.key}
              className="flex items-center gap-3 bg-background px-5 py-6 sm:px-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--sand-soft)] text-[color:var(--forest)]">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t(`beacon.facts.${f.key}.label`)}
                </p>
                <p className="text-sm font-medium text-primary">{t(`beacon.facts.${f.key}.value`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
          {t("beacon.story.eyebrow")}
        </p>
        <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">
          {t("beacon.story.title")}
        </h2>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>{t("beacon.story.body1")}</p>
          <p>{t("beacon.story.body2")}</p>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-[color:var(--sand-soft)]/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
              {t("beacon.included.eyebrow")}
            </p>
            <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
              {t("beacon.included.title")}
            </h2>
            <p className="mt-5 text-muted-foreground">{t("beacon.included.body")}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {included.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm text-foreground shadow-sm"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[color:var(--forest)]/10 text-[color:var(--forest)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
          {t("beacon.pricing.eyebrow")}
        </p>
        <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
          {t("beacon.pricing.title")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PriceCard
            badge={t("beacon.pricing.offSeason.badge")}
            window={t("beacon.pricing.offSeason.window")}
            priceOneDay={t("beacon.pricing.offSeason.priceOneDay")}
            priceTwoDay={t("beacon.pricing.offSeason.priceTwoDay")}
            oneDayLabel={t("beacon.pricing.perDay")}
            twoDayLabel={t("beacon.pricing.perTwoDay")}
            note={t("beacon.pricing.offSeason.note")}
          />
          <PriceCard
            badge={t("beacon.pricing.peakWeekday.badge")}
            window={t("beacon.pricing.peakWeekday.window")}
            priceOneDay={t("beacon.pricing.peakWeekday.priceOneDay")}
            priceTwoDay={t("beacon.pricing.peakWeekday.priceTwoDay")}
            oneDayLabel={t("beacon.pricing.perDay")}
            twoDayLabel={t("beacon.pricing.perTwoDay")}
            note={t("beacon.pricing.peakWeekday.note")}
          />
          <PriceCard
            badge={t("beacon.pricing.peakWeekend.badge")}
            window={t("beacon.pricing.peakWeekend.window")}
            priceOneDay={t("beacon.pricing.peakWeekend.priceOneDay")}
            priceTwoDay={t("beacon.pricing.peakWeekend.priceTwoDay")}
            oneDayLabel={t("beacon.pricing.perDay")}
            twoDayLabel={t("beacon.pricing.perTwoDay")}
            note={t("beacon.pricing.peakWeekend.note")}
            highlight
          />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">{t("beacon.pricing.note")}</p>
      </section>

      {/* 360° Virtual Tour */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 lg:px-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
              Step inside
            </p>
            <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
              Take a 360° tour
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Walk through the hall from your screen — drag to look around, switch between viewpoints to see every corner.
            </p>
          </div>
          <VirtualTour />
        </div>
      </section>

      {/* Beacon Bridal Suite — available as an add-on */}
      <section className="border-y border-border/60 bg-gradient-to-b from-[color:var(--sand-soft)]/70 via-background to-background">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
                {t("beacon.bridal.eyebrow")}
              </p>
              <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">
                {t("beacon.bridal.title")}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                {t("beacon.bridal.intro")}
              </p>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("beacon.bridal.featuresTitle")}
              </p>
              <ul className="mt-4 grid gap-3">
                {bridalFeatures.map((item, i) => {
                  const Icon = bridalFeatureIcons[i] ?? Check;
                  return (
                    <li
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-4 text-sm text-foreground shadow-sm"
                    >
                      <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[color:var(--forest)]/10 text-[color:var(--forest)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-6 text-muted-foreground">{t("beacon.bridal.body")}</p>
              <p className="mt-4 font-serif text-xl italic leading-relaxed text-primary">
                {t("beacon.bridal.closing")}
              </p>

              <button
                type="button"
                onClick={() => setQuoteOpen(true)}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:brightness-105"
              >
                {t("beacon.bridal.cta")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setBridalLbIndex(0)}
                aria-label={bridalPhotos[0].caption}
                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-secondary shadow-sm"
              >
                <img
                  src={bridalPhotos[0].url}
                  alt={bridalPhotos[0].alt}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </button>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {bridalPhotos.slice(1).map((p, i) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => setBridalLbIndex(i + 1)}
                    aria-label={p.caption}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-secondary"
                  >
                    <img
                      src={p.url}
                      alt={p.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>

              <figure className="mt-6">
                <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-secondary shadow-sm">
                  <video
                    src={bridalSuiteTourAsset.url}
                    poster={bridalSuiteTourPosterAsset.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-[9/16] w-full"
                  />
                </div>
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                  {t("beacon.bridal.videoCaption")}
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
                {t("beacon.gallery.eyebrow")}
              </p>
              <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
                {t("beacon.gallery.title")}
              </h2>
            </div>
            <Sparkles className="hidden h-6 w-6 text-[color:var(--gold)] sm:block" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {galleryPhotos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLbIndex(i)}
                className="group relative aspect-square overflow-hidden rounded-xl bg-secondary"
              >
                <img
                  src={url}
                  alt={`Beacon on Broadway — photo ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Location & CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">
              {t("beacon.visit.eyebrow")}
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
              {t("beacon.visit.title")}
            </h2>
            <p className="mt-5 text-primary-foreground/85">{t("beacon.visit.body")}</p>
            <div className="mt-6 space-y-3 text-sm">
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[color:var(--gold)]" />
                {t("beacon.hero.address")}
              </p>
              <p className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-[color:var(--gold)]" />
                <a href="tel:5037175088" className="hover:underline">
                  503-717-5088
                </a>
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[color:var(--gold)]" />
                {t("beacon.visit.tours")}
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-primary-foreground/5 p-8 ring-1 ring-primary-foreground/15">
            <h3 className="font-serif text-2xl">{t("beacon.cta.title")}</h3>
            <p className="mt-3 text-sm text-primary-foreground/80">{t("beacon.cta.body")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setQuoteOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:brightness-105"
              >
                {t("beacon.hero.requestQuote")} <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                {t("beacon.cta.contact")}
              </Link>
            </div>
          </div>
        </div>
      </section>


      <Lightbox
        images={lbImages}
        index={lbIndex}
        onClose={() => setLbIndex(null)}
        onIndexChange={setLbIndex}
      />
      <Lightbox
        images={bridalLbImages}
        index={bridalLbIndex}
        onClose={() => setBridalLbIndex(null)}
        onIndexChange={setBridalLbIndex}
      />
      <BeaconQuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </SiteLayout>
  );
}


function PriceCard({
  badge,
  window,
  priceOneDay,
  priceTwoDay,
  oneDayLabel,
  twoDayLabel,
  note,
  highlight,
}: {
  badge: string;
  window: string;
  priceOneDay: string;
  priceTwoDay: string;
  oneDayLabel: string;
  twoDayLabel: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "relative rounded-3xl border p-7 shadow-sm transition " +
        (highlight
          ? "border-[color:var(--gold)] bg-gradient-to-br from-[color:var(--sand-soft)] to-background"
          : "border-border/60 bg-background")
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--forest)]">
        {badge}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{window}</p>
      <div className="mt-6 space-y-3">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {oneDayLabel}
          </span>
          <span className="font-serif text-3xl text-primary">{priceOneDay}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {twoDayLabel}
          </span>
          <span className="font-serif text-3xl text-primary">{priceTwoDay}</span>
        </div>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
