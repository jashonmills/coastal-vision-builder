import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Mail, MapPin, Phone, Facebook } from "lucide-react";
import { z } from "zod";
import { createQuoteRequest } from "@/lib/quotes.functions";

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

const RENTAL_KEYS = ["eventTent", "vendorTent", "weddingTent", "tables", "chairs", "lighting", "setupSupport", "notSure"];
const EVENT_TYPE_KEYS = ["wedding", "festival", "privateParty", "corporateEvent", "marketVendor", "community", "other"];
const GUEST_RANGE_KEYS = ["under25", "25_50", "50_100", "100_200", "200_plus"];
const CONTACT_METHODS = ["email", "phone", "text"] as const;

const GUEST_RANGE_TO_INT: Record<string, number> = {
  under25: 20,
  "25_50": 40,
  "50_100": 75,
  "100_200": 150,
  "200_plus": 250,
};

function ContactPage() {
  const { t } = useTranslation();
  const { prefill } = useSearch({ from: "/contact" });
  const [submitted, setSubmitted] = useState(false);
  const createFn = useServerFn(createQuoteRequest);

  const m = useMutation({
    mutationFn: async (fd: FormData) => {
      const rentals = fd.getAll("rentals").map(String);
      const messageParts: string[] = [];
      if (rentals.length) messageParts.push(`Interested in: ${rentals.map((k) => t(`contact.rentalOptions.${k}`)).join(", ")}`);
      const msg = String(fd.get("message") ?? "").trim();
      if (msg) messageParts.push(msg);
      const guestKey = String(fd.get("guests") ?? "");
      const guestCount = GUEST_RANGE_TO_INT[guestKey] ?? null;
      const pcm = String(fd.get("contactMethod") ?? "email") as "email" | "phone" | "text";
      return createFn({
        data: {
          customer_name: String(fd.get("name") ?? "").trim(),
          customer_email: String(fd.get("email") ?? "").trim(),
          customer_phone: String(fd.get("phone") ?? "").trim() || null,
          preferred_contact_method: pcm,
          event_type: t(`contact.eventTypes.${String(fd.get("type") ?? "")}`, String(fd.get("type") ?? "")) || null,
          event_date: String(fd.get("date") ?? "") || null,
          event_location: String(fd.get("location") ?? "").trim() || null,
          guest_count: guestCount,
          customer_note: messageParts.join("\n\n") || null,
          request_type: "rental",
        },
      });
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: Error) => toast.error(e.message || "Could not send request"),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    m.mutate(new FormData(e.currentTarget));
  }


  return (
    <SiteLayout>
      <PageHero
        eyebrow={t("contact.hero.eyebrow")}
        title={t("contact.hero.title")}
        subtitle={t("contact.hero.subtitle")}
      />
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          {submitted ? (
            <div className="py-10 text-center">
              <h2 className="font-serif text-3xl text-primary">{t("contact.thankYou.title")}</h2>
              <p className="mt-4 text-muted-foreground">
                {t("contact.thankYou.body")}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-5">
              {prefill && (
                <div className="rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 px-4 py-3 text-sm text-primary">
                  <strong className="font-semibold">{t("contact.fromRecommender")}</strong> {prefill}
                </div>
              )}
              <Row>
                <Field label={t("contact.fields.fullName")}><input required maxLength={100} name="name" className={input} /></Field>
                <Field label={t("contact.fields.email")}><input required type="email" maxLength={255} name="email" className={input} /></Field>
              </Row>
              <Row>
                <Field label={t("contact.fields.phone")}><input required type="tel" maxLength={30} name="phone" className={input} /></Field>
                <Field label={t("contact.fields.eventDate")}><input required type="date" name="date" className={input} /></Field>
              </Row>
              <Field label={t("contact.fields.eventLocation")}>
                <input required maxLength={200} name="location" className={input} placeholder={t("contact.fields.eventLocationPlaceholder")} />
              </Field>
              <Row>
                <Field label={t("contact.fields.eventType")}>
                  <select required name="type" className={input} defaultValue="">
                    <option value="" disabled>{t("contact.selectOption")}</option>
                    {EVENT_TYPE_KEYS.map(k => <option key={k} value={k}>{t(`contact.eventTypes.${k}`)}</option>)}
                  </select>
                </Field>
                <Field label={t("contact.fields.guestCount")}>
                  <select required name="guests" className={input} defaultValue="">
                    <option value="" disabled>{t("contact.selectRange")}</option>
                    {GUEST_RANGE_KEYS.map(k => <option key={k} value={k}>{t(`contact.guestRanges.${k}`)}</option>)}
                  </select>
                </Field>
              </Row>

              <Field label={t("contact.fields.rentalsInterest")}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RENTAL_KEYS.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="rentals" value={k} className="accent-[color:var(--navy)]" />
                      <span className="text-foreground">{t(`contact.rentalOptions.${k}`)}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label={t("contact.fields.preferredContact")}>
                <div className="flex flex-wrap gap-5 text-sm">
                  {CONTACT_METHODS.map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name="contactMethod" value={m} defaultChecked={m === "email"} className="accent-[color:var(--navy)]" />
                      <span>{t(`contact.contactMethod.${m}`)}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label={t("contact.fields.message")}>
                <textarea name="message" rows={5} maxLength={2000} className={input} placeholder={t("contact.fields.messagePlaceholder")} defaultValue={prefill ?? ""} />
              </Field>

              <button type="submit" className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
                {t("contact.submit")}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <h3 className="font-serif text-xl text-primary">{t("contact.sidebar.title")}</h3>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-primary" /> {t("contact.sidebar.phonePlaceholder")}</li>
              <li className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 text-primary" /> {t("contact.sidebar.emailPlaceholder")}</li>
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {t("contact.sidebar.areaServed")}</li>
              <li className="flex items-start gap-3"><Facebook className="mt-0.5 h-4 w-4 text-primary" /> {t("contact.sidebar.facebook")}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-6 text-sm text-primary">
            <strong className="font-semibold">{t("contact.sidebar.noteTitle")}</strong>{" "}
            {t("contact.sidebar.noteBody")}
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
