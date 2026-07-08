import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, CTASection } from "@/components/SiteLayout";
import { Lightbox, useLightbox } from "@/components/Lightbox";
import { pickPhoto, pickPhotos } from "@/lib/site-images";
import { CloudRain, Sparkles, Tent, Users } from "lucide-react";

const HOME_TITLE = "Oregon Coast Event Tent Rentals & Catering | Pacific North";
const HOME_DESC = "Weather-ready event tent rentals, catering, and setup on the Oregon Coast — weddings, festivals, private parties, and corporate events.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: "https://pacificnorthrentals.com/" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESC },
    ],
    links: [{ rel: "canonical", href: "https://pacificnorthrentals.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://pacificnorthrentals.com/#org",
              name: "Pacific North Events & Tents",
              url: "https://pacificnorthrentals.com/",
              logo: "https://pacificnorthrentals.com/favicon.ico",
            },
            {
              "@type": "WebSite",
              "@id": "https://pacificnorthrentals.com/#website",
              url: "https://pacificnorthrentals.com/",
              name: "Pacific North Events & Tents",
              publisher: { "@id": "https://pacificnorthrentals.com/#org" },
            },
            {
              "@type": "LocalBusiness",
              "@id": "https://pacificnorthrentals.com/#business",
              name: "Pacific North Events & Tents",
              url: "https://pacificnorthrentals.com/",
              description: HOME_DESC,
              areaServed: [
                { "@type": "Place", name: "Oregon Coast" },
                { "@type": "Place", name: "Seaside, Oregon" },
                { "@type": "Place", name: "Cannon Beach, Oregon" },
                { "@type": "Place", name: "Astoria, Oregon" },
              ],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Seaside",
                addressRegion: "OR",
                addressCountry: "US",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const badgeKeys = [
  "home.badges.weddings",
  "home.badges.festivals",
  "home.badges.privateParties",
  "home.badges.corporateEvents",
  "home.badges.rainOrShine",
  "home.badges.yearRound",
];

const serviceKeys = [
  { key: "weddings", icon: Sparkles },
  { key: "festivals", icon: Users },
  { key: "privateParties", icon: Tent },
  { key: "corporate", icon: CloudRain },
];

const tentCatKeys = ["small", "medium", "large", "festival", "wedding", "custom"];

const plannerCardKeys = ["tentSize", "equipment", "blueprint", "quote"];

function Home() {
  const { t } = useTranslation();
  const heroImg = pickPhoto("home-hero");
  const eveningImg = pickPhoto("home-evening");
  const gallery = pickPhotos(6, "home-gallery");
  const lb = useLightbox();

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <img src={heroImg.url} alt={heroImg.alt} width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-24 sm:py-32 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">{t("home.hero.eyebrow")}</p>
            <h1 className="mt-5 text-balance font-serif text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
              {t("home.hero.title")}
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg text-primary-foreground/85">
              {t("home.hero.subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3.5 text-sm font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5">
                {t("cta.requestQuote")}
              </Link>
              <Link to="/ai-tent-planner" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/60 bg-primary-foreground/10 px-7 py-3.5 text-sm font-semibold text-primary-foreground backdrop-blur transition-all hover:bg-[color:var(--gold)] hover:text-primary">
                <Sparkles className="h-4 w-4" />
                {t("cta.tryFreePlanner")}
              </Link>
              <Link to="/services" className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/5 px-7 py-3.5 text-sm font-medium text-primary-foreground backdrop-blur transition-colors hover:bg-primary-foreground/15">
                {t("cta.viewOurServices")}
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/85">
              {badgeKeys.map((b) => (
                <li key={b} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
                  {t(b)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("home.intro.eyebrow")}</p>
          <h2 className="mt-4 font-serif text-4xl text-primary sm:text-5xl">
            {t("home.intro.titleLine1")}<br />{t("home.intro.titleLine2")}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {t("home.intro.body")}
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">{t("home.services.title")}</h2>
            <Link to="/services" className="text-sm font-medium text-primary underline-offset-4 hover:underline">{t("home.services.exploreLink")}</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {serviceKeys.map((s) => (
              <article key={s.key} className="group rounded-2xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl text-primary">{t(`home.services.${s.key}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`home.services.${s.key}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Weather-ready */}
      <section className="relative overflow-hidden">
        <img src={eveningImg.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-24 text-primary-foreground lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">{t("home.weather.eyebrow")}</p>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{t("home.weather.title")}</h2>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-primary-foreground/85">
              {t("home.weather.body")}
            </p>
            <Link to="/contact" className="mt-7 inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5">
              {t("home.weather.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Tent categories */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("home.tentCats.eyebrow")}</p>
            <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">{t("home.tentCats.title")}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tentCatKeys.map((k) => (
              <article key={k} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
                <h3 className="font-serif text-xl text-primary">{t(`home.tentCats.${k}.title`)}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{t(`home.tentCats.${k}.desc`)}</p>
                <Link to="/contact" className="mt-6 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {t("cta.getQuote")} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* AI Tent Planner promo */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[color:var(--seafoam,#9cc7bd)]/15 via-background to-[color:var(--gold)]/10">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--seafoam,#9cc7bd)]/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3 w-3" /> {t("home.plannerPromo.badge")}
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("home.plannerPromo.eyebrow")}</p>
            <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">{t("home.plannerPromo.title")}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t("home.plannerPromo.body")}
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plannerCardKeys.map((k) => (
              <article key={k} className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg text-primary">{t(`home.plannerPromo.cards.${k}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`home.plannerPromo.cards.${k}.text`)}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to="/ai-tent-planner"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-[color:var(--gold)]/40 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--navy-soft,#1e293b)]"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              {t("cta.startMyFreeTentPlan")}
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("home.gallery.eyebrow")}</p>
              <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">{t("home.gallery.title")}</h2>
            </div>
            <Link to="/gallery" className="text-sm font-medium text-primary underline-offset-4 hover:underline">{t("home.gallery.viewFull")}</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((g, i) => (
              <button
                type="button"
                key={i}
                onClick={() => lb.open(i)}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-muted/40 ${i === 0 ? "col-span-2 row-span-2 sm:col-span-1 sm:row-span-1" : ""}`}
                aria-label={`Open image: ${g.alt}`}
              >
                <img src={g.url} alt={g.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-105" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <Lightbox images={gallery} index={lb.index} onClose={lb.close} onIndexChange={lb.setIndex} />
      <CTASection />
    </SiteLayout>
  );
}
