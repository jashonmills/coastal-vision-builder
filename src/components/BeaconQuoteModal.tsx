import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, X, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createQuoteRequest } from "@/lib/quotes.functions";
import { TrustDisclaimer } from "./TrustDisclaimer";

export function BeaconQuoteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    eventType: "",
    guestCount: "",
    message: "",
    preferredContact: "email" as "email" | "phone" | "text",
  });
  const qc = useQueryClient();
  const createFn = useServerFn(createQuoteRequest);

  useEffect(() => {
    if (!open) {
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
      const guests = form.guestCount ? parseInt(form.guestCount, 10) : null;
      return createFn({
        data: {
          customer_name: form.name.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.phone.trim() || null,
          preferred_contact_method: form.preferredContact,
          event_type: form.eventType || null,
          event_date: form.eventDate || null,
          event_location: "Beacon on Broadway, 735 Broadway, Seaside, OR",
          guest_count: Number.isFinite(guests as number) ? (guests as number) : null,
          customer_note: form.message.trim() || null,
          request_type: "venue",
          venue: "beacon-on-broadway",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-quote-requests"] });
      qc.invalidateQueries({ queryKey: ["new-quote-requests-count"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSuccess(true);
    },
    onError: (e: Error) => toast.error(e.message || "Could not send inquiry"),
  });

  if (!open) return null;

  const input =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {success ? (
          <>
            <div className="flex items-start justify-between border-b border-border bg-emerald-50 px-6 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 flex-none text-emerald-600" />
                <div>
                  <h2 className="font-serif text-xl text-primary">Your Beacon inquiry was sent.</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll check availability for your date and follow up with a venue hold and quote.
                  </p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-6 text-sm text-muted-foreground">
              <p>Typical response time: <strong className="text-foreground">within one business day</strong>.</p>
              <button onClick={onClose} className="mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-border bg-secondary/40 px-6 py-4">
              <div>
                <h2 className="font-serif text-xl text-primary">Request the Beacon</h2>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> 735 Broadway, Seaside, OR
                </p>
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="space-y-3 px-6 py-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim() || !form.email.trim()) {
                  toast.error("Name and email are required.");
                  return;
                }
                m.mutate();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Full name *</span>
                  <input required maxLength={100} className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Email *</span>
                  <input required type="email" maxLength={255} className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Phone</span>
                  <input type="tel" maxLength={30} className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Event date</span>
                  <input type="date" className={input} value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Event type</span>
                  <select className={input} value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                    <option value="">Select…</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Reception">Reception</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday / Anniversary">Birthday / Anniversary</option>
                    <option value="Memorial">Memorial</option>
                    <option value="Community">Community gathering</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Guest count</span>
                  <input type="number" min={1} max={150} className={input} value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} placeholder="e.g. 80" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-foreground">Preferred contact</span>
                <div className="flex flex-wrap gap-4 text-sm">
                  {(["email", "phone", "text"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name="pcm" value={m} checked={form.preferredContact === m} onChange={() => setForm({ ...form, preferredContact: m })} className="accent-[color:var(--navy)]" />
                      <span className="capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-foreground">Tell us about your event</span>
                <textarea rows={4} maxLength={2000} className={input} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Vision, vendors, rentals you might need…" />
              </label>
              <TrustDisclaimer />
              <button
                type="submit"
                disabled={m.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
              >
                {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Inquiry
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
