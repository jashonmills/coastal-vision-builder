import { createFileRoute, Link } from "@tanstack/react-router";
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

const services = [
  { title: "Wedding Tent Rentals", copy: "Create a beautiful covered space for your ceremony, reception, cocktail hour, or full wedding weekend. Our tent rentals help turn outdoor locations into comfortable, memorable venues." },
  { title: "Festival & Community Event Rentals", copy: "From vendor booths to large gathering spaces, we support festivals, markets, fundraisers, fairs, and public events with practical, weather-ready tent solutions." },
  { title: "Private Party Rentals", copy: "Host birthdays, reunions, graduations, anniversaries, and backyard celebrations with confidence. We help create a comfortable event space that feels intentional and easy to enjoy." },
  { title: "Corporate Event Rentals", copy: "Support company retreats, business gatherings, product launches, and branded events with polished tent setups that keep guests comfortable and the event looking professional." },
  { title: "Delivery, Setup & Breakdown", copy: "Make event planning easier with reliable setup and breakdown support. Our team helps handle the structure so you can focus on the experience." },
];

function ServicesPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Services"
        title="Event Rental Services for Every Occasion"
        subtitle="Whether you're hosting an intimate gathering or a large coastal celebration, we help create the shelter, structure, and setting your event needs."
        image={weddingImg}
      />
      <div className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
        {services.map((s, i) => (
          <div key={s.title}>
            <article className="grid gap-6 py-10 sm:grid-cols-[auto_1fr] sm:gap-10">
              <div className="font-serif text-5xl text-[color:var(--gold)] sm:text-6xl">
                0{i + 1}
              </div>
              <div>
                <h2 className="font-serif text-2xl text-primary sm:text-3xl">{s.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{s.copy}</p>
              </div>
            </article>
            {i < services.length - 1 && <div className="border-t border-border" />}
            {(i + 1) % 2 === 0 && i < services.length - 1 && (
              <div className="my-10 rounded-2xl bg-primary px-8 py-10 text-center text-primary-foreground">
                <p className="font-serif text-2xl">Need something tailored to your event?</p>
                <Link to="/contact" className="mt-5 inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary">
                  Request a Custom Quote
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
