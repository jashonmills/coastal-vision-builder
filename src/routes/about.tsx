import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { Heart, Shield, Sparkles, Users } from "lucide-react";
import { pickPhoto } from "@/lib/site-images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | Pacific North Events & Tents" },
      { name: "description", content: "Pacific North Events & Tents helps Oregon Coast celebrations come together with dependable rentals and weather-ready setups." },
    ],
  }),
  component: AboutPage,
});

const values = [
  { icon: Shield, title: "Reliable Setup", text: "Dependable delivery, setup, and breakdown support so your event starts with confidence." },
  { icon: Sparkles, title: "Weather-Ready Planning", text: "Outdoor events need smart shelter. We help customers plan for comfort in changing coastal conditions." },
  { icon: Users, title: "Flexible Event Support", text: "From intimate gatherings to larger celebrations, we help match the setup to the event." },
  { icon: Heart, title: "Local, Friendly Service", text: "We care about helping customers create memorable experiences without unnecessary stress." },
];

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About"
        title="About Pacific North Events & Tents"
        subtitle="Helping Oregon Coast events come together with dependable rentals, thoughtful planning, and weather-ready setups."
        image={coastalImg}
      />
      <section className="mx-auto max-w-4xl px-4 py-20 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--forest)]">Our Story</p>
        <h2 className="mt-3 font-serif text-4xl text-primary sm:text-5xl">Local Events Deserve Local Support</h2>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Pacific North Events &amp; Tents was created to help people host better outdoor events along the Oregon Coast. We understand that coastal celebrations need flexible planning, reliable equipment, and a team that knows how important every detail feels when the big day arrives.
        </p>
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <h2 className="font-serif text-3xl text-primary sm:text-4xl">What We Stand For</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <article key={v.title} className="rounded-2xl border border-border bg-card p-7 shadow-sm">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg text-primary">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CTASection />
    </SiteLayout>
  );
}
