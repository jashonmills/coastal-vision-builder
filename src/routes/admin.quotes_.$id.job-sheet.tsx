import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ArrowLeft, PackageCheck, PackageOpen, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  getJobSheet,
  checkOutQuoteItem,
  checkInQuoteItem,
  completeQuote,
} from "@/lib/bookings.functions";
import { CrewAssign } from "@/components/admin/CrewAssign";
import { invalidateOpsQueries } from "@/lib/admin-cache";
import { JobCrossLink } from "@/components/admin/JobCrossLink";

export const Route = createFileRoute("/admin/quotes_/$id/job-sheet")({
  head: () => ({ meta: [{ title: "Job Sheet | Admin" }] }),
  component: JobSheetPage,
});

function JobSheetPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const qc = useQueryClient();
  const getFn = useServerFn(getJobSheet);
  const completeFn = useServerFn(completeQuote);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["job-sheet", id],
    queryFn: () => getFn({ data: { quote_id: id } }),
    enabled: !!user && isAdmin,
  });

  const complete = useMutation({
    mutationFn: () => completeFn({ data: { quote_id: id } }),
    onSuccess: () => {
      toast.success("Quote marked complete");
      invalidateOpsQueries(qc, { quoteId: id });
    },
  });

  if (loading || rl || isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }
  if (!user || !isAdmin || !data) {
    return <SiteLayout><div className="p-12 text-center">Not available.</div></SiteLayout>;
  }

  const { quote, lines, returns, events } = data;
  const allReturned = lines.every((l) => l.checked_out === 0);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8 print:py-4">
        <div className="print:hidden">
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <Link to="/admin/quotes/$id/edit" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to quote
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            {allReturned && quote.status !== "completed" && (
              <button
                onClick={() => complete.mutate()}
                disabled={complete.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Job Complete
              </button>
            )}
          </div>
        </div>

        <header className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="font-mono text-xs text-muted-foreground">{quote.quote_number}</div>
          <h1 className="font-serif text-2xl text-primary">{quote.customer_name}</h1>
          <div className="mt-1 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div><strong className="text-foreground">Event:</strong> {quote.event_type || "—"}</div>
            <div><strong className="text-foreground">Date:</strong> {quote.event_date || "—"}</div>
            <div><strong className="text-foreground">Location:</strong> {quote.event_location || "—"}</div>
            <div><strong className="text-foreground">Guests:</strong> {quote.guest_count ?? "—"}</div>
            <div><strong className="text-foreground">Phone:</strong> {quote.customer_phone || "—"}</div>
            <div><strong className="text-foreground">Email:</strong> {quote.customer_email}</div>
          </div>
          {events.length > 0 ? (
            <div className="mt-3 space-y-3">
              {events.map((e) => (
                <div key={e.id} className="rounded-lg border border-border bg-secondary/20 p-3 print:hidden">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium">
                      {e.event_type}: {new Date(e.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Crew</div>
                  <div className="mt-1"><CrewAssign eventId={e.id} compact /></div>
                </div>
              ))}
              <div className="hidden flex-wrap gap-2 text-xs print:flex">
                {events.map((e) => (
                  <span key={e.id} className="rounded-full bg-secondary px-3 py-1">
                    {e.event_type}: {new Date(e.start_time).toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground print:hidden">
              No calendar event linked yet.{" "}
              <Link to="/admin/scheduler" className="text-primary underline">Schedule this job</Link>{" "}
              to assign crew.
            </div>
          )}
        </header>

        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 w-16 text-right">Qty</th>
                <th className="px-3 py-2 w-20 text-right">Reserved</th>
                <th className="px-3 py-2 w-20 text-right">Out</th>
                <th className="px-3 py-2 w-20 text-right">Returned</th>
                <th className="px-3 py-2 w-[330px] print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No line items.</td></tr>
              )}
              {lines.map((l) => (
                <JobLine
                  key={l.quote_item_id}
                  quoteId={id}
                  line={l}
                  onChanged={() => { refetch(); invalidateOpsQueries(qc, { quoteId: id }); }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {returns.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground">Return log</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {returns.map((r) => (
                <li key={r.id}>
                  {new Date(r.returned_at).toLocaleString()} — returned {r.returned_quantity}, damaged {r.damaged_quantity}, missing {r.missing_quantity}
                  {r.condition_notes ? ` · ${r.condition_notes}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function JobLine({
  quoteId,
  line,
  onChanged,
}: {
  quoteId: string;
  line: {
    quote_item_id: string;
    name: string;
    quantity: number;
    unit: string;
    inventory_item_id: string | null;
    inventory_name: string | null;
    reserved: number;
    checked_out: number;
    returned: number;
  };
  onChanged: () => void;
}) {
  const outFn = useServerFn(checkOutQuoteItem);
  const inFn = useServerFn(checkInQuoteItem);
  const [outQty, setOutQty] = useState(line.reserved || line.quantity);
  const [inGood, setInGood] = useState(line.checked_out);
  const [inDmg, setInDmg] = useState(0);
  const [inMissing, setInMissing] = useState(0);
  const [notes, setNotes] = useState("");

  const out = useMutation({
    mutationFn: () =>
      outFn({ data: { quote_id: quoteId, inventory_item_id: line.inventory_item_id!, quantity: outQty } }),
    onSuccess: () => { toast.success(`Checked out ${outQty}`); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const inn = useMutation({
    mutationFn: () =>
      inFn({
        data: {
          quote_id: quoteId,
          quote_item_id: line.quote_item_id,
          inventory_item_id: line.inventory_item_id!,
          returned_quantity: inGood,
          damaged_quantity: inDmg,
          missing_quantity: inMissing,
          condition_notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Checked in");
      setInDmg(0); setInMissing(0); setNotes("");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-3">
        <div className="font-medium text-foreground">{line.name}</div>
        <div className="text-xs text-muted-foreground">
          {line.inventory_item_id ? line.inventory_name : <span className="italic">Not linked to inventory</span>}
        </div>
      </td>
      <td className="px-3 py-3 text-right">{line.quantity} {line.unit}</td>
      <td className="px-3 py-3 text-right">{line.reserved}</td>
      <td className="px-3 py-3 text-right">{line.checked_out}</td>
      <td className="px-3 py-3 text-right">{line.returned}</td>
      <td className="px-3 py-3 print:hidden">
        {!line.inventory_item_id ? (
          <span className="text-xs text-muted-foreground">Link to inventory to track</span>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={outQty}
                onChange={(e) => setOutQty(parseInt(e.target.value || "0"))}
                className="w-16 rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <button
                onClick={() => out.mutate()}
                disabled={out.isPending || outQty < 1 || line.reserved < outQty}
                className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                title={line.reserved < outQty ? "Not enough reserved" : ""}
              >
                <PackageOpen className="h-3 w-3" /> Check out
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <label className="text-[10px] text-muted-foreground">Good</label>
              <input type="number" min={0} value={inGood} onChange={(e) => setInGood(parseInt(e.target.value || "0"))} className="w-14 rounded border border-border bg-background px-1 py-1 text-xs" />
              <label className="text-[10px] text-muted-foreground">Dmg</label>
              <input type="number" min={0} value={inDmg} onChange={(e) => setInDmg(parseInt(e.target.value || "0"))} className="w-14 rounded border border-border bg-background px-1 py-1 text-xs" />
              <label className="text-[10px] text-muted-foreground">Miss</label>
              <input type="number" min={0} value={inMissing} onChange={(e) => setInMissing(parseInt(e.target.value || "0"))} className="w-14 rounded border border-border bg-background px-1 py-1 text-xs" />
              <button
                onClick={() => inn.mutate()}
                disabled={inn.isPending || line.checked_out === 0 || (inGood + inDmg + inMissing) === 0 || (inGood + inDmg + inMissing) > line.checked_out}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                title={(inGood + inDmg + inMissing) > line.checked_out ? "Sum exceeds checked-out qty" : ""}
              >
                <PackageCheck className="h-3 w-3" /> Check in
              </button>
            </div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition notes (optional)"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        )}
      </td>
    </tr>
  );
}
