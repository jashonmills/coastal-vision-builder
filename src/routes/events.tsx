import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events We Support | Pacific North Events & Tents" },
      { name: "description", content: "Tent rentals for weddings, festivals, private parties, corporate events, markets, and fundraisers on the Oregon Coast." },
    ],
  }),
  component: EventsPage,
});

const eventKeys = ["weddings", "festivals", "private", "corporate", "markets", "fundraisers"];

function EventsPage() {
  const { t } = useTranslation();
  const hero = pickPhoto("events-hero");
  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("events.hero.eyebrow")}
        title={t("events.hero.title")}
        subtitle={t("events.hero.subtitle")}
        image={hero.url}
      />
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {eventKeys.map((k) => (
            <article key={k} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h2 className="font-serif text-2xl text-primary">{t(`events.items.${k}.title`)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(`events.items.${k}.desc`)}</p>
              <p className="mt-4 text-sm leading-relaxed">
                <span className="font-semibold text-foreground">{t("events.suggestedRentals")} </span>
                <span className="text-muted-foreground">{t(`events.items.${k}.rentals`)}</span>
              </p>
              <Link to="/contact" className="mt-6 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {t(`events.items.${k}.cta`)} →
              </Link>
            </article>
          ))}
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
