import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import coastalImg from "@/assets/coastal-reception.jpg";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events We Support | Pacific North Events & Tents" },
      { name: "description", content: "Tent rentals for weddings, festivals, private parties, corporate events, markets, and fundraisers on the Oregon Coast." },
    ],
  }),
  component: EventsPage,
});

const events = [
  { title: "Weddings", desc: "Create a beautiful covered venue for dining, dancing, ceremony seating, and guest comfort.", rentals: "Reception tents, ceremony tents, vendor tents, lounge coverage, lighting-ready layouts.", cta: "Request Wedding Quote" },
  { title: "Festivals", desc: "Large multi-tent layouts for music, food, and community festivals along the coast.", rentals: "Main stage tents, vendor rows, food service tents, check-in covers.", cta: "Plan My Festival" },
  { title: "Private Parties", desc: "From backyard birthdays to milestone celebrations, comfortable space for gathering and dining.", rentals: "Small to medium tents, tables, chairs, lighting, sidewalls.", cta: "Request Party Quote" },
  { title: "Corporate Events", desc: "Polished outdoor venues for retreats, product launches, and branded gatherings.", rentals: "Reception tents, presentation areas, branded vendor tents.", cta: "Request Corporate Quote" },
  { title: "Markets & Vendor Events", desc: "Organized vendor rows that handle wind, sun, and Pacific Northwest rain.", rentals: "10x10 / 10x20 vendor tents, check-in tents, sidewalls.", cta: "Request Vendor Quote" },
  { title: "Fundraisers & Community Gatherings", desc: "Welcoming spaces for fundraisers, school events, and community celebrations.", rentals: "Medium to large tents, tables, chairs, lighting.", cta: "Request Community Quote" },
];

function EventsPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Events"
        title="Events We Support"
        subtitle="From oceanfront weddings to community festivals, Pacific North Events & Tents helps create comfortable spaces for unforgettable gatherings."
        image={coastalImg}
      />
      <section className="mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {events.map((e) => (
            <article key={e.title} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h2 className="font-serif text-2xl text-primary">{e.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{e.desc}</p>
              <p className="mt-4 text-sm leading-relaxed">
                <span className="font-semibold text-foreground">Suggested rentals: </span>
                <span className="text-muted-foreground">{e.rentals}</span>
              </p>
              <Link to="/contact" className="mt-6 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {e.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
