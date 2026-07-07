import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { pickPhoto } from "@/lib/site-images";
import { Phone, Mail, MapPin, ChefHat, Wine, Utensils, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/catering")({
  head: () => ({
    meta: [
      { title: "Pacific North Catering | Buffet Menus, Bartending & Chef Stations" },
      {
        name: "description",
        content:
          "Full-service catering on the Oregon Coast — buffet, silver, and gold menus from $25/person, plus bartending and chef-attended stations. $3/mile travel fee beyond 25 miles from Seaside.",
      },
      { property: "og:title", content: "Pacific North Catering — Above expectations" },
      {
        property: "og:description",
        content:
          "Taco bars, pasta bars, silver and gold buffets, chef-attended stations, and bartending services. Seaside, OR.",
      },
    ],
  }),
  component: CateringPage,
});

const PHONE = "503-717-5088";
const EMAIL = "info@pacificnorthcatering.com";

type MenuColumn = { heading: string; items: string[] };

function MenuCard({
  title,
  subtitle,
  columns,
  note,
}: {
  title: string;
  subtitle?: string;
  columns: MenuColumn[];
  note?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.heading}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">
              {col.heading}
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm text-foreground">
              {col.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {note && <p className="mt-5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Section({
  eyebrow,
  title,
  pricing,
  children,
}: {
  eyebrow?: string;
  title: string;
  pricing?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
        </div>
        {pricing && (
          <div className="max-w-full rounded-2xl border border-border bg-card px-3 py-2 text-[11px] font-medium text-foreground sm:rounded-full sm:px-4 sm:text-sm">
            <div className="flex flex-col gap-0.5">
              {pricing.split("\n").map((line, i) => (
                <span key={i} className="whitespace-nowrap">
                  {line}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-foreground">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-[color:var(--gold)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function CateringPage() {
  const { t } = useTranslation();
  const hero = pickPhoto("catering-hero");

  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("catering.hero.eyebrow")}
        title={t("catering.hero.title")}
        subtitle={t("catering.hero.subtitle")}
        image={hero.url}
      />

      {/* Contact strip */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground">
            <a href={`tel:${PHONE.replace(/-/g, "")}`} className="flex items-center gap-2 hover:text-[color:var(--gold)]">
              <Phone className="h-4 w-4" /> {PHONE}
            </a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-[color:var(--gold)]">
              <Mail className="h-4 w-4" /> {EMAIL}
            </a>
            <span className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {t("catering.contact.address")}
            </span>
          </div>
          <a
            href={`mailto:${EMAIL}?subject=Catering%20Inquiry`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            {t("catering.contact.requestQuote")} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Buffet Menu — three menus */}
      <Section
        eyebrow={t("catering.buffet.eyebrow")}
        title={t("catering.buffet.title")}
        pricing={t("catering.buffet.pricing")}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MenuCard
            title="Menu 1 · Taco Bar"
            subtitle={t("catering.buffet.allIncluded")}
            columns={[
              {
                heading: t("catering.buffet.main"),
                items: ["Steak rancheros", "Chipotle chicken", "Corn and flour tortillas"],
              },
              {
                heading: t("catering.buffet.sides"),
                items: ["Chips & salsa", "Mexican-style rice", "Poblano pinto beans"],
              },
              {
                heading: t("catering.buffet.fixings"),
                items: [
                  "Mexican cheeses",
                  "Lettuce",
                  "Pico de gallo",
                  "Onions",
                  "Guacamole",
                  "Sour cream",
                  "Mango salsa",
                ],
              },
            ]}
          />
          <MenuCard
            title="Menu 2 · Tailgater"
            subtitle={t("catering.buffet.allIncluded")}
            columns={[
              {
                heading: t("catering.buffet.main"),
                items: [
                  "BBQ pulled pork sliders",
                  "Grilled smoked sausages with sautéed peppers, onions, and stout mustard",
                ],
              },
              {
                heading: t("catering.buffet.sides"),
                items: ["Mac & cheese", "Southern baked beans"],
              },
              {
                heading: t("catering.buffet.salad"),
                items: ["Kicked-up slaw"],
              },
            ]}
          />
          <MenuCard
            title="Menu 3 · Pasta Bar"
            columns={[
              {
                heading: t("catering.buffet.mainChooseTwo"),
                items: [
                  "Chicken alfredo penne",
                  "Italian sausage penne with marinara",
                  "Bay shrimp coastal alfredo",
                ],
              },
              {
                heading: t("catering.buffet.sides"),
                items: ["Breadsticks", "Pesto wine and artichoke sauce with cheese ravioli"],
              },
              {
                heading: t("catering.buffet.saladChooseOne"),
                items: ["Garden", "Caesar"],
              },
            ]}
          />
        </div>
      </Section>

      {/* Silver */}
      <Section
        eyebrow={t("catering.silver.eyebrow")}
        title={t("catering.silver.title")}
        pricing={t("catering.silver.pricing")}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">{t("catering.buffet.salad")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOne")}</span></h3>
            <p className="mt-2 text-sm text-foreground">{t("catering.common.silverSaladOptions")}</p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">{t("catering.common.entree")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOne")}</span></h3>
            <div className="mt-2">
              <BulletList
                items={[
                  "Caribbean jerk chicken thighs",
                  "Roasted salsa verde chicken",
                  "Middle Eastern chicken shawarma",
                  "Mediterranean provençal chicken breast",
                  "Slow-roasted pork mole",
                  "Cuban-style roasted pork",
                  "Hawaiian pulled pork with roasted pineapple relish",
                ]}
              />
            </div>

            <h3 className="mt-6 text-lg font-semibold text-foreground">{t("catering.common.sidesLabel")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOneEach")}</span></h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">{t("catering.common.starch")}</h4>
                <BulletList items={["Garlic mashed potatoes", "Classic mac & cheese", "Cilantro lime rice pilaf"]} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">{t("catering.common.vegetable")}</h4>
                <BulletList items={["Roasted seasonal vegetables", "Green bean almondine", "Mexican street corn salad"]} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-[color:var(--gold)]" />
              <h3 className="text-lg font-semibold text-foreground">{t("catering.common.horsdoeuvres")}</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("catering.common.horsdoeuvresNote")}</p>
            <div className="mt-4">
              <BulletList
                items={[
                  "Surf melt crostinis",
                  "Skewered chicken or shrimp satay",
                  "Mini crab cakes with lemon dill aioli",
                  "Assorted cheese and cracker platter",
                  "Pastry cups, sweet or savory",
                  "Swedish meatballs",
                  "Chinese bao buns",
                  "Seasonal veggie platter",
                  "Seasonal fruit tray",
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Gold */}
      <Section
        eyebrow={t("catering.gold.eyebrow")}
        title={t("catering.gold.title")}
        pricing={t("catering.gold.pricing")}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">{t("catering.buffet.salad")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOne")}</span></h3>
            <p className="mt-2 text-sm text-foreground">{t("catering.common.goldSaladOptions")}</p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">{t("catering.common.entree")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOne")}</span></h3>
            <div className="mt-2">
              <BulletList
                items={[
                  "Caribbean jerk chicken thighs",
                  "Roasted salsa verde chicken",
                  "Middle Eastern chicken shawarma",
                  "Mediterranean provençal chicken breast",
                  "Italian parmigiano breaded chicken breast",
                  "Chicken marsala",
                  "Slow-roasted pork mole",
                  "Cuban-style roasted pork",
                  "Hawaiian pulled pork with roasted pineapple relish",
                ]}
              />
            </div>

            <h3 className="mt-6 text-lg font-semibold text-foreground">{t("catering.common.sidesLabel")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOneEach")}</span></h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">{t("catering.common.starch")}</h4>
                <BulletList
                  items={[
                    "Garlic mashed potatoes",
                    "Classic mac & cheese",
                    "Cilantro lime rice pilaf",
                    "Mediterranean couscous",
                    "Coconut ginger purple rice",
                  ]}
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">{t("catering.common.vegetable")}</h4>
                <BulletList
                  items={[
                    "Oven-roasted balsamic brussels sprouts",
                    "Roasted seasonal vegetables",
                    "Green bean almondine",
                    "Mexican street corn salad",
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-[color:var(--gold)]" />
                <h3 className="text-lg font-semibold text-foreground">{t("catering.common.chefStation")} <span className="text-sm font-normal text-muted-foreground">{t("catering.common.chooseOne")}</span></h3>
              </div>
              <div className="mt-3">
                <BulletList
                  items={[
                    "Prime rib roast",
                    "Cajun salmon with shrimp Newburg sauce",
                    "Honey chipotle sockeye salmon topped with mango salsa",
                    "Pesto crusted rockfish",
                    "Grilled tri-tip",
                    "Slow-roasted honey ham with bourbon glaze",
                  ]}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-[color:var(--gold)]" />
                <h3 className="text-lg font-semibold text-foreground">{t("catering.common.horsdoeuvres")}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t("catering.common.horsdoeuvresNote")}</p>
              <div className="mt-3">
                <BulletList
                  items={[
                    "Surf melt crostinis",
                    "Skewered chicken or shrimp satay",
                    "Mini crab cakes with lemon dill aioli",
                    "Assorted cheese and cracker platter",
                    "Pastry cups, sweet or savory",
                    "Swedish meatballs",
                    "Chinese bao buns",
                    "Seasonal veggie platter",
                    "Seasonal fruit tray",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bartending */}
      <Section eyebrow={t("catering.bartending.eyebrow")} title={t("catering.bartending.title")}>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <Wine className="mt-1 h-8 w-8 shrink-0 text-[color:var(--gold)]" />
            <div className="space-y-3 text-sm text-foreground sm:text-base">
              <p>{t("catering.bartending.body")}</p>
              <p className="text-muted-foreground">{t("catering.bartending.note")}</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing fine print */}
      <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-8">
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-xs text-muted-foreground sm:text-sm">
          {t("catering.finePrint")}
        </div>
      </section>

      {/* Cross-promo */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            to="/services"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">{t("catering.cross.rentalsEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">{t("catering.cross.rentalsTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("catering.cross.rentalsBody")}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-[color:var(--gold)]">
              {t("catering.cross.rentalsCta")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/beacon-on-broadway"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">{t("catering.cross.venueEyebrow")}</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">{t("catering.cross.venueTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("catering.cross.venueBody")}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-[color:var(--gold)]">
              {t("catering.cross.venueCta")} <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      <CTASection />
    </SiteLayout>
  );
}
