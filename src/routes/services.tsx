import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Event Tent Rental Services | Pacific North Events & Tents" },
      { name: "description", content: "Wedding, festival, private party, and corporate event tent rentals plus delivery and setup on the Oregon Coast." },
      { property: "og:title", content: "Event Tent Rental Services | Pacific North Events & Tents" },
    ],
  }),
  component: ServicesPage,
});

const serviceKeys = ["weddings", "festivals", "private", "corporate", "setup"];

function ServicesPage() {
  const { t } = useTranslation();
  const hero = pickPhoto("services-hero");
  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("services.hero.eyebrow")}
        title={t("services.hero.title")}
        subtitle={t("services.hero.subtitle")}
        image={hero.url}
      />
      <div className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
        {serviceKeys.map((k, i) => (
          <div key={k}>
            <article className="grid gap-6 py-10 sm:grid-cols-[auto_1fr] sm:gap-10">
              <div className="font-serif text-5xl text-[color:var(--gold)] sm:text-6xl">
                0{i + 1}
              </div>
              <div>
                <h2 className="font-serif text-2xl text-primary sm:text-3xl">{t(`services.items.${k}.title`)}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t(`services.items.${k}.copy`)}</p>
              </div>
            </article>
            {i < serviceKeys.length - 1 && <div className="border-t border-border" />}
            {(i + 1) % 2 === 0 && i < serviceKeys.length - 1 && (
              <div className="my-10 rounded-2xl bg-primary px-8 py-10 text-center text-primary-foreground">
                <p className="font-serif text-2xl">{t("services.tailoredBanner")}</p>
                <Link to="/contact" className="mt-5 inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary">
                  {t("cta.requestCustomQuote")}
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
      <CTASection />
    </SiteLayout>
  );
}
