import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Save, Send, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  getQuote,
  updateQuote,
  upsertQuoteItem,
  deleteQuoteItem,
  sendQuote,
  listPricingItemsForBuilder,
  getQuoteItemsAvailability,
} from "@/lib/quotes.functions";
import { bookQuote, unbookQuote, getQuoteBookingStatus } from "@/lib/bookings.functions";
import { StatusPill, AdminTabs } from "./admin.quote-requests";
import { Mail, CalendarCheck, CalendarX, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/admin/quotes/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Quote | Admin" }] }),
  component: EditQuotePage,
});

function EditQuotePage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getQuote);
  const updFn = useServerFn(updateQuote);
  const upsertFn = useServerFn(upsertQuoteItem);
  const delFn = useServerFn(deleteQuoteItem);
  const sendFn = useServerFn(sendQuote);
  const pricingFn = useServerFn(listPricingItemsForBuilder);
  const bookFn = useServerFn(bookQuote);
  const unbookFn = useServerFn(unbookQuote);
  const statusFn = useServerFn(getQuoteBookingStatus);

  const availFn = useServerFn(getQuoteItemsAvailability);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-quote", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user && isAdmin,
  });
  const { data: pricing = [] } = useQuery({
    queryKey: ["pricing-for-builder"],
    queryFn: () => pricingFn(),
    enabled: !!user && isAdmin,
  });
  const { data: availability = {} } = useQuery({
    queryKey: ["quote-availability", id],
    queryFn: () => availFn({ data: { quote_id: id } }),
    enabled: !!user && isAdmin && !!data,
  });
  const { data: bookingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["quote-booking-status", id],
    queryFn: () => statusFn({ data: { quote_id: id } }),
    enabled: !!user && isAdmin && !!data,
  });

  const send = useMutation({
    mutationFn: () => sendFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Quote marked as sent.");
      qc.invalidateQueries({ queryKey: ["admin-quote", id] });
    },
  });

  const book = useMutation({
    mutationFn: () => bookFn({ data: { quote_id: id } }),
    onSuccess: (res: any) => {
      if (res?.venue_only) {
        toast.success(`Beacon booking confirmed. ${res.events_created} calendar event(s) created.`);
      } else {
        const eventMsg = res.has_event_date
          ? `${res.events_created} calendar events created.`
          : "No event date set — calendar events skipped.";
        toast.success(
          res.already_reserved
            ? `Already reserved. ${eventMsg}`
            : `Reserved ${res.lines_reserved} item(s). ${eventMsg}`,
        );
      }
      refetch();
      refetchStatus();
      qc.invalidateQueries({ queryKey: ["quote-availability", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unbook = useMutation({
    mutationFn: () => unbookFn({ data: { quote_id: id } }),
    onSuccess: () => {
      toast.success("Reservation released.");
      refetch();
      refetchStatus();
      qc.invalidateQueries({ queryKey: ["quote-availability", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rl || isLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user || !isAdmin || !data) return <SiteLayout><div className="p-12 text-center">Not available.</div></SiteLayout>;

  const { quote, items } = data;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <AdminTabs active="quotes" />
        <Link to="/admin/quotes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All quotes
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{quote.quote_number}</div>
            <h1 className="font-serif text-3xl text-primary">{quote.customer_name}</h1>
            <p className="text-sm text-muted-foreground">{quote.event_type || "—"} · {quote.event_date || "—"} · {quote.event_location || "—"} · {quote.guest_count ?? "?"} guests</p>
            <div className="mt-2"><StatusPill status={quote.status} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/quotes/$id/preview"
              params={{ id }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              Preview
            </Link>
            <button
              onClick={() => {
                const previewUrl = `${window.location.origin}/admin/quotes/${id}/preview`;
                const subject = encodeURIComponent(`Your Pacific North Events Quote ${quote.quote_number}`);
                const body = encodeURIComponent(
                  `Hi ${quote.customer_name},\n\nThank you for considering Pacific North Events & Tents. Your quote ${quote.quote_number} is ready.\n\nView it here: ${previewUrl}\n\nTotal: $${(quote.total_cents / 100).toFixed(2)}\n\nLet us know if you have any questions.\n\n— Pacific North Events & Tents`,
                );
                window.location.href = `mailto:${quote.customer_email}?subject=${subject}&body=${body}`;
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <Mail className="h-4 w-4" /> Email Customer
            </button>
            <button
              onClick={() => send.mutate()}
              disabled={send.isPending || quote.status === "sent" || quote.status === "booked"}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {quote.status === "sent" ? "Sent" : "Mark Sent"}
            </button>
            {bookingStatus?.reserved ? (
              <button
                onClick={() => {
                  if (confirm("Release the reservation and remove delivery/pickup events?")) unbook.mutate();
                }}
                disabled={unbook.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
              >
                {unbook.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
                Unbook
              </button>
            ) : (
              <button
                onClick={() => book.mutate()}
                disabled={book.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {book.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                Book & Reserve
              </button>
            )}
            <Link
              to="/admin/quotes/$id/job-sheet"
              params={{ id }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              <ClipboardList className="h-4 w-4" /> Job Sheet
            </Link>
          </div>
        </div>

        {bookingStatus && (
          <div className="mt-4 rounded-lg border border-border bg-card/60 p-3 text-xs">
            <span className="font-semibold">Status:</span>{" "}
            {bookingStatus.reserved ? (
              <span className="text-emerald-700">
                Reserved ({bookingStatus.reserve_tx_count} item tx) ·{" "}
                {bookingStatus.events.length} calendar event(s)
              </span>
            ) : (
              <span className="text-muted-foreground">Not reserved yet. Click "Book & Reserve" to lock inventory and add delivery/pickup to the calendar.</span>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2 w-24">Avail.</th>
                  <th className="px-2 py-2 w-20">Qty</th>
                  <th className="px-2 py-2 w-20">Unit</th>
                  <th className="px-2 py-2 w-28">Unit $</th>
                  <th className="px-2 py-2 w-24 text-right">Line</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    avail={(availability as Record<string, { available: number; total_owned: number; inventory_name: string } | null>)[it.id] ?? null}
                    onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["admin-quotes"] }); qc.invalidateQueries({ queryKey: ["quote-availability", id] }); }}
                    onDelete={async () => {
                      if (!confirm("Remove this line?")) return;
                      try {
                        await delFn({ data: { id: it.id, quote_id: quote.id } });
                        toast.success("Line removed.");
                        refetch();
                        qc.invalidateQueries({ queryKey: ["quote-availability", id] });
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed to remove line.");
                      }
                    }}
                    upsertFn={upsertFn}
                  />
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No line items yet.</td></tr>
                )}
              </tbody>
            </table>
            <div className="border-t border-border p-3">
              <AddLine
                quoteId={quote.id}
                pricing={pricing}
                onAdded={() => refetch()}
                upsertFn={upsertFn}
                nextSort={items.length}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold text-foreground">Totals</h3>
              <Totals quote={quote} updFn={updFn} onSaved={() => refetch()} />
            </div>
            <NotesEditor quote={quote} updFn={updFn} onSaved={() => refetch()} />
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function ItemRow({ item, avail, onSaved, onDelete, upsertFn }: { item: any; avail: { available: number; total_owned: number; inventory_name: string } | null; onSaved: () => void; onDelete: () => void; upsertFn: any }) {
  const [draft, setDraft] = useState(item);
  useEffect(() => setDraft(item), [item]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);
  const save = useMutation({
    mutationFn: () => upsertFn({ data: {
      id: draft.id, quote_id: draft.quote_id,
      pricing_item_id: draft.pricing_item_id, inventory_item_id: draft.inventory_item_id,
      category: draft.category, name: draft.name, description: draft.description,
      quantity: Number(draft.quantity), unit: draft.unit, unit_price_cents: Number(draft.unit_price_cents),
      needs_pricing_review: draft.needs_pricing_review, reason: draft.reason, sort_order: draft.sort_order,
    } }),
    onSuccess: () => { toast.success("Line saved."); onSaved(); },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save line."),
  });
  const short = avail ? (draft.quantity > avail.available) : false;
  return (
    <tr className="border-t border-border align-top">
      <td className="px-2 py-2">
        <input className="w-full rounded border border-border bg-background px-2 py-1 text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{draft.category || "—"}</span>
          {draft.needs_pricing_review && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <AlertTriangle className="h-2.5 w-2.5" /> Needs pricing review
            </span>
          )}
        </div>
        {draft.reason && <div className="mt-0.5 text-[10px] text-muted-foreground">{draft.reason}</div>}
      </td>
      <td className="px-2 py-2 text-xs">
        {avail ? (
          <div className={short ? "text-red-700 font-semibold" : "text-emerald-700"}>
            {avail.available} / {avail.total_owned}
            {short && <div className="text-[10px] font-normal">Short by {draft.quantity - avail.available}</div>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-2 py-2"><input type="number" className="w-16 rounded border border-border bg-background px-2 py-1 text-sm" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: parseInt(e.target.value || "0") })} /></td>
      <td className="px-2 py-2"><input className="w-16 rounded border border-border bg-background px-2 py-1 text-sm" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></td>
      <td className="px-2 py-2"><input type="number" step="0.01" className="w-24 rounded border border-border bg-background px-2 py-1 text-sm" value={(draft.unit_price_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, unit_price_cents: Math.round(parseFloat(e.target.value || "0") * 100), needs_pricing_review: false })} /></td>
      <td className="px-2 py-2 text-right font-medium">${((draft.quantity * draft.unit_price_cents) / 100).toFixed(2)}</td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1">
          <button
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
            title={dirty ? "Save changes to this line" : "No changes to save"}
            className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-white transition ${dirty ? "bg-emerald-600 hover:bg-emerald-700" : "bg-muted-foreground/40"} disabled:cursor-not-allowed`}
          >
            {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {dirty ? "Save" : "Saved"}
          </button>
          <button onClick={onDelete} title="Remove line" className="inline-flex items-center justify-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700">
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddLine({ quoteId, pricing, onAdded, upsertFn, nextSort }: { quoteId: string; pricing: any[]; onAdded: () => void; upsertFn: any; nextSort: number }) {
  const [pickId, setPickId] = useState("");
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState("");
  const add = useMutation({
    mutationFn: async () => {
      if (pickId) {
        const p = pricing.find((x) => x.id === pickId);
        if (!p) throw new Error("Pricing item not found");
        return upsertFn({ data: { quote_id: quoteId, pricing_item_id: p.id, category: p.category, name: p.name, quantity: qty, unit: p.unit, unit_price_cents: p.price_cents, sort_order: nextSort } });
      }
      if (custom.trim()) {
        return upsertFn({ data: { quote_id: quoteId, name: custom.trim(), quantity: qty, unit: "each", unit_price_cents: 0, needs_pricing_review: true, sort_order: nextSort } });
      }
      throw new Error("Pick an item or enter a custom name");
    },
    onSuccess: () => { toast.success("Line added."); setPickId(""); setCustom(""); setQty(1); onAdded(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={pickId} onChange={(e) => setPickId(e.target.value)} className="rounded border border-border bg-background px-2 py-1 text-sm">
        <option value="">— Pricing item —</option>
        {pricing.map((p) => (
          <option key={p.id} value={p.id}>{p.category} · {p.name} (${(p.price_cents / 100).toFixed(2)}/{p.unit})</option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">or</span>
      <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom item name" className="rounded border border-border bg-background px-2 py-1 text-sm" />
      <input type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value || "1"))} className="w-16 rounded border border-border bg-background px-2 py-1 text-sm" />
      <button onClick={() => add.mutate()} disabled={add.isPending} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50">
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function Totals({ quote, updFn, onSaved }: { quote: any; updFn: any; onSaved: () => void }) {
  const [draft, setDraft] = useState({
    delivery_fee_cents: quote.delivery_fee_cents,
    cleaning_fee_cents: quote.cleaning_fee_cents,
    discount_cents: quote.discount_cents,
    tax_cents: quote.tax_cents,
  });
  useEffect(() => setDraft({ delivery_fee_cents: quote.delivery_fee_cents, cleaning_fee_cents: quote.cleaning_fee_cents, discount_cents: quote.discount_cents, tax_cents: quote.tax_cents }), [quote.delivery_fee_cents, quote.cleaning_fee_cents, quote.discount_cents, quote.tax_cents]);
  const save = useMutation({
    mutationFn: () => updFn({ data: { id: quote.id, patch: draft } }),
    onSuccess: () => { toast.success("Fees saved."); onSaved(); },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save fees."),
  });
  return (
    <div className="mt-3 space-y-2 text-sm">
      <Row label="Subtotal" value={`$${(quote.subtotal_cents / 100).toFixed(2)}`} />
      <FeeRow label="Delivery" cents={draft.delivery_fee_cents} onChange={(v) => setDraft({ ...draft, delivery_fee_cents: v })} />
      <FeeRow label="Cleaning" cents={draft.cleaning_fee_cents} onChange={(v) => setDraft({ ...draft, cleaning_fee_cents: v })} />
      <FeeRow label="Discount" cents={draft.discount_cents} onChange={(v) => setDraft({ ...draft, discount_cents: v })} />
      <FeeRow label="Tax" cents={draft.tax_cents} onChange={(v) => setDraft({ ...draft, tax_cents: v })} />
      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
        <span>Total</span><span>${(quote.total_cents / 100).toFixed(2)}</span>
      </div>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        {save.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save fees
      </button>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
function FeeRow({ label, cents, onChange }: { label: string; cents: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <input type="number" step="0.01" value={(cents / 100).toString()} onChange={(e) => onChange(Math.round(parseFloat(e.target.value || "0") * 100))} className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-sm" />
    </div>
  );
}
function NotesEditor({ quote, updFn, onSaved }: { quote: any; updFn: any; onSaved: () => void }) {
  const [internal, setInternal] = useState(quote.internal_notes ?? "");
  const [customer, setCustomer] = useState(quote.customer_notes ?? "");
  const [terms, setTerms] = useState(quote.terms ?? "");
  const save = useMutation({
    mutationFn: () => updFn({ data: { id: quote.id, patch: { internal_notes: internal, customer_notes: customer, terms } } }),
    onSuccess: () => { toast.success("Notes saved."); onSaved(); },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save notes."),
  });
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold text-foreground">Notes</h3>
      <label className="block text-xs"><span className="text-muted-foreground">Internal (admin only)</span><textarea rows={3} value={internal} onChange={(e) => setInternal(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" /></label>
      <label className="block text-xs"><span className="text-muted-foreground">Customer-facing notes</span><textarea rows={3} value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" /></label>
      <label className="block text-xs"><span className="text-muted-foreground">Terms</span><textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" /></label>
      <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex w-full items-center justify-center rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save notes</button>
    </div>
  );
}
