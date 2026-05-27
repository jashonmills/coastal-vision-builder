import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Mail, MapPin, Phone, Facebook } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  prefill: z.string().optional(),
});

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Request a Quote | Pacific North Events & Tents" },
      { name: "description", content: "Request a quote for tent rentals and event support on the Oregon Coast. Tell us your date, guest count, and vision." },
    ],
  }),
  validateSearch: searchSchema,
  component: ContactPage,
});

const RENTALS = ["Event Tent", "Vendor Tent", "Wedding Tent", "Tables", "Chairs", "Lighting", "Setup / Breakdown Support", "Not Sure Yet"];

function ContactPage() {
  const { prefill } = useSearch({ from: "/contact" });
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Request a Quote"
        subtitle="Tell us about your event and we'll help you plan the right tent setup."
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          {submitted ? (
            <div className="py-10 text-center">
              <h2 className="font-serif text-3xl text-primary">Thank you!</h2>
              <p className="mt-4 text-muted-foreground">
                We've received your request and will reach out shortly to help plan your event.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-5">
              {prefill && (
                <div className="rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-4 py-3 text-sm text-primary">
                  <strong className="font-semibold">From your recommender:</strong> {prefill}
                </div>
              )}
              <Row>
                <Field label="Full Name *"><input required maxLength={100} name="name" className={input} /></Field>
                <Field label="Email Address *"><input required type="email" maxLength={255} name="email" className={input} /></Field>
              </Row>
              <Row>
                <Field label="Phone Number *"><input required type="tel" maxLength={30} name="phone" className={input} /></Field>
                <Field label="Event Date *"><input required type="date" name="date" className={input} /></Field>
              </Row>
              <Field label="Event Location / Venue *">
                <input required maxLength={200} name="location" className={input} placeholder="Venue, city, or area" />
              </Field>
              <Row>
                <Field label="Type of Event *">
                  <select required name="type" className={input} defaultValue="">
                    <option value="" disabled>Select an option</option>
                    {["Wedding","Festival","Private Party","Corporate Event","Market / Vendor Event","Community Event","Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Estimated Guest Count *">
                  <select required name="guests" className={input} defaultValue="">
                    <option value="" disabled>Select range</option>
                    {["Under 25","25–50","50–100","100–200","200+"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </Row>

              <Field label="What rentals are you interested in?">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RENTALS.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="rentals" value={r} className="accent-[color:var(--navy)]" />
                      <span className="text-foreground">{r}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Preferred Contact Method">
                <div className="flex flex-wrap gap-5 text-sm">
                  {["Email","Phone","Text"].map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name="contactMethod" value={m} defaultChecked={m === "Email"} className="accent-[color:var(--navy)]" />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Message">
                <textarea name="message" rows={5} maxLength={2000} className={input} placeholder="Tell us about your event, location, timeline, and vision…" defaultValue={prefill ?? ""} />
              </Field>

              <button type="submit" className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
                Send Quote Request
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <h3 className="font-serif text-xl text-primary">Contact Pacific North Events &amp; Tents</h3>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-primary" /> Add phone number</li>
              <li className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-primary" /> Add email address</li>
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> Oregon Coast and surrounding areas</li>
              <li className="flex items-start gap-3"><Facebook className="mt-0.5 h-4 w-4 text-primary" /> Facebook</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-6 text-sm text-primary">
            <strong className="font-semibold">Year-round rentals.</strong>{" "}
            Contact us early for the best availability.
          </div>
        </aside>
      </section>
    </SiteLayout>
  );
}

const input = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}
