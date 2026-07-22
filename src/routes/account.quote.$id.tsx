import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { getMyQuote } from "@/lib/customer-portal.functions";
import { ArrowLeft, FileSignature, Loader2 } from "lucide-react";

export const Route = createFileRoute("/account/quote/$id")({
  head: () => ({ meta: [{ title: "Your Quote | Pacific North Events & Tents" }, { name: "robots", content: "noindex" }] }),
  component: QuoteViewPage,
});

function money(cents: number | null | undefined) {
  const c = cents ?? 0;
  return `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function QuoteViewPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const getFn = useServerFn(getMyQuote);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: `/account/quote/${id}` } as never });
  }, [user, loading, id, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-quote", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user,
    retry: false,
  });

  if (loading || !user || isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </SiteLayout>
    );
  }
  if (error || !data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="font-serif text-2xl text-primary">Quote not available</p>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "This quote can't be viewed."}</p>
          <Link to="/account" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]"><ArrowLeft className="h-4 w-4" /> Back to My Account</Link>
        </div>
      </SiteLayout>
    );
  }

  const { quote, items } = data;

  return (
    <SiteLayout>
      <PageHero eyebrow={`Quote ${quote.quote_number}`} title={quote.event_type || "Your Event Quote"} subtitle={quote.event_date ? new Date(quote.event_date + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : undefined} />
      <section className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/account" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> All quotes</Link>
          <Link
            to="/rental-contract/fill/$contractId"
            params={{ contractId: "rental-contract" }}
            search={{ quoteId: quote.id }}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-5 py-2 text-sm font-semibold text-[color:var(--ink-on-gold,#1a1a1a)] hover:opacity-90"
          >
            <FileSignature className="h-4 w-4" /> Sign Rental Contract
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBlock label="Customer">
            <div>{quote.customer_name}</div>
            <div className="text-muted-foreground">{quote.customer_email}</div>
            {quote.customer_phone && <div className="text-muted-foreground">{quote.customer_phone}</div>}
          </InfoBlock>
          <InfoBlock label="Event">
            {quote.event_location && <div>{quote.event_location}</div>}
            {quote.guest_count != null && <div className="text-muted-foreground">{quote.guest_count} guests</div>}
            <div className="text-muted-foreground uppercase text-xs tracking-wider mt-1">Status: {quote.status}</div>
          </InfoBlock>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-primary">Item</th>
                <th className="px-4 py-3 text-right font-semibold text-primary">Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-primary">Unit</th>
                <th className="px-4 py-3 text-right font-semibold text-primary">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{it.name}</div>
                    {it.category && <div className="text-xs text-muted-foreground">{it.category}</div>}
                    {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right">{money(it.unit_price_cents)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(it.line_total_cents)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No line items.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Subtotal" value={money(quote.subtotal_cents)} />
          {quote.delivery_fee_cents ? <Row label="Delivery" value={money(quote.delivery_fee_cents)} /> : null}
          {quote.cleaning_fee_cents ? <Row label="Cleaning" value={money(quote.cleaning_fee_cents)} /> : null}
          {quote.discount_cents ? <Row label="Discount" value={`-${money(quote.discount_cents)}`} /> : null}
          {quote.tax_cents ? <Row label="Tax" value={money(quote.tax_cents)} /> : null}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold text-primary">
            <span>Total</span><span>{money(quote.total_cents)}</span>
          </div>
        </div>

        {quote.customer_notes && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{quote.customer_notes}</p>
          </div>
        )}
        {quote.terms && (
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Terms</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{quote.terms}</p>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground"><span>{label}</span><span className="text-foreground">{value}</span></div>
  );
}
