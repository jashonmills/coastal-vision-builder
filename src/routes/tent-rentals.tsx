import { createFileRoute, Link } from "@tanstack/react-router";
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

const tents = [
  { title: "Pop-Up / Vendor Tents", best: "Markets, booths, check-ins, and small covered stations.", cta: "Ask About Availability" },
  { title: "Small Event Tents", best: "Backyard parties, small gatherings, food service, and guest seating.", cta: "Request Quote" },
  { title: "Medium Event Tents", best: "Receptions, family celebrations, private parties, and community events.", cta: "Request Quote" },
  { title: "Large Event Tents", best: "Weddings, festivals, corporate events, and large guest counts.", cta: "Plan My Event" },
  { title: "Wedding Reception Tents", best: "Dining, dancing, lounge areas, and elegant outdoor wedding layouts.", cta: "Start Wedding Quote" },
  { title: "Custom Event Layouts", best: "Complex venues, multi-tent setups, vendor rows, weather plans, and event flow.", cta: "Design My Setup" },
];

function TentRentalsPage() {
  const hero = pickPhoto("tent-rentals-hero");
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Tent Rentals"
        title="Tent Rentals for Oregon Coast Events"
        subtitle="Stylish shelter, flexible layouts, and dependable protection for weddings, parties, festivals, and corporate gatherings."
        image={hero.url}
      />
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tents.map((t) => (
            <article key={t.title} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-lg">
              <h3 className="font-serif text-xl text-primary">{t.title}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Best for: </span>{t.best}
              </p>
              <Link to="/contact" className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
                {t.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">Not Sure What Size Tent You Need?</h2>
            <p className="mt-5 text-muted-foreground">
              Tell us your guest count, event type, location, and layout goals. We'll help recommend the right tent size and setup for your event.
            </p>
            <Link to="/recommender" className="mt-8 inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground hover:bg-[color:var(--navy-soft)]">
              Get Help Choosing
            </Link>
          </div>
          <div>
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">Browse the Full Inventory</h2>
            <p className="mt-5 text-muted-foreground">
              See every tent size, table, chair, dance floor, lighting option, bar, and delivery zone — with 3-day rental pricing.
            </p>
            <Link to="/inventory" className="mt-8 inline-flex items-center rounded-full border border-primary bg-transparent px-7 py-3 text-sm font-medium text-primary hover:bg-primary/5">
              View Inventory & Pricing
            </Link>
          </div>
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
