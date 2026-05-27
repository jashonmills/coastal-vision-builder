import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import type { RecommenderInput } from "@/lib/recommender";
import { generateRecommendation, type AIRecommendation, type Pick } from "@/lib/recommender.functions";
import { Check, ChevronLeft, ChevronRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/recommender")({
  head: () => ({
    meta: [
      { title: "Event Recommender | Pacific North Events & Tents" },
      { name: "description", content: "AI-powered event setup recommender. Get a tent, table, chair, and equipment plan with a blueprint layout for your Oregon Coast event." },
    ],
  }),
  component: RecommenderPage,
});

const empty: RecommenderInput = {
  eventType: "Wedding",
  eventDate: "",
  location: "",
  outdoor: "Fully outdoors",
  guestCount: 50,
  setupType: "Seated dining",
  seated: "Yes, all guests seated",
  tableStyle: "Round tables",
  food: "Yes, buffet",
  dancing: "Yes, dance floor area needed",
  extras: [],
  rentals: [],
  surface: "Grass",
  exposure: "Somewhat exposed",
  sidewalls: "Maybe",
  afterSunset: "Yes",
};

const STEPS = ["Event Basics", "Guests & Layout", "Food & Extras", "Location & Weather", "Your Details"];

const CATEGORY_ORDER = [
  "Canopy",
  "Canopy Options",
  "Canopy Cleaning Fee",
  "Tables",
  "Chairs",
  "Specialty Items",
  "Delivery",
];

function RecommenderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<RecommenderInput>(empty);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", method: "Email", notes: "" });

  const generateFn = useServerFn(generateRecommendation);
  const mutation = useMutation({
    mutationFn: (input: RecommenderInput) => generateFn({ data: input }),
    onError: (err) => {
      console.error("[recommender] generateRecommendation failed:", err);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onSuccess: (res) => {
      console.log("[recommender] success", res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  function set<K extends keyof RecommenderInput>(k: K, v: RecommenderInput[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }
  function toggle(field: "extras" | "rentals", val: string) {
    setData((d) => {
      const has = d[field].includes(val);
      return { ...d, [field]: has ? d[field].filter((x) => x !== val) : [...d[field], val] };
    });
  }

  function next() {
    if (step === 0 && (!data.eventDate || !data.location)) return;
    if (step === STEPS.length - 1) {
      if (!contact.name || !contact.email) return;
      mutation.mutate(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(0, s - 1)); }
  function reset() {
    setData(empty);
    setContact({ name: "", email: "", phone: "", method: "Email", notes: "" });
    mutation.reset();
    setStep(0);
  }

  function sendToQuote() {
    const r = mutation.data?.recommendation;
    if (!r) return;
    const picksSummary = (r.picks ?? [])
      .map((p) => `${p.quantity}× ${p.item_name} (${p.category})`)
      .join("; ");
    const prefill = `AI Recommendation: ${r.headline}. ${r.summary} Items: ${picksSummary}. Event: ${data.eventType}, ${data.guestCount} guests, ${data.eventDate} at ${data.location}.`;
    navigate({ to: "/contact", search: { prefill } });
  }

  const result = mutation.data;
  const hasValidResult = !!result?.recommendation?.picks;
  const showForm = !hasValidResult && !mutation.isPending;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Event Recommender"
        title="Find the Right Setup for Your Event"
        subtitle="Answer a few quick questions and our AI will recommend a complete tent, table, chair, and equipment plan — plus a blueprint of your layout."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        {showForm && (
          <>
            <p className="mb-8 text-center text-muted-foreground">
              Every event is different. We'll review your inventory needs across tents, tables, chairs, and specialty items so you have a complete picture before requesting a quote.
            </p>

            <ol className="mb-10 flex flex-wrap items-center gap-2 text-xs">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className={`hidden sm:inline ${i === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s}</span>
                  {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:inline-block" />}
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
              {step === 0 && (
                <Step title="Event basics">
                  <Q label="What type of event are you planning?">
                    <Select value={data.eventType} onChange={(v) => set("eventType", v as RecommenderInput["eventType"])} options={["Wedding","Festival","Private Party","Corporate Event","Market / Vendor Event","Fundraiser","Community Event","Graduation Party","Other"]} />
                  </Q>
                  <Q label="What is your event date? *">
                    <input required type="date" value={data.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={inp} />
                  </Q>
                  <Q label="Where will the event be held? *">
                    <input required value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="Venue name, backyard, park, beach area, business location, etc." className={inp} />
                  </Q>
                  <Q label="Is the event outdoors, indoors, or partially covered?">
                    <Cards value={data.outdoor} onChange={(v) => set("outdoor", v as RecommenderInput["outdoor"])} options={["Fully outdoors","Indoors","Partially covered","Not sure yet"]} />
                  </Q>
                </Step>
              )}

              {step === 1 && (
                <Step title="Guest count & layout">
                  <Q label="How many guests are you expecting? *">
                    <input type="number" min={1} value={data.guestCount} onChange={(e) => set("guestCount", parseInt(e.target.value) || 0)} className={inp} />
                  </Q>
                  <Q label="What kind of setup do you need?">
                    <Cards value={data.setupType} onChange={(v) => set("setupType", v as RecommenderInput["setupType"])} options={["Standing only","Ceremony seating","Seated dining","Cocktail tables / mingling","Vendor booths","Food service area","Mixed layout","Not sure"]} />
                  </Q>
                  <Q label="Will guests be seated at tables?">
                    <Cards value={data.seated} onChange={(v) => set("seated", v)} options={["Yes, all guests seated","Some seated, some standing","No, mostly standing","Not sure"]} />
                  </Q>
                  <Q label="What table style do you prefer?">
                    <Cards value={data.tableStyle} onChange={(v) => set("tableStyle", v)} options={["Round tables","Banquet / rectangular tables","Cocktail tables","Picnic-style tables","No tables needed","Not sure"]} />
                  </Q>
                </Step>
              )}

              {step === 2 && (
                <Step title="Food, dancing & extras">
                  <Q label="Will there be food or catering under the tent?">
                    <Cards value={data.food} onChange={(v) => set("food", v)} options={["Yes, buffet","Yes, plated meal","Yes, food trucks nearby","Yes, snack / dessert table only","No food service","Not sure"]} />
                  </Q>
                  <Q label="Do you need space for dancing?">
                    <Cards value={data.dancing} onChange={(v) => set("dancing", v)} options={["Yes, dance floor area needed","Small dancing area","No dancing area","Not sure"]} />
                  </Q>
                  <Q label="Will there be a bar, gift table, DJ, band, or stage?">
                    <Checks selected={data.extras} onToggle={(v) => toggle("extras", v)} options={["Bar area","Gift table","Dessert table","DJ booth","Live band","Small stage","Speaker / announcement area","None","Not sure"]} />
                  </Q>
                  <Q label="What rental items are you interested in?">
                    <Checks selected={data.rentals} onToggle={(v) => toggle("rentals", v)} options={["Tent","Tables","Chairs","Linens","Lighting","Dance floor","Sidewalls","Heaters","Flooring","Vendor tents","Trash / recycling stations","Setup and breakdown","Not sure yet"]} />
                  </Q>
                </Step>
              )}

              {step === 3 && (
                <Step title="Location & weather">
                  <Q label="What type of surface will the tent be set up on?">
                    <Cards value={data.surface} onChange={(v) => set("surface", v)} options={["Grass","Gravel","Concrete","Asphalt","Sand","Deck / patio","Mixed surface","Not sure"]} />
                  </Q>
                  <Q label="Is the location exposed to wind or coastal weather?">
                    <Cards value={data.exposure} onChange={(v) => set("exposure", v as RecommenderInput["exposure"])} options={["Yes, very exposed","Somewhat exposed","Mostly protected","Not sure"]} />
                  </Q>
                  <Q label="Would you like sidewalls for extra weather protection?">
                    <Cards value={data.sidewalls} onChange={(v) => set("sidewalls", v)} options={["Yes","Maybe","No","Not sure"]} />
                  </Q>
                  <Q label="Will the event continue after sunset?">
                    <Cards value={data.afterSunset} onChange={(v) => set("afterSunset", v as RecommenderInput["afterSunset"])} options={["Yes","No","Not sure"]} />
                  </Q>
                </Step>
              )}

              {step === 4 && (
                <Step title="Your details">
                  <Q label="Full Name *"><input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inp} /></Q>
                  <Q label="Email Address *"><input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inp} /></Q>
                  <Q label="Phone Number"><input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inp} /></Q>
                  <Q label="Preferred Contact Method">
                    <Cards value={contact.method} onChange={(v) => setContact({ ...contact, method: v })} options={["Email","Phone","Text"]} />
                  </Q>
                  <Q label="Anything else we should know about your event?">
                    <textarea rows={4} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className={inp} />
                  </Q>
                </Step>
              )}

              {mutation.isError && (
                <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {(mutation.error as Error)?.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                <button type="button" onClick={back} disabled={step === 0} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-3.5 w-3.5" /> Start Over
                  </button>
                  <button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
                    {step === STEPS.length - 1 ? "Generate My Setup" : "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {mutation.isPending && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-6 font-serif text-2xl text-primary">Designing your event setup…</p>
            <p className="mt-2 text-sm text-muted-foreground">Our AI is reviewing inventory and drafting your blueprint. This usually takes 15–30 seconds.</p>
          </div>
        )}

        {result && (
          <AIResult
            recommendation={result.recommendation}
            blueprintImage={result.blueprintImage}
            input={data}
            contact={contact}
            onReset={reset}
            onSend={sendToQuote}
          />
        )}
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
          <h2 className="font-serif text-3xl text-primary sm:text-4xl">Not Sure Yet? That's Okay.</h2>
          <p className="mt-4 text-muted-foreground">
            You don't need to know every detail before reaching out. If you have a date, a location, and a rough guest count, we can help guide the rest.
          </p>
          <a href="/contact" className="mt-7 inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground hover:bg-[color:var(--navy-soft)]">
            Talk to Us
          </a>
        </div>
      </section>
    </SiteLayout>
  );
}

function AIResult({
  recommendation,
  blueprintImage,
  input,
  contact,
  onReset,
  onSend,
}: {
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  input: RecommenderInput;
  contact: { name: string; email: string; phone: string; method: string; notes: string };
  onReset: () => void;
  onSend: () => void;
}) {
  const grouped = new Map<string, Pick[]>();
  for (const p of recommendation.picks) {
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const firstName = contact.name.trim().split(/\s+/)[0] || "there";
  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "your selected date";

  const recapRows: Array<[string, string]> = [
    ["Event type", input.eventType],
    ["Date", eventDateLabel],
    ["Location", input.location || "—"],
    ["Setting", input.outdoor],
    ["Guests", String(input.guestCount)],
    ["Setup", input.setupType],
    ["Seating", input.seated],
    ["Tables", input.tableStyle],
    ["Food", input.food],
    ["Dancing", input.dancing],
    ["Surface", input.surface],
    ["Exposure", input.exposure],
    ["Sidewalls", input.sidewalls],
    ["After sunset", input.afterSunset],
  ];

  return (
    <div className="space-y-8">
      {/* Review intro */}
      <div className="rounded-2xl border border-border bg-card p-8 shadow-md sm:p-10">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">Your Recommendation Is Ready</p>
          <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">{recommendation.headline}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-foreground">
            Thanks {firstName} — we reviewed your {input.eventType.toLowerCase()} for{" "}
            <span className="font-semibold">{input.guestCount} guests</span> on{" "}
            <span className="font-semibold">{eventDateLabel}</span>
            {input.location ? <> at <span className="font-semibold">{input.location}</span></> : null}. Based on your answers, here's what we'd recommend.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{recommendation.summary}</p>
        </div>
      </div>

      {/* Input recap */}
      <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <h3 className="font-serif text-xl text-primary">Your event at a glance</h3>
        <p className="mt-1 text-xs text-muted-foreground">A quick summary of what you told us.</p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {recapRows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 text-sm">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {(input.extras.length > 0 || input.rentals.length > 0) && (
          <div className="mt-5 space-y-3">
            {input.extras.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Extras requested</p>
                <div className="flex flex-wrap gap-1.5">
                  {input.extras.map((e) => (
                    <span key={e} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">{e}</span>
                  ))}
                </div>
              </div>
            )}
            {input.rentals.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Rentals of interest</p>
                <div className="flex flex-wrap gap-1.5">
                  {input.rentals.map((e) => (
                    <span key={e} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blueprint sketch */}
      {blueprintImage && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-md">
          <div className="border-b border-border px-6 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">Suggested Layout</p>
            <p className="mt-1 font-serif text-xl text-primary">Blueprint Sketch</p>
          </div>
          <img src={blueprintImage} alt="Top-down blueprint sketch of recommended event layout" className="mx-auto block w-full max-w-2xl" />
          <div className="border-t border-border px-6 py-4 text-center">
            <p className="text-sm font-medium text-foreground">{recommendation.layout_caption}</p>
            <p className="mt-1 text-xs text-muted-foreground">Conceptual sketch — final placement confirmed during quoting.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-8 shadow-md sm:p-10">
        <h3 className="font-serif text-2xl text-primary">Recommended Setup</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A complete inventory selection across every category. Quantities are an estimate.
        </p>

        <div className="mt-6 space-y-6">
          {orderedCategories.map((cat) => (
            <div key={cat}>
              <h4 className="border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">
                {cat}
              </h4>
              <ul className="mt-3 space-y-2">
                {grouped.get(cat)!.map((p, i) => (
                  <li key={`${p.item_id}-${i}`} className="flex items-start gap-3 rounded-lg bg-secondary/40 px-3 py-2.5 text-sm">
                    <span className="inline-flex min-w-[2.25rem] justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {p.quantity}×
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{p.item_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {recommendation.weather_notes.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-background p-5">
            <h4 className="font-serif text-lg text-primary">Weather & Setup Notes</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {recommendation.weather_notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[color:var(--forest)]" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 rounded-lg bg-secondary/60 p-4 text-xs text-muted-foreground">
          This is an AI-generated estimate. Final tent size, quantities, and equipment may change based on your venue, surface, layout, weather, and availability. No pricing is shown — request a quote for confirmed pricing.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={onSend} className="inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary hover:-translate-y-0.5 transition-transform">
            Send This Recommendation for a Quote
          </button>
          <button onClick={onReset} className="inline-flex items-center gap-1 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary">
            <RefreshCw className="h-4 w-4" /> Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-7">
      <h2 className="font-serif text-2xl text-primary">{title}</h2>
      {children}
    </div>
  );
}
function Q({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inp}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
function Cards({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            value === o
              ? "border-primary bg-primary/5 text-primary font-semibold"
              : "border-border bg-background text-foreground hover:border-primary/40"
          }`}>
          {o}
        </button>
      ))}
    </div>
  );
}
function Checks({ selected, onToggle, options }: { selected: string[]; onToggle: (v: string) => void; options: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
              on ? "border-primary bg-primary/5 text-primary font-semibold" : "border-border bg-background hover:border-primary/40"
            }`}>
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {on && <Check className="h-3 w-3" />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}
