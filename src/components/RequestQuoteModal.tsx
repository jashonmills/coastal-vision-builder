import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, X, CheckCircle2, FileText, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { requestQuoteForRecommendation } from "@/lib/saved-recommendations.functions";
import { createQuoteRequest } from "@/lib/quotes.functions";
import { openQuoteRequestMailto } from "@/lib/quote-request";
import { TrustDisclaimer } from "./TrustDisclaimer";
import type { AIRecommendation } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";

export function RequestQuoteModal({
  open,
  onClose,
  recommendationId,
  input,
  recommendation,
  contact,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  recommendationId: string;
  input: RecommenderInput;
  recommendation: AIRecommendation;
  contact: { name?: string; email?: string; phone?: string; preferredContact?: string } | null;
  userEmail?: string | null;
}) {
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();
  const requestFn = useServerFn(requestQuoteForRecommendation);
  const createReqFn = useServerFn(createQuoteRequest);

  useEffect(() => {
    if (!open) {
      // Reset success state when modal fully closes so it can be re-opened cleanly
      const t = setTimeout(() => setSuccess(false), 300);
      return () => clearTimeout(t);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const m = useMutation({
    mutationFn: async () => {
      const email = contact?.email || userEmail || "";
      const name = contact?.name || (email ? email.split("@")[0] : "Customer");
      const pref = (contact?.preferredContact === "phone" || contact?.preferredContact === "text")
        ? contact.preferredContact as "phone" | "text"
        : "email";
      await createReqFn({
        data: {
          saved_recommendation_id: recommendationId,
          customer_name: name,
          customer_email: email,
          customer_phone: contact?.phone ?? null,
          preferred_contact_method: pref,
          event_type: input.eventType ?? null,
          event_date: input.eventDate ?? null,
          event_location: input.location ?? null,
          guest_count: typeof input.guestCount === "number" ? input.guestCount : null,
          planner_input: input,
          recommendation,
          customer_note: note.trim() || null,
        },
      });
      return requestFn({ data: { id: recommendationId, note: note.trim() || null } });
    },
    onSuccess: () => {
      const viewUrl = typeof window !== "undefined" ? `${window.location.origin}/account/${recommendationId}` : undefined;
      openQuoteRequestMailto({
        recommendationId,
        input,
        recommendation,
        contact: { ...contact, email: contact?.email || userEmail || undefined },
        note: note.trim() || undefined,
        viewUrl,
      });
      qc.invalidateQueries({ queryKey: ["my-recommendations"] });
      qc.invalidateQueries({ queryKey: ["saved-rec", recommendationId] });
      qc.invalidateQueries({ queryKey: ["admin-quote-requests"] });
      qc.invalidateQueries({ queryKey: ["new-quote-requests-count"] });
      setSuccess(true);
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("already been sent")
        ? "This plan has already been sent for a quote."
        : err.message || "Could not send quote request.";
      toast.error(msg);
    },
  });

  if (!open) return null;

  const recommendedTent = recommendation.picks?.find((p) => p.category === "Canopy")?.item_name ?? "—";
  const eventDateLabel = input.eventDate
    ? new Date(input.eventDate + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "—";
  const eventSummary = `${input.eventType ?? "Event"} · ${input.guestCount ?? "?"} guests · ${eventDateLabel}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {success ? (
          <>
            <div className="flex items-start justify-between border-b border-border bg-emerald-50 px-6 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 flex-none text-emerald-600" />
                <div>
                  <h2 className="font-serif text-xl text-primary">Your quote request was sent.</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pacific North Events &amp; Tents will review your event plan and follow up with a custom quote.
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-primary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm">
              <div className="rounded-lg border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Event</p>
                <p className="mt-1 font-medium text-foreground">{eventSummary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next steps</p>
                <ol className="mt-2 space-y-1.5 text-sm text-foreground">
                  <li><span className="mr-2 font-semibold text-primary">1.</span> The team reviews your setup.</li>
                  <li><span className="mr-2 font-semibold text-primary">2.</span> They adjust pricing and confirm availability.</li>
                  <li><span className="mr-2 font-semibold text-primary">3.</span> You receive a quote by email.</li>
                </ol>
              </div>
              <TrustDisclaimer variant="compact" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-3">
              <Link
                to="/account"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <FileText className="h-3.5 w-3.5" /> View My Saved Plans
              </Link>
              <Link
                to="/ai-tent-planner"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Start Another Plan
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-serif text-xl text-primary">Request a Quote for This Plan?</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  We'll send this event plan, blueprint, equipment list, and your contact details to Pacific North Events &amp; Tents so they can follow up with a custom quote.
                </p>
              </div>
              <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-primary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <Row label="Event type" value={input.eventType} />
                  <Row label="Event date" value={eventDateLabel} />
                  <Row label="Guest count" value={String(input.guestCount)} />
                  <Row label="Location" value={input.location || "—"} />
                  <Row label="Recommended tent" value={recommendedTent} />
                  <Row label="Your email" value={contact?.email || userEmail || "—"} />
                </dl>
              </div>
              <label className="block text-sm">
                <span className="font-medium text-foreground">Add a note for the team (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Example: We're flexible on tent size, but want the best setup for wind protection."
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <TrustDisclaimer variant="compact" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-3">
              <button onClick={onClose} disabled={m.isPending} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={() => m.mutate()}
                disabled={m.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
              >
                {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Quote Request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </>
  );
}

export type PlanStatus = "plan_created" | "quote_requested" | "quote_sent" | "booked" | "archived";

export function StatusBadge({ status, className = "" }: { status: PlanStatus | string; className?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    plan_created: { label: "Plan Created", cls: "bg-secondary text-foreground" },
    quote_requested: { label: "Quote Requested", cls: "bg-[color:var(--gold)]/15 text-[color:var(--gold)] border-[color:var(--gold)]/40" },
    quote_in_review: { label: "Quote In Review", cls: "bg-blue-100 text-blue-800 border-blue-300" },
    quote_sent: { label: "Quote Sent", cls: "bg-[color:var(--seafoam,#9bc7c0)]/25 text-primary border-primary/30" },
    booked: { label: "Booked", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    archived: { label: "Archived", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] || map.plan_created;
  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${m.cls} ${className}`}>
      {m.label}
    </span>
  );
}
