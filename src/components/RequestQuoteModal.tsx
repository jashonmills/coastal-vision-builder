import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { requestQuoteForRecommendation } from "@/lib/saved-recommendations.functions";
import { createQuoteRequest } from "@/lib/quotes.functions";
import { openQuoteRequestMailto } from "@/lib/quote-request";
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
  const qc = useQueryClient();
  const requestFn = useServerFn(requestQuoteForRecommendation);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const m = useMutation({
    mutationFn: () => requestFn({ data: { id: recommendationId, note: note.trim() || null } }),
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
      toast.success("Quote request sent! Pacific North Events & Tents will review this plan and follow up soon.");
      qc.invalidateQueries({ queryKey: ["my-recommendations"] });
      qc.invalidateQueries({ queryKey: ["saved-rec", recommendationId] });
      onClose();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
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
