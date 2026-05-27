import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout, CTASection } from "@/components/SiteLayout";
import { EditableText, EditableImage } from "@/components/Editable";
import { Lightbox, useLightbox } from "@/components/Lightbox";
import { pickPhoto, pickPhotos } from "@/lib/site-images";
import { CloudRain, Sparkles, Tent, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pacific North Events & Tents | Oregon Coast Event Tent Rentals" },
      { name: "description", content: "Pacific North Events & Tents provides event tent rentals and setup support for weddings, festivals, private parties, corporate events, and year-round celebrations on the Oregon Coast." },
      { property: "og:title", content: "Pacific North Events & Tents | Oregon Coast Event Tent Rentals" },
      { property: "og:description", content: "Stylish, weather-ready event tent rentals on the Oregon Coast." },
    ],
  }),
  component: Home,
});

const badges = ["Weddings", "Festivals", "Private Parties", "Corporate Events", "Rain-or-Shine Setups", "Year-Round Rentals"];

const services = [
  { title: "Weddings", text: "Elegant tented spaces for ceremonies, receptions, rehearsal dinners, and coastal wedding weekends.", icon: Sparkles },
  { title: "Festivals & Community", text: "Large-scale tent solutions for markets, music events, fundraisers, fairs, and community celebrations.", icon: Users },
  { title: "Private Parties", text: "Comfortable, beautiful setups for birthdays, reunions, graduations, backyard parties, and family gatherings.", icon: Tent },
  { title: "Corporate Events", text: "Professional tent and rental solutions for business events, retreats, brand activations, and company gatherings.", icon: CloudRain },
];

const tentCats = [
  { title: "Small Gatherings", desc: "Backyard parties, intimate dinners, and small celebrations under 50 guests." },
  { title: "Medium Events", desc: "Receptions and family celebrations for 50–100 guests with seating and food service." },
  { title: "Large Celebrations", desc: "Weddings and corporate events for 100–200 guests with dining and dancing." },
  { title: "Festival & Vendor Tents", desc: "Markets, fairs, and multi-booth setups with weather-ready protection." },
  { title: "Wedding Reception Tents", desc: "Dining, dancing, lounge areas, and elegant outdoor wedding layouts." },
  { title: "Custom Event Layouts", desc: "Multi-tent setups, vendor rows, weather plans, and full event flow design." },
];

function Home() {
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">Oregon Coast Event Rentals</p>
            <h1 className="mt-5 text-balance font-serif text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
              Event Tents &amp; Rentals for Oregon Coast Celebrations
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg text-primary-foreground/85">
              From weddings and festivals to private parties and corporate events, Pacific North Events &amp; Tents helps bring your vision to life with stylish, reliable, weather-ready event rentals.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/contact" className="inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3.5 text-sm font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5">
                Request a Quote
              </Link>
              <Link to="/ai-tent-planner" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/60 bg-primary-foreground/10 px-7 py-3.5 text-sm font-semibold text-primary-foreground backdrop-blur transition-all hover:bg-[color:var(--gold)] hover:text-primary">
                <Sparkles className="h-4 w-4" />
                Try Our Free AI Tent Planner
              </Link>
              <Link to="/services" className="inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/5 px-7 py-3.5 text-sm font-medium text-primary-foreground backdrop-blur transition-colors hover:bg-primary-foreground/15">
                View Our Services
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/85">
              {badges.map((b) => (
                <li key={b} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">Our Promise</p>
          <h2 className="mt-4 font-serif text-4xl text-primary sm:text-5xl">
            Your Event. Your Vision.<br />We Make It Happen.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Planning an outdoor event on the Oregon Coast comes with a unique kind of magic — and a unique kind of weather. Pacific North Events &amp; Tents provides high-quality event tents and rental support designed to keep your celebration comfortable, stylish, and stress-free.
          </p>
        </div>
      </section>

      {/* Service cards */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-3xl text-primary sm:text-4xl">What We Help You Host</h2>
            <Link to="/services" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Explore Services →</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <article key={s.title} className="group rounded-2xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl text-primary">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--gold)]">Coast-Ready</p>
            <h2 className="mt-4 font-serif text-4xl sm:text-5xl">Built for Coastal Weather</h2>
          </div>
          <div>
            <p className="text-lg leading-relaxed text-primary-foreground/85">
              Oregon Coast events need more than a pretty setup — they need smart planning, dependable equipment, and shelter that gives guests peace of mind. Our tents help protect your event from sun, wind, and rain while creating a polished space your guests will remember.
            </p>
            <Link to="/contact" className="mt-7 inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5">
              Plan Your Setup
            </Link>
          </div>
        </div>
      </section>

      {/* Tent categories */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">Tent Rentals</p>
            <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">Tents for Every Size Celebration</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tentCats.map((t) => (
              <article key={t.title} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
                <h3 className="font-serif text-xl text-primary">{t.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                <Link to="/contact" className="mt-6 inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  Get Quote →
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
              <Sparkles className="h-3 w-3" /> New Free Tool
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">Plan Your Event in Minutes</p>
            <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">Try Our Free AI Tent Planner</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Not sure what size tent, seating layout, or equipment your event needs? Our AI Tent Planner helps you build a custom starting plan based on your guest count, event type, surface, weather exposure, and setup needs.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Tent Size Recommendation", text: "Get a suggested tent size based on your guest count and layout." },
              { title: "Equipment Checklist", text: "See recommended tables, chairs, sidewalls, lighting, staging, and extras." },
              { title: "Blueprint-Style Layout", text: "Generate a visual starting layout for your event setup." },
              { title: "Quote-Ready Plan", text: "Send your plan to our team for a custom quote and final review." },
            ].map((c) => (
              <article key={c.title} className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg text-primary">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to="/ai-tent-planner"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lg ring-1 ring-[color:var(--gold)]/40 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--navy-soft,#1e293b)]"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
              Start My Free Tent Plan
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">Inspiration</p>
              <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">See What's Possible</h2>
            </div>
            <Link to="/gallery" className="text-sm font-medium text-primary underline-offset-4 hover:underline">View Full Gallery →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {gallery.map((g, i) => (
              <button
                type="button"
                key={i}
                onClick={() => lb.open(i)}
                className={`group overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2 sm:col-span-1 sm:row-span-1" : ""}`}
                aria-label={`Open image: ${g.alt}`}
              >
                <img src={g.url} alt={g.alt} loading="lazy" className="h-full w-full cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-105" />
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
