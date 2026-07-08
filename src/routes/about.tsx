import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { Heart, Shield, Sparkles, Users } from "lucide-react";
import { pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | Pacific North Events & Tents" },
      { name: "description", content: "Pacific North Events & Tents helps Oregon Coast celebrations come together with dependable rentals and weather-ready setups." },
      { property: "og:title", content: "About | Pacific North Events & Tents" },
      { property: "og:description", content: "Our story — a family-run Oregon Coast rental team delivering dependable, weather-ready event setups." },
      { property: "og:url", content: "https://pacificnorthrentals.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://pacificnorthrentals.com/about" }],
  }),
  component: AboutPage,
});

const valueKeys = [
  { key: "reliable", icon: Shield },
  { key: "weather", icon: Sparkles },
  { key: "flexible", icon: Users },
  { key: "local", icon: Heart },
];

function AboutPage() {
  const { t } = useTranslation();
  const hero = pickPhoto("about-hero");
  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("about.hero.eyebrow")}
        title={t("about.hero.title")}
        subtitle={t("about.hero.subtitle")}
        image={hero.url}
      />
      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("about.story.eyebrow")}</p>
        <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">{t("about.story.title")}</h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          {t("about.story.body")}
        </p>
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto max-w-4xl px-4 py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">{t("about.venues.eyebrow")}</p>
          <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">{t("about.venues.title")}</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            {t("about.venues.body")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/beacon-on-broadway"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("about.venues.beaconCta")}
            </Link>
            <Link
              to="/catering"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted"
            >
              {t("about.venues.cateringCta")}
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <h2 className="font-serif text-3xl text-primary sm:text-4xl">{t("about.values.title")}</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valueKeys.map((v) => (
              <article key={v.key} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg text-primary">{t(`about.values.${v.key}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`about.values.${v.key}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
