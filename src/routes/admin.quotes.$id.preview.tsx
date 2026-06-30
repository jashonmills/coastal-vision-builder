import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { getQuote } from "@/lib/quotes.functions";
import { AdminTabs } from "./admin.quote-requests";

export const Route = createFileRoute("/admin/quotes/$id/preview")({
  head: () => ({ meta: [{ title: "Quote Preview | Admin" }] }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const fn = useServerFn(getQuote);
  const { data, isLoading } = useQuery({
    queryKey: ["quote-preview", id],
    queryFn: () => fn({ data: { id } }),
    enabled: !!user && isAdmin,
  });
  if (loading || rl || isLoading) return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  if (!user || !isAdmin || !data) return <SiteLayout><div className="p-12 text-center">Not available.</div></SiteLayout>;
  const { quote, items } = data;
  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-4 py-10 print:py-0">
        <div className="print:hidden">
          <AdminTabs active="quotes" />
        </div>
        <div className="mb-4 flex justify-between print:hidden">
          <Link to="/admin/quotes/$id/edit" params={{ id }} className="text-sm text-muted-foreground hover:text-primary">← Back to edit</Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground"><Printer className="h-3.5 w-3.5" /> Print / Save PDF</button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 print:border-0 print:p-0">
          <div className="flex justify-between border-b border-border pb-4">
            <div>
              <h1 className="font-serif text-2xl text-primary">Pacific North Events &amp; Tents</h1>
              <p className="text-xs text-muted-foreground">Pacific North Events &amp; Tents</p>
            </div>
            <div className="text-right text-sm">
              <div className="font-mono">{quote.quote_number}</div>
              <div className="text-xs text-muted-foreground">{new Date(quote.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Customer</h3>
              <p className="font-medium">{quote.customer_name}</p>
              <p>{quote.customer_email}</p>
              {quote.customer_phone && <p>{quote.customer_phone}</p>}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Event</h3>
              <p>{quote.event_type || "—"}</p>
              <p>{quote.event_date || "—"}</p>
              <p>{quote.event_location || "—"}</p>
              <p>{quote.guest_count ?? "—"} guests</p>
            </div>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border/50">
                  <td className="py-2">
                    <div className="font-medium">{it.name}</div>
                    {it.category && <div className="text-xs text-muted-foreground">{it.category}</div>}
                  </td>
                  <td className="py-2 text-right">{it.quantity} {it.unit}</td>
                  <td className="py-2 text-right">${(it.unit_price_cents / 100).toFixed(2)}</td>
                  <td className="py-2 text-right">${(it.line_total_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
            <Line label="Subtotal" cents={quote.subtotal_cents} />
            {quote.delivery_fee_cents > 0 && <Line label="Delivery" cents={quote.delivery_fee_cents} />}
            {quote.cleaning_fee_cents > 0 && <Line label="Cleaning" cents={quote.cleaning_fee_cents} />}
            {quote.discount_cents > 0 && <Line label="Discount" cents={-quote.discount_cents} />}
            {quote.tax_cents > 0 && <Line label="Tax" cents={quote.tax_cents} />}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span><span>${(quote.total_cents / 100).toFixed(2)}</span>
            </div>
          </div>
          {quote.customer_notes && (
            <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Notes</h4>
              <p className="mt-1 whitespace-pre-wrap">{quote.customer_notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="mt-3 text-xs text-muted-foreground"><strong>Terms:</strong> {quote.terms}</div>
          )}
          <div className="mt-8 rounded-lg bg-primary/5 p-4 text-center text-sm">
            Questions or ready to book? Contact us to confirm this quote.
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
function Line({ label, cents }: { label: string; cents: number }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>${(cents / 100).toFixed(2)}</span></div>;
}
