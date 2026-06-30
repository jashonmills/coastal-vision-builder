import { createFileRoute, Link } from "@tanstack/react-router";
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
          "Full-service catering on the Oregon Coast — buffet, silver, and gold menus from $25/person, plus bartending and chef-attended stations.",
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
          <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground">
            {pricing}
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
  const hero = pickPhoto("catering-hero");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Pacific North Catering"
        title="Taking your catered event above expectations"
        subtitle="Buffet menus, chef-attended stations, and bartending services on the Oregon Coast."
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
              <MapPin className="h-4 w-4" /> 1475 N. Roosevelt, Seaside, OR 97138
            </span>
          </div>
          <a
            href={`mailto:${EMAIL}?subject=Catering%20Inquiry`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            Request a Catering Quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Buffet Menu — three menus */}
      <Section
        eyebrow="Buffet Menu"
        title="Crowd-favorite buffets"
        pricing="$25 / person (100+) · $30 / person (50–99)"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <MenuCard
            title="Menu 1 · Taco Bar"
            subtitle="All included"
            columns={[
              {
                heading: "Main",
                items: ["Steak rancheros", "Chipotle chicken", "Corn and flour tortillas"],
              },
              {
                heading: "Sides",
                items: ["Chips & salsa", "Mexican-style rice", "Poblano pinto beans"],
              },
              {
                heading: "Fixings",
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
            subtitle="All included"
            columns={[
              {
                heading: "Main",
                items: [
                  "BBQ pulled pork sliders",
                  "Grilled smoked sausages with sautéed peppers, onions, and stout mustard",
                ],
              },
              {
                heading: "Sides",
                items: ["Mac & cheese", "Southern baked beans"],
              },
              {
                heading: "Salad",
                items: ["Kicked-up slaw"],
              },
            ]}
          />
          <MenuCard
            title="Menu 3 · Pasta Bar"
            columns={[
              {
                heading: "Main (choose two)",
                items: [
                  "Chicken alfredo penne",
                  "Italian sausage penne with marinara",
                  "Bay shrimp coastal alfredo",
                ],
              },
              {
                heading: "Sides",
                items: ["Breadsticks", "Pesto wine and artichoke sauce with cheese ravioli"],
              },
              {
                heading: "Salad (choose one)",
                items: ["Garden", "Caesar"],
              },
            ]}
          />
        </div>
      </Section>

      {/* Silver */}
      <Section
        eyebrow="Silver Buffet"
        title="Silver Buffet Menu"
        pricing="$30 / person (100+) · $35 / person (50–99)"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Salad <span className="text-sm font-normal text-muted-foreground">(choose 1)</span></h3>
            <p className="mt-2 text-sm text-foreground">Garden or caesar</p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">Entrée <span className="text-sm font-normal text-muted-foreground">(choose 1)</span></h3>
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

            <h3 className="mt-6 text-lg font-semibold text-foreground">Sides <span className="text-sm font-normal text-muted-foreground">(choose 1 of each)</span></h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">Starch</h4>
                <BulletList items={["Garlic mashed potatoes", "Classic mac & cheese", "Cilantro lime rice pilaf"]} />
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">Vegetable</h4>
                <BulletList items={["Roasted seasonal vegetables", "Green bean almondine", "Mexican street corn salad"]} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-[color:var(--gold)]" />
              <h3 className="text-lg font-semibold text-foreground">Upgrade · Hors d'Oeuvres</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">+$5 per person for each item ordered</p>
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
        eyebrow="Gold Buffet"
        title="Gold Buffet Menu"
        pricing="$40 / person (100+) · $45 / person (50–99)"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Salad <span className="text-sm font-normal text-muted-foreground">(choose 1)</span></h3>
            <p className="mt-2 text-sm text-foreground">Garden, caesar, or strawberry spinach</p>

            <h3 className="mt-6 text-lg font-semibold text-foreground">Entrée <span className="text-sm font-normal text-muted-foreground">(choose 1)</span></h3>
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

            <h3 className="mt-6 text-lg font-semibold text-foreground">Sides <span className="text-sm font-normal text-muted-foreground">(choose 1 of each)</span></h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">Starch</h4>
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
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold)]">Vegetable</h4>
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
                <h3 className="text-lg font-semibold text-foreground">Chef-Attended Station <span className="text-sm font-normal text-muted-foreground">(choose 1)</span></h3>
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
                <h3 className="text-lg font-semibold text-foreground">Upgrade · Hors d'Oeuvres</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">+$5 per person for each item ordered</p>
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
      <Section eyebrow="Bartending" title="Bartending Services">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <Wine className="mt-1 h-8 w-8 shrink-0 text-[color:var(--gold)]" />
            <div className="space-y-3 text-sm text-foreground sm:text-base">
              <p>
                Looking for traditional bartending services for your event? From fruity cocktails to hard
                liquors, from champagne to non-alcoholic beverages, our experienced mixologists are on hand
                to elevate your occasion into an affair to remember.
              </p>
              <p className="text-muted-foreground">
                Bartending is currently only offered in combination with our food catering packages. Ask for pricing.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing fine print */}
      <section className="mx-auto max-w-7xl px-4 pb-8 lg:px-8">
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-xs text-muted-foreground sm:text-sm">
          All prices are based on a 2-hour service and 100 guests. Add $5 per person for counts between 50–99.
          Price does not include service personnel, table linens, delivery, or service charge. Prices subject to change without notice.
        </div>
      </section>

      {/* Cross-promo */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            to="/services"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">Rentals</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Tents, tables, chairs & linens</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Need rentals for your catered wedding or event? Pacific North Event & Tent Rentals can help plan the
              details — with over 5 years of Pacific North experience. Delivery and take-down available.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-[color:var(--gold)]">
              Explore rentals <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/beacon-on-broadway"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">Venue</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">The Beacon on Broadway</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Hoping for an elegant indoor venue? A historic event space over 100 years old, right on Broadway in
              downtown Seaside — seats up to 150 guests.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground group-hover:text-[color:var(--gold)]">
              See the Beacon <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      <CTASection />
    </SiteLayout>
  );
}
