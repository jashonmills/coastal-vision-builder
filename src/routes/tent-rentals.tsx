import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/tent-rentals")({
  head: () => ({
    meta: [
      { title: "Tent Rentals | Pacific North Events & Tents" },
      { name: "description", content: "Pop-up vendor, small, medium, large, wedding reception, and custom event tent rentals on the Oregon Coast." },
    ],
  }),
  component: TentRentalsPage,
});

const tentKeys = ["popup", "small", "medium", "large", "wedding", "custom"];

function TentRentalsPage() {
  const { t } = useTranslation();
  const hero = pickPhoto("tent-rentals-hero");
  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("tentRentals.hero.eyebrow")}
        title={t("tentRentals.hero.title")}
        subtitle={t("tentRentals.hero.subtitle")}
        image={hero.url}
      />
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tentKeys.map((k) => (
            <article key={k} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-lg">
              <h3 className="font-serif text-xl text-primary">{t(`tentRentals.items.${k}.title`)}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("tentRentals.bestFor")} </span>{t(`tentRentals.items.${k}.best`)}
              </p>
              <Link to="/contact" className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
                {t(`tentRentals.items.${k}.cta`)}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">{t("tentRentals.help.title")}</h2>
            <p className="mt-5 text-muted-foreground">
              {t("tentRentals.help.body")}
            </p>
            <Link to="/ai-tent-planner" className="mt-8 inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground hover:bg-[color:var(--navy-soft)]">
              {t("tentRentals.help.cta")}
            </Link>
          </div>
          <div>
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">{t("tentRentals.inventory.title")}</h2>
            <p className="mt-5 text-muted-foreground">
              {t("tentRentals.inventory.body")}
            </p>
            <Link to="/inventory" className="mt-8 inline-flex items-center rounded-full border border-primary bg-transparent px-7 py-3 text-sm font-medium text-primary hover:bg-primary/5">
              {t("tentRentals.inventory.cta")}
            </Link>
          </div>
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
