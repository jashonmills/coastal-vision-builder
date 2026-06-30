import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { Lightbox, type LightboxImage } from "@/components/Lightbox";
import { BeaconQuoteModal } from "@/components/BeaconQuoteModal";

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
} from "lucide-react";

// Eagerly import all Beacon photo CDN pointers
const photoModules = import.meta.glob("@/assets/beacon/*.jpg.asset.json", {
  eager: true,
  import: "default",
}) as Record<string, { url: string }>;

const photoUrls: string[] = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => mod.url);

const heroPhoto = photoUrls[11] ?? photoUrls[0];
const galleryPhotos = photoUrls;

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

const facts: { icon: typeof Users; label: string; value: string }[] = [
  { icon: Users, label: "Capacity", value: "Up to 150 guests" },
  { icon: Ruler, label: "Space", value: "2,800 sq ft" },
  { icon: Accessibility, label: "Access", value: "Elevator & ADA" },
  { icon: Thermometer, label: "Climate", value: "Heat & A/C" },
];

const included: string[] = [
  "150 black padded chairs",
  "(10) 6 ft round tables",
  "(10) 5 ft round tables",
  "(2) 8 ft banquet tables",
  "Built-in bar & prep area",
  "Sound system ready",
  "On-site setup support",
  "Flexible floor plan",
];

function BeaconPage() {
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const lbImages: LightboxImage[] = galleryPhotos.map((url, i) => ({
    url,
    alt: `Beacon on Broadway — photo ${i + 1}`,
  }));


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
            Our Venue · Seaside, Oregon
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.05] sm:text-6xl">
            Beacon on Broadway
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            A beautifully restored 2,800 sq ft event hall in the heart of
            downtown Seaside — owned and operated by Pacific North Events &
            Tents. Weddings, receptions, corporate gatherings, and celebrations
            of every kind find a home here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setQuoteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:brightness-105"
            >
              Request a Quote <ArrowRight className="h-4 w-4" />
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
            735 Broadway, Seaside, OR 97138
          </div>
        </div>
      </section>

      {/* Fact strip */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-none bg-border/60 px-0 sm:grid-cols-4 lg:px-0">
          {facts.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 bg-background px-5 py-6 sm:px-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--sand-soft)] text-[color:var(--forest)]">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {f.label}
                </p>
                <p className="text-sm font-medium text-primary">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
          The Story
        </p>
        <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">
          A landmark space, lovingly restored
        </h2>
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>
            Beacon on Broadway sits in one of Seaside's most recognizable
            buildings — a historic downtown structure that has anchored
            Broadway for generations. We restored the upstairs hall into a warm
            and flexible event space that feels both classic and current:
            original architectural lines, soft modern lighting, and an open
            floor that can shift from intimate dinner to dance-floor in an
            evening.
          </p>
          <p>
            Because the venue is owned and run by Pacific North Events &
            Tents, every booking comes with the same team that handles our
            tents, tables, linens, and coordination across the Oregon Coast.
            Add what you need, leave what you don't, and we'll make it work in
            the room.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="bg-[color:var(--sand-soft)]/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
              Included with every booking
            </p>
            <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
              Furnished, climate-controlled, ready to host
            </h2>
            <p className="mt-5 text-muted-foreground">
              The hall comes set with chairs, tables, climate control, and
              elevator access — so most events arrive, decorate, and celebrate
              without renting a single extra piece. Need linens, lighting, or
              a bar package? We'll add it from our in-house inventory.
            </p>
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
          Pricing
        </p>
        <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
          Simple, seasonal rates
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <PriceCard
            badge="Off-Season"
            window="October – February"
            price="$500"
            unit="/ day"
            note="Any day of the week"
          />
          <PriceCard
            badge="Peak Weekday"
            window="March – September"
            price="$500"
            unit="/ day"
            note="Monday – Thursday"
          />
          <PriceCard
            badge="Peak Weekend"
            window="March – September"
            price="$1,500"
            unit="/ weekend"
            note="Fri–Sat or Sat–Sun"
            highlight
          />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Rates are starting points for the venue only. Add-on rentals,
          staffing, and custom packages quoted on request.
        </p>
      </section>

      {/* Gallery */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">
                Gallery
              </p>
              <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">
                Inside the hall
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
              Visit
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
              Downtown Seaside, steps from the Prom
            </h2>
            <p className="mt-5 text-primary-foreground/85">
              Beacon on Broadway is right on Broadway, the main artery
              connecting downtown Seaside to the beach. Walkable hotels,
              restaurants, and parking surround the venue — perfect for guests
              traveling in for the weekend.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[color:var(--gold)]" />
                735 Broadway, Seaside, OR 97138
              </p>
              <p className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-[color:var(--gold)]" />
                <a href="tel:5037175088" className="hover:underline">
                  503-717-5088
                </a>
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[color:var(--gold)]" />
                Tours by appointment
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-primary-foreground/5 p-8 ring-1 ring-primary-foreground/15">
            <h3 className="font-serif text-2xl">Plan your event at Beacon</h3>
            <p className="mt-3 text-sm text-primary-foreground/80">
              Tell us your date, headcount, and vibe. We'll come back with
              availability, a venue hold, and a full quote including any
              rentals you need.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-primary shadow-sm transition hover:brightness-105"
              >
                Request a Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                Contact Us
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
    </SiteLayout>
  );
}

function PriceCard({
  badge,
  window,
  price,
  unit,
  note,
  highlight,
}: {
  badge: string;
  window: string;
  price: string;
  unit: string;
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
      <div className="mt-6 flex items-baseline gap-2">
        <span className="font-serif text-4xl text-primary">{price}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
