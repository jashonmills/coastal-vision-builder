import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { listQuotes } from "@/lib/quotes.functions";
import { StatusPill } from "./admin.quote-requests";

export const Route = createFileRoute("/admin/quotes")({
  head: () => ({ meta: [{ title: "Quotes | Admin" }] }),
  component: QuotesPage,
});

function QuotesPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const fn = useServerFn(listQuotes);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: () => fn(),
    enabled: !!user && isAdmin,
  });

  if (loading || rl) return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  if (!user || !isAdmin) return <SiteLayout><div className="p-12 text-center text-muted-foreground">Admin access required.</div></SiteLayout>;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Quotes" subtitle="Drafted and sent quotes." />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : !data || data.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No quotes yet. Create one from a quote request.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Quote #</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((q) => (
                  <tr key={q.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{q.quote_number}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{q.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{q.customer_email}</div>
                    </td>
                    <td className="px-3 py-2">{q.event_type || "—"}</td>
                    <td className="px-3 py-2">{q.event_date || "—"}</td>
                    <td className="px-3 py-2">${((q.total_cents ?? 0) / 100).toFixed(2)}</td>
                    <td className="px-3 py-2"><StatusPill status={q.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to="/admin/quotes/$id/edit"
                        params={{ id: q.id }}
                        className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
