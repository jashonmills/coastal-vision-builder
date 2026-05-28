import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Inbox, FileText, Archive, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AdminBell } from "@/components/AdminBell";
import {
  listQuoteRequests,
  updateQuoteRequestStatus,
  createQuoteFromRequest,
  countNewQuoteRequests,
} from "@/lib/quotes.functions";


export const Route = createFileRoute("/admin/quote-requests")({
  head: () => ({ meta: [{ title: "Quote Requests | Admin" }] }),
  component: QuoteRequestsPage,
});

function QuoteRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const list = useServerFn(listQuoteRequests);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const updateStatusFn = useServerFn(updateQuoteRequestStatus);
  const createFn = useServerFn(createQuoteFromRequest);
  const [showArchived, setShowArchived] = useState(false);


  const { data, isLoading } = useQuery({
    queryKey: ["admin-quote-requests"],
    queryFn: () => list(),
    enabled: !!user && isAdmin,
  });

  const archive = useMutation({
    mutationFn: (id: string) => updateStatusFn({ data: { id, status: "archived" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quote-requests"] }),
  });

  const review = useMutation({
    mutationFn: (id: string) => updateStatusFn({ data: { id, status: "in_review" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quote-requests"] }),
  });

  const create = useMutation({
    mutationFn: (id: string) => createFn({ data: { quote_request_id: id } }),
    onSuccess: ({ id }) => {
      toast.success("Quote draft created");
      navigate({ to: "/admin/quotes/$id/edit", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || roleLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }
  if (!user || !isAdmin)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground">
          Admin access required. <Link to="/admin" className="text-primary underline">Go to admin</Link>
        </div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Admin"
        title="Quote Requests"
        subtitle="Customer submissions from the AI Tent Planner. Review and create quotes."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <AdminTabs active="quote-requests" />
        {isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : !data || data.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No quote requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Guests</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Submitted</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{r.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{r.customer_email}</div>
                      {r.customer_phone && <div className="text-xs text-muted-foreground">{r.customer_phone}</div>}
                    </td>
                    <td className="px-3 py-2">{r.event_type || "—"}</td>
                    <td className="px-3 py-2">{r.event_date || "—"}</td>
                    <td className="px-3 py-2">{r.guest_count ?? "—"}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{r.event_location || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Link
                          to="/admin/quote-requests/$id"
                          params={{ id: r.id }}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
                        >
                          View
                        </Link>
                        {r.status !== "quote_created" && r.status !== "quote_sent" && (
                          <button
                            onClick={() => create.mutate(r.id)}
                            disabled={create.isPending}
                            className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            <FileText className="h-3 w-3" /> Create Quote
                          </button>
                        )}
                        {r.status === "new" && (
                          <button
                            onClick={() => review.mutate(r.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
                          >
                            <CheckCircle className="h-3 w-3" /> Mark Reviewed
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm("Archive this request?")) archive.mutate(r.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
                        >
                          <Archive className="h-3 w-3" />
                        </button>
                      </div>
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

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-[color:var(--gold)]/15 text-[color:var(--gold)] border-[color:var(--gold)]/40",
    in_review: "bg-blue-100 text-blue-800 border-blue-300",
    quote_created: "bg-purple-100 text-purple-800 border-purple-300",
    quote_sent: "bg-emerald-100 text-emerald-800 border-emerald-300",
    booked: "bg-emerald-200 text-emerald-900 border-emerald-400",
    closed: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
    draft: "bg-secondary text-foreground",
    sent: "bg-emerald-100 text-emerald-800 border-emerald-300",
    approved: "bg-emerald-200 text-emerald-900 border-emerald-400",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] || map.new}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function AdminTabs({ active }: { active: "dashboard" | "admin" | "quote-requests" | "quotes" | "inventory" }) {
  const { isAdmin } = useIsAdmin();
  const countFn = useServerFn(countNewQuoteRequests);
  const { data: countData } = useQuery({
    queryKey: ["new-quote-requests-count"],
    queryFn: () => countFn(),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
  const newCount = countData?.count ?? 0;
  const tabs = [
    { key: "dashboard", label: "Dashboard", to: "/admin/dashboard" as const },
    { key: "quote-requests", label: "Quote Requests", to: "/admin/quote-requests" as const, badge: newCount },
    { key: "quotes", label: "Quotes", to: "/admin/quotes" as const },
    { key: "inventory", label: "Inventory", to: "/admin/inventory" as const },
    { key: "admin", label: "Pricing & Content", to: "/admin" as const },
  ];
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
              active === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
            {"badge" in t && t.badge ? (
              <span className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                active === t.key ? "bg-primary-foreground text-primary" : "bg-[color:var(--gold)] text-primary"
              }`}>
                {t.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      <AdminBell />
    </div>
  );
}
