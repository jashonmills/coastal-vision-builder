import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Loader2,
  Inbox,
  FileText,
  Send,
  CalendarDays,
  Bell,
  AlertTriangle,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AdminTabs, StatusPill } from "./admin.quote-requests";
import { getAdminDashboard } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard | Pacific North Events & Tents" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const fn = useServerFn(getAdminDashboard);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin/dashboard" } as never });
  }, [user, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fn(),
    enabled: !!user && isAdmin,
    refetchInterval: 60_000,
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
  if (!user) return null;
  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-muted-foreground">
          Admin access required. <Link to="/admin" className="text-primary underline">Go to admin</Link>
        </div>
      </SiteLayout>
    );
  }

  const c = data?.counts;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Admin"
        title="Dashboard"
        subtitle="What needs attention today across requests, quotes, events, and inventory."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <AdminTabs active="dashboard" />

        {isLoading || !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Alert cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                label="New Requests"
                value={c!.newRequests}
                icon={Inbox}
                tone={c!.newRequests > 0 ? "gold" : "muted"}
                to="/admin/quote-requests"
              />
              <StatCard
                label="Beacon Inquiries"
                value={c!.newVenueRequests ?? 0}
                icon={Inbox}
                tone={(c!.newVenueRequests ?? 0) > 0 ? "gold" : "muted"}
                to="/admin/quote-requests"
              />
              <StatCard
                label="Beacon Holds / Booked (30d)"
                value={(c as any).venueBookings30 ?? 0}
                icon={CalendarDays}
                tone={((c as any).venueBookings30 ?? 0) > 0 ? "navy" : "muted"}
                to="/admin/scheduler"
              />
              <StatCard label="In Review" value={c!.inReview} icon={FileText} tone="blue" to="/admin/quote-requests" />
              <StatCard label="Draft Quotes" value={c!.draftQuotes} icon={FileText} tone="muted" to="/admin/quotes" />
              <StatCard label="Sent Quotes" value={c!.sentQuotes} icon={Send} tone="green" to="/admin/quotes" />
              <StatCard label="Events (7 days)" value={c!.upcomingEvents} icon={CalendarDays} tone="navy" to="/admin/scheduler" />
              <StatCard label="Unread Alerts" value={c!.unreadNotifications} icon={Bell} tone={c!.unreadNotifications > 0 ? "gold" : "muted"} />
            </div>


            {/* Recent + Upcoming */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Panel title="Recent quote requests" linkTo="/admin/quote-requests" linkLabel="View all">
                {data.recentRequests.length === 0 ? (
                  <EmptyHint>
                    No quote requests yet. When customers request pricing from a saved plan, it will appear here.
                  </EmptyHint>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recentRequests.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{r.customer_name}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {(r.event_type ?? "Event")}
                            {r.guest_count ? ` · ${r.guest_count} guests` : ""}
                            {r.event_date ? ` · ${r.event_date}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-none items-center gap-2">
                          <StatusPill status={r.status} />
                          <Link
                            to="/admin/quote-requests/$id"
                            params={{ id: r.id }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Upcoming events (next 7 days)" linkTo="/admin/scheduler" linkLabel="Open scheduler">
                {data.upcomingEvents.length === 0 ? (
                  <EmptyHint>
                    No events scheduled in the next 7 days. Add an event from the scheduler or wait for a quote request to land.
                  </EmptyHint>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.upcomingEvents.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {new Date(e.start_time).toLocaleString()}
                            {e.location ? ` · ${e.location}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {e.event_type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* Inventory alerts */}
            <div className="mt-6">
              <Panel title="Inventory alerts" linkTo="/admin/inventory" linkLabel="Manage inventory">
                {data.inventoryAlerts.length === 0 ? (
                  <EmptyHint>
                    No inventory alerts. Items with zero quantity or marked damaged/missing will appear here.
                  </EmptyHint>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.inventoryAlerts.map((it) => (
                      <li key={it.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {it.total_owned_quantity === 0
                                ? "Quantity not configured"
                                : `${it.damaged_missing_quantity} damaged/missing · ${it.checked_out_quantity} out`}
                            </p>
                          </div>
                        </div>
                        <Link
                          to="/admin/inventory/$id"
                          params={{ id: it.id }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
  tone: "gold" | "blue" | "green" | "navy" | "muted";
  to?: "/admin/quote-requests" | "/admin/quotes" | "/admin/scheduler";
}) {
  const toneCls: Record<typeof tone, string> = {
    gold: "border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10",
    blue: "border-blue-300 bg-blue-50",
    green: "border-emerald-300 bg-emerald-50",
    navy: "border-primary/30 bg-primary/5",
    muted: "border-border bg-card",
  };
  const inner = (
    <div className={`rounded-xl border p-4 transition hover:shadow-md ${toneCls[tone]}`}>
      <div className="flex items-start justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {to && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60" />}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function Panel({
  title,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  linkTo?: "/admin/quote-requests" | "/admin/quotes" | "/admin/scheduler" | "/admin/inventory";
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-lg text-primary">{title}</h2>
        {linkTo && (
          <Link to={linkTo} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {linkLabel ?? "Open"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
