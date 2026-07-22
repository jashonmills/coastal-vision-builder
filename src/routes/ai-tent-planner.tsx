import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { RecommendationReport } from "@/components/RecommendationViewer";
import { BeaconCallout } from "@/components/BeaconCallout";
import { useAuth } from "@/hooks/use-auth";
import { saveRecommendation } from "@/lib/saved-recommendations.functions";
import { createQuoteRequest } from "@/lib/quotes.functions";
import type { RecommenderInput } from "@/lib/recommender";
import { generateRecommendation, type AIRecommendation, type Pick } from "@/lib/recommender.functions";
import { downloadRecommendationPdf, printRecommendationPdf } from "@/lib/recommendation-pdf";
import { Check, ChevronLeft, ChevronRight, Download, FileText, Loader2, Printer, RefreshCw, Save, Sparkles, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/ai-tent-planner")({
  head: () => ({
    meta: [
      { title: "AI Tent Planner | Pacific North Events & Tents" },
      { name: "description", content: "Free AI Tent Planner. Get a custom tent size recommendation, equipment checklist, and blueprint-style event layout in minutes." },
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

const STEP_KEYS = ["eventBasics", "guestLayout", "extras", "locationWeather", "contact"];

const CATEGORY_ORDER = [
  "Canopy",
  "Canopy Options",
  "Canopy Cleaning Fee",
  "Tables",
  "Chairs",
  "Specialty Items",
  "Delivery",
];

// Option lists (stable internal values — translation lookup via recommender.options.<cat>.<value>)
const OPT_EVENT_TYPE = ["Wedding","Festival","Private Party","Corporate Event","Market / Vendor Event","Fundraiser","Community Event","Graduation Party","Other"];
const OPT_OUTDOOR = ["Fully outdoors","Indoors","Partially covered","Not sure yet"];
const OPT_SETUP = ["Standing only","Ceremony seating","Seated dining","Cocktail tables / mingling","Vendor booths","Food service area","Mixed layout","Not sure"];
const OPT_SEATED = ["Yes, all guests seated","Some seated, some standing","No, mostly standing","Not sure"];
const OPT_TABLE = ["Round tables","Banquet / rectangular tables","Cocktail tables","Picnic-style tables","No tables needed","Not sure"];
const OPT_FOOD = ["Yes, buffet","Yes, plated meal","Yes, food trucks nearby","Yes, snack / dessert table only","No food service","Not sure"];
const OPT_DANCING = ["Yes, dance floor area needed","Small dancing area","No dancing area","Not sure"];
const OPT_EXTRAS = ["Bar area","Gift table","Dessert table","DJ booth","Live band","Small stage","Speaker / announcement area","None","Not sure"];
const OPT_RENTALS = ["Tent","Tables","Chairs","Linens","Lighting","Dance floor","Sidewalls","Heaters","Flooring","Vendor tents","Trash / recycling stations","Setup and breakdown","Not sure yet"];
const OPT_SURFACE = ["Grass","Gravel","Concrete","Asphalt","Sand","Deck / patio","Mixed surface","Not sure"];
const OPT_EXPOSURE = ["Yes, very exposed","Somewhat exposed","Mostly protected","Not sure"];
const OPT_SIDEWALLS = ["Yes","Maybe","No","Not sure"];
const OPT_AFTER_SUNSET = ["Yes","No","Not sure"];
const OPT_CONTACT = ["Email","Phone","Text"];

function RecommenderPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<RecommenderInput>(empty);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", method: "Email", notes: "" });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [beaconDismissed, setBeaconDismissed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const generateFn = useServerFn(generateRecommendation);
  const leadFn = useServerFn(createQuoteRequest);
  const saveFn = useServerFn(saveRecommendation);
  const mutation = useMutation({
    mutationFn: (input: RecommenderInput) => generateFn({ data: input }),
    onError: (err) => {
      console.error("[recommender] generateRecommendation failed:", err);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onSuccess: async (res, input) => {
      console.log("[recommender] success", res);
      setViewerOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (!contact.name || !contact.email) return;

      // For signed-in users: save the recommendation FIRST so the lead can be
      // linked back to it. `createQuoteRequest` owns the single admin
      // notification + single customer acknowledgement email, so we don't
      // duplicate them from `saveRecommendation`.
      let linkedSavedId: string | null = null;
      if (user) {
        try {
          const saved = await saveFn({
            data: {
              title: `${input.eventType} · ${input.guestCount} guests${input.location ? ` · ${input.location}` : ""}`,
              event_date: input.eventDate || null,
              location: input.location || null,
              input,
              recommendation: res.recommendation,
              blueprint_image: res.blueprintImage,
              perspective_image: res.perspectiveImage ?? null,
              contact,
            },
          });
          linkedSavedId = saved.id;
          setSavedId(saved.id);
        } catch (err) {
          console.error("[recommender] saveRecommendation failed:", err);
        }
      }

      const pcm = (contact.method || "Email").toLowerCase() as "email" | "phone" | "text";
      const notes: string[] = [];
      notes.push("Submitted via AI Tent Planner");
      if (res.recommendation?.headline) notes.push(`Recommendation: ${res.recommendation.headline}`);
      if (contact.notes) notes.push(contact.notes);
      leadFn({
        data: {
          saved_recommendation_id: linkedSavedId,
          customer_name: contact.name,
          customer_email: contact.email,
          customer_phone: contact.phone || null,
          preferred_contact_method: pcm,
          event_type: input.eventType || null,
          event_date: input.eventDate || null,
          event_location: input.location || null,
          guest_count: input.guestCount ?? null,
          planner_input: input,
          recommendation: res.recommendation,
          customer_note: notes.join("\n\n"),
          request_type: "rental",
        },
      }).catch((err) => console.error("[recommender] lead create failed:", err));
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
    if (step === STEP_KEYS.length - 1) {
      if (!contact.name || !contact.email) return;
      mutation.mutate(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() {
    setData(empty);
    setContact({ name: "", email: "", phone: "", method: "Email", notes: "" });
    mutation.reset();
    setViewerOpen(false);
    setStep(0);
    setSavedId(null);
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

  // Helper: translate an option value via "recommender.options.<cat>.<value>"
  const tOpt = (cat: string, value: string) => t(`recommender.options.${cat}.${value}`, { defaultValue: value });

  return (
    <SiteLayout>
      <PageHero slot="planner.hero"
        eyebrow={t("recommender.heroEyebrow")}
        title={t("recommender.heroTitle")}
        subtitle={t("recommender.heroSubtitle")}
      />

      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        {showForm && (
          <>
            <p className="mb-8 text-center text-muted-foreground">
              {t("recommender.intro")}
            </p>

            <ol className="mb-10 flex flex-wrap items-center gap-2 text-xs">
              {STEP_KEYS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className={`hidden sm:inline ${i === step ? "font-semibold text-primary" : "text-muted-foreground"}`}>{t(`recommender.steps.${s}`)}</span>
                  {i < STEP_KEYS.length - 1 && <span className="mx-1 hidden h-px w-6 bg-border sm:inline-block" />}
                </li>
              ))}
            </ol>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10">
              {step === 0 && (
                <Step title={t("recommender.stepTitles.eventBasics")}>
                  <Q label={t("recommender.fields.eventType")}>
                    <Select value={data.eventType} onChange={(v) => set("eventType", v as RecommenderInput["eventType"])} options={OPT_EVENT_TYPE} tOpt={(v) => tOpt("eventTypes", v)} />
                  </Q>
                  <Q label={t("recommender.fields.eventDate")}>
                    <input required type="date" value={data.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={inp} />
                  </Q>
                  <Q label={t("recommender.fields.eventLocation")}>
                    <input required value={data.location} onChange={(e) => set("location", e.target.value)} placeholder={t("recommender.fields.eventLocationPlaceholder")} className={inp} />
                  </Q>
                  <Q label={t("recommender.fields.outdoorIndoor")}>
                    <Cards value={data.outdoor} onChange={(v) => set("outdoor", v as RecommenderInput["outdoor"])} options={OPT_OUTDOOR} tOpt={(v) => tOpt("outdoor", v)} />
                  </Q>
                  {!beaconDismissed && <BeaconCallout input={data} onDismiss={() => setBeaconDismissed(true)} />}
                </Step>
              )}

              {step === 1 && (
                <Step title={t("recommender.stepTitles.guestLayout")}>
                  <Q label={t("recommender.fields.guestCount")}>
                    <input type="number" min={1} value={data.guestCount} onChange={(e) => set("guestCount", parseInt(e.target.value) || 0)} className={inp} />
                  </Q>
                  <Q label={t("recommender.fields.setupType")}>
                    <Cards value={data.setupType} onChange={(v) => set("setupType", v as RecommenderInput["setupType"])} options={OPT_SETUP} tOpt={(v) => tOpt("setup", v)} />
                  </Q>
                  <Q label={t("recommender.fields.seatedGuests")}>
                    <Cards value={data.seated} onChange={(v) => set("seated", v)} options={OPT_SEATED} tOpt={(v) => tOpt("seated", v)} />
                  </Q>
                  <Q label={t("recommender.fields.tableStyle")}>
                    <Cards value={data.tableStyle} onChange={(v) => set("tableStyle", v)} options={OPT_TABLE} tOpt={(v) => tOpt("tableStyle", v)} />
                  </Q>
                </Step>
              )}

              {step === 2 && (
                <Step title={t("recommender.stepTitles.extras")}>
                  <Q label={t("recommender.fields.foodService")}>
                    <Cards value={data.food} onChange={(v) => set("food", v)} options={OPT_FOOD} tOpt={(v) => tOpt("food", v)} />
                  </Q>
                  <Q label={t("recommender.fields.dancing")}>
                    <Cards value={data.dancing} onChange={(v) => set("dancing", v)} options={OPT_DANCING} tOpt={(v) => tOpt("dancing", v)} />
                  </Q>
                  <Q label={t("recommender.fields.extras")}>
                    <Checks selected={data.extras} onToggle={(v) => toggle("extras", v)} options={OPT_EXTRAS} tOpt={(v) => tOpt("extras", v)} />
                  </Q>
                  <Q label={t("recommender.fields.rentalItems")}>
                    <Checks selected={data.rentals} onToggle={(v) => toggle("rentals", v)} options={OPT_RENTALS} tOpt={(v) => tOpt("rentals", v)} />
                  </Q>
                </Step>
              )}

              {step === 3 && (
                <Step title={t("recommender.stepTitles.locationWeather")}>
                  <Q label={t("recommender.fields.surface")}>
                    <Cards value={data.surface} onChange={(v) => set("surface", v)} options={OPT_SURFACE} tOpt={(v) => tOpt("surface", v)} />
                  </Q>
                  <Q label={t("recommender.fields.weatherExposure")}>
                    <Cards value={data.exposure} onChange={(v) => set("exposure", v as RecommenderInput["exposure"])} options={OPT_EXPOSURE} tOpt={(v) => tOpt("exposure", v)} />
                  </Q>
                  <Q label={t("recommender.fields.sidewalls")}>
                    <Cards value={data.sidewalls} onChange={(v) => set("sidewalls", v)} options={OPT_SIDEWALLS} tOpt={(v) => tOpt("sidewalls", v)} />
                  </Q>
                  <Q label={t("recommender.fields.afterSunset")}>
                    <Cards value={data.afterSunset} onChange={(v) => set("afterSunset", v as RecommenderInput["afterSunset"])} options={OPT_AFTER_SUNSET} tOpt={(v) => tOpt("afterSunset", v)} />
                  </Q>
                </Step>
              )}

              {step === 4 && (
                <Step title={t("recommender.stepTitles.contact")}>
                  <Q label={t("recommender.fields.fullName")}><input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={inp} /></Q>
                  <Q label={t("recommender.fields.email")}><input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={inp} /></Q>
                  <Q label={t("recommender.fields.phone")}><input type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inp} /></Q>
                  <Q label={t("recommender.fields.preferredContact")}>
                    <Cards value={contact.method} onChange={(v) => setContact({ ...contact, method: v })} options={OPT_CONTACT} tOpt={(v) => tOpt("contactMethod", v)} />
                  </Q>
                  <Q label={t("recommender.fields.message")}>
                    <textarea rows={4} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className={inp} />
                  </Q>
                </Step>
              )}

              {mutation.isError && (
                <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {(mutation.error as Error)?.message ?? t("recommender.error.generic")}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                <button type="button" onClick={back} disabled={step === 0} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" /> {t("recommender.buttons.back")}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
                    <RefreshCw className="h-3.5 w-3.5" /> {t("recommender.buttons.startOver")}
                  </button>
                  <button type="button" onClick={next} className="inline-flex items-center gap-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
                    {step === STEP_KEYS.length - 1 ? t("recommender.buttons.generate") : t("recommender.buttons.next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {showForm && mutation.isError && (
          <div className="mb-8 rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-6 text-center shadow-md">
            <p className="font-serif text-xl text-destructive">{t("recommender.error.title")}</p>
            <p className="mt-2 text-sm text-foreground">
              {(mutation.error as Error)?.message ?? t("recommender.error.generic")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("recommender.error.retryHint")}</p>
            <button
              type="button"
              onClick={() => mutation.mutate(data)}
              className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("recommender.buttons.tryAgain")}
            </button>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-6 font-serif text-2xl text-primary">{t("recommender.loading.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("recommender.loading.subtitle")}</p>
          </div>
        )}

        {hasValidResult && result && (
          <AIResult
            recommendation={result.recommendation}
            blueprintImage={result.blueprintImage}
            perspectiveImage={result.perspectiveImage ?? null}
            input={data}
            contact={contact}
            viewerOpen={viewerOpen}
            setViewerOpen={setViewerOpen}
            onReset={reset}
            onSend={sendToQuote}
            savedId={savedId}
            onSaved={setSavedId}
          />
        )}
      </section>

      <section className="bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
          <h2 className="font-serif text-3xl text-primary sm:text-4xl">{t("recommender.notSureYet.title")}</h2>
          <p className="mt-4 text-muted-foreground">
            {t("recommender.notSureYet.desc")}
          </p>
          <a href="/contact" className="mt-7 inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground hover:bg-[color:var(--navy-soft)]">
            {t("cta.talkToUs")}
          </a>
        </div>
      </section>
    </SiteLayout>
  );
}

function AIResult({
  recommendation,
  blueprintImage,
  perspectiveImage,
  input,
  contact,
  viewerOpen,
  setViewerOpen,
  onReset,
  onSend,
  savedId,
  onSaved,
}: {
  recommendation: AIRecommendation;
  blueprintImage: string | null;
  perspectiveImage: string | null;
  input: RecommenderInput;
  contact: { name: string; email: string; phone: string; method: string; notes: string };
  viewerOpen: boolean;
  setViewerOpen: (open: boolean) => void;
  onReset: () => void;
  onSend: () => void;
  savedId: string | null;
  onSaved: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const saveFn = useServerFn(saveRecommendation);
  // The parent auto-saves for signed-in users on planner completion (and links
  // the resulting id to the created lead). This mutation is kept only as a
  // manual fallback if the parent auto-save failed (e.g. plan-cap error).
  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: {
      title: `${input.eventType} · ${input.guestCount} guests${input.location ? ` · ${input.location}` : ""}`,
      event_date: input.eventDate || null,
      location: input.location || null,
      input,
      recommendation,
      blueprint_image: blueprintImage,
      perspective_image: perspectiveImage,
      contact,
    } }),
    onSuccess: (res) => onSaved(res.id),
  });
  const [pdfBusy, setPdfBusy] = useState<null | "download" | "print">(null);
  const grouped = new Map<string, Pick[]>();
  for (const p of recommendation.picks ?? []) {
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const tOpt = (cat: string, value: string) => t(`recommender.options.${cat}.${value}`, { defaultValue: value });

  const firstName = contact.name.trim().split(/\s+/)[0] || "there";
  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(i18n.language, { month: "long", day: "numeric", year: "numeric" })
    : t("recommender.results.selectedDateFallback");

  const recapRows: Array<[string, string]> = [
    [t("recommender.results.recapKeys.eventType"), tOpt("eventTypes", input.eventType)],
    [t("recommender.results.recapKeys.date"), eventDateLabel],
    [t("recommender.results.recapKeys.location"), input.location || t("recommender.results.noLocation")],
    [t("recommender.results.recapKeys.setting"), tOpt("outdoor", input.outdoor)],
    [t("recommender.results.recapKeys.guests"), String(input.guestCount)],
    [t("recommender.results.recapKeys.setup"), tOpt("setup", input.setupType)],
    [t("recommender.results.recapKeys.seating"), tOpt("seated", input.seated)],
    [t("recommender.results.recapKeys.tables"), tOpt("tableStyle", input.tableStyle)],
    [t("recommender.results.recapKeys.food"), tOpt("food", input.food)],
    [t("recommender.results.recapKeys.dancing"), tOpt("dancing", input.dancing)],
    [t("recommender.results.recapKeys.surface"), tOpt("surface", input.surface)],
    [t("recommender.results.recapKeys.exposure"), tOpt("exposure", input.exposure)],
    [t("recommender.results.recapKeys.sidewalls"), tOpt("sidewalls", input.sidewalls)],
    [t("recommender.results.recapKeys.afterSunset"), tOpt("afterSunset", input.afterSunset)],
  ];

  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [setViewerOpen, viewerOpen]);

  const pdfArgs = { recommendation, blueprintImage, perspectiveImage, input, contactName: contact.name };
  const fileName = `event-recommendation-${input.eventDate || "setup"}`;

  async function handleDownload() {
    if (pdfBusy) return;
    setPdfBusy("download");
    try { await downloadRecommendationPdf(pdfArgs, fileName); } finally { setPdfBusy(null); }
  }
  async function handlePrint() {
    if (pdfBusy) return;
    setPdfBusy("print");
    try { await printRecommendationPdf(pdfArgs); } finally { setPdfBusy(null); }
  }

  return (
    <>
      {viewerOpen && (
        <div className="fixed inset-0 z-[90] bg-primary/80 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label={t("recommender.results.pdfViewer")}>
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <FileText className="h-4 w-4" />
                {t("recommender.results.pdfViewer")}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDownload} disabled={pdfBusy !== null} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)] disabled:opacity-60">
                  {pdfBusy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {t("recommender.buttons.downloadPdf")}
                </button>
                <button type="button" onClick={handlePrint} disabled={pdfBusy !== null} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
                  {pdfBusy === "print" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} {t("recommender.buttons.print")}
                </button>
                <button type="button" onClick={() => setViewerOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary" aria-label={t("recommender.buttons.closeViewer")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-secondary/60 p-3 sm:p-6">
              <div className="mx-auto max-w-[816px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <RecommendationReport recommendation={recommendation} blueprintImage={blueprintImage} perspectiveImage={perspectiveImage} input={input} contactName={contact.name} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-md sm:p-10">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">{t("recommender.results.eyebrow")}</p>
          <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">{recommendation.headline}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-foreground">
            {t("recommender.results.thanksLead", { name: firstName, eventType: tOpt("eventTypes", input.eventType).toLowerCase() })}{" "}
            <span className="font-semibold">{t("recommender.results.guestsLabel", { guests: input.guestCount })}</span>{" "}
            {t("recommender.results.onDate")}{" "}
            <span className="font-semibold">{eventDateLabel}</span>
            {input.location ? <> {t("recommender.results.at")} <span className="font-semibold">{input.location}</span></> : null}. {t("recommender.results.thanksTrail")}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{recommendation.summary}</p>
          <button type="button" onClick={() => setViewerOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
            <FileText className="h-4 w-4" /> {t("recommender.buttons.openPdf")}
          </button>
        </div>
      </div>

      {user ? (
        <div className="rounded-2xl border border-[color:var(--forest)]/30 bg-[color:var(--forest)]/5 p-6 text-center">
          {savedId ? (
            <p className="text-sm text-foreground">
              <Check className="mr-1 inline h-4 w-4 text-[color:var(--forest)]" />
              {t("recommender.results.savedToAccount")}{" "}
              <Link to="/account" className="font-semibold text-primary underline">{t("recommender.buttons.viewPlans")}</Link>
            </p>
          ) : (
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60">
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("recommender.buttons.saveAccount")}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-[color:var(--gold)]/50 bg-[color:var(--gold)]/10 p-6 text-center">
          <UserPlus className="mx-auto h-8 w-8 text-[color:var(--gold)]" />
          <p className="mt-3 font-serif text-xl text-primary">{t("recommender.results.dontLose")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground">
            {t("recommender.results.dontLoseDesc")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate({ to: "/login", search: { next: "/ai-tent-planner" } as never })} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
              <UserPlus className="h-4 w-4" /> {t("recommender.buttons.createAccount")}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <h3 className="font-serif text-xl text-primary">{t("recommender.results.atGlance")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("recommender.results.atGlanceSub")}</p>
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
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("recommender.results.extrasRequested")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {input.extras.map((e) => (
                    <span key={e} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">{tOpt("extras", e)}</span>
                  ))}
                </div>
              </div>
            )}
            {input.rentals.length > 0 && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{t("recommender.results.rentalsOfInterest")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {input.rentals.map((e) => (
                    <span key={e} className="rounded-full bg-secondary px-3 py-1 text-xs text-foreground">{tOpt("rentals", e)}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {blueprintImage && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-md">
          <div className="border-b border-border px-6 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">{t("recommender.results.suggestedLayout")}</p>
            <p className="mt-1 font-serif text-xl text-primary">{t("recommender.results.blueprintSketch")}</p>
          </div>
          <img src={blueprintImage} alt="Top-down blueprint sketch of recommended event layout" className="mx-auto block w-full max-w-2xl" />
          {perspectiveImage && (
            <>
              <div className="border-t border-border bg-secondary/30 px-6 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">3D view</p>
              </div>
              <img src={perspectiveImage} alt="3D perspective sketch of the recommended tent and layout" className="mx-auto block w-full max-w-2xl" />
            </>
          )}
          <div className="border-t border-border px-6 py-4 text-center">
            <p className="text-sm font-medium text-foreground">{recommendation.layout_caption}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("recommender.results.blueprintNote")}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-8 shadow-md sm:p-10">
        <h3 className="font-serif text-2xl text-primary">{t("recommender.results.recommendedSetup")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("recommender.results.recommendedSetupSub")}
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

        {(recommendation.weather_notes?.length ?? 0) > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-background p-5">
            <h4 className="font-serif text-lg text-primary">{t("recommender.results.weatherNotes")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(recommendation.weather_notes ?? []).map((n, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[color:var(--forest)]" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 rounded-lg bg-secondary/60 p-4 text-xs text-muted-foreground">
          {t("recommender.results.disclaimer")}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => setViewerOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)]">
            <FileText className="h-4 w-4" /> {t("recommender.buttons.viewPdf")}
          </button>
          <button onClick={onSend} className="inline-flex items-center rounded-full bg-[color:var(--gold)] px-7 py-3 text-sm font-semibold text-primary hover:-translate-y-0.5 transition-transform">
            {t("recommender.buttons.sendForQuote")}
          </button>
          <button onClick={onReset} className="inline-flex items-center gap-1 rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary">
            <RefreshCw className="h-4 w-4" /> {t("recommender.buttons.startOver")}
          </button>
        </div>
      </div>
      </div>
    </>
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
function Select({ value, onChange, options, tOpt }: { value: string; onChange: (v: string) => void; options: string[]; tOpt: (v: string) => string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inp}>
      {options.map((o) => <option key={o} value={o}>{tOpt(o)}</option>)}
    </select>
  );
}
function Cards({ value, onChange, options, tOpt }: { value: string; onChange: (v: string) => void; options: string[]; tOpt: (v: string) => string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            value === o
              ? "border-primary bg-primary/5 text-primary font-semibold"
              : "border-border bg-background text-foreground hover:border-primary/40"
          }`}>
          {tOpt(o)}
        </button>
      ))}
    </div>
  );
}
function Checks({ selected, onToggle, options, tOpt }: { selected: string[]; onToggle: (v: string) => void; options: string[]; tOpt: (v: string) => string }) {
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
            {tOpt(o)}
          </button>
        );
      })}
    </div>
  );
}
