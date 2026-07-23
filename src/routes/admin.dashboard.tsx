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
  PackageCheck,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { StatusPill } from "./admin.quote-requests";
import { getAdminDashboard, getOnboardingStatus } from "@/lib/dashboard.functions";
import { HelpTip } from "@/components/HelpTip";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, X } from "lucide-react";
import { dismissHint, listMyDismissedHints } from "@/lib/hints.functions";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fn(),
    enabled: !!user && isAdmin,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
      <section className="py-8">

        {isLoading || !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <HelpTip
              hintKey="admin-dashboard-welcome"
              title="Welcome to your admin console"
              className="mb-4"
            >
              Get set up: add real inventory counts, link your price list to inventory, and invite your staff. The checklist below tracks your progress.
            </HelpTip>
            <OnboardingChecklist />

            <div className="mb-3 flex items-center justify-end">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                Refresh
              </button>
            </div>
            {/* KPI cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="New Requests" value={c!.newRequests} icon={Inbox}
                tone={c!.newRequests > 0 ? "gold" : "muted"} to="/admin/quote-requests" />
              <StatCard label="Beacon Inquiries" value={c!.newVenueRequests ?? 0} icon={Inbox}
                tone={(c!.newVenueRequests ?? 0) > 0 ? "gold" : "muted"} to="/admin/quote-requests" />
              <StatCard label="Beacon Holds / Booked (30d)" value={(c as any).venueBookings30 ?? 0} icon={CalendarDays}
                tone={((c as any).venueBookings30 ?? 0) > 0 ? "navy" : "muted"} to="/admin/scheduler" />
              <StatCard label="In Review" value={c!.inReview} icon={FileText} tone="blue" to="/admin/quote-requests" />
              <StatCard label="Draft Quotes" value={c!.draftQuotes} icon={FileText} tone="muted" to="/admin/quotes" />
              <StatCard label="Sent Quotes" value={c!.sentQuotes} icon={Send} tone="blue" to="/admin/quotes" />
              <StatCard label="Pending Confirmation" value={(c as any).pendingConfirmation ?? 0} icon={FileText}
                tone={((c as any).pendingConfirmation ?? 0) > 0 ? "gold" : "muted"} to="/admin/quotes" />
              <StatCard label="Approved" value={(c as any).approvedQuotes ?? 0} icon={FileText}
                tone={((c as any).approvedQuotes ?? 0) > 0 ? "green" : "muted"} to="/admin/quotes" />
              <StatCard label="Booked" value={(c as any).bookedQuotes ?? 0} icon={PackageCheck}
                tone={((c as any).bookedQuotes ?? 0) > 0 ? "green" : "muted"} to="/admin/quotes" />
              <StatCard label="Paid" value={(c as any).paidQuotes ?? 0} icon={PackageCheck}
                tone={((c as any).paidQuotes ?? 0) > 0 ? "green" : "muted"} to="/admin/quotes" />

              <StatCard label="Events (7 days)" value={c!.upcomingEvents} icon={CalendarDays} tone="navy" to="/admin/scheduler" />
              <StatCard label="Over-committed" value={(c as any).overCommittedInventory ?? 0} icon={AlertTriangle}
                tone={((c as any).overCommittedInventory ?? 0) > 0 ? "gold" : "muted"} to="/admin/inventory" />
             <StatCard label="Pricing Unmapped" value={(c as any).unmappedPricing ?? 0} icon={Boxes}
               tone={((c as any).unmappedPricing ?? 0) > 0 ? "gold" : "muted"} to="/admin/pricing" search={{ filter: "unlinked" }} />
             <StatCard label="Inventory: 0 owned" value={(c as any).zeroOwnedInventory ?? 0} icon={AlertTriangle}
               tone={((c as any).zeroOwnedInventory ?? 0) > 0 ? "gold" : "muted"} to="/admin/inventory" search={{ filter: "zero" }} />

              <StatCard label="Unread Alerts" value={c!.unreadNotifications} icon={Bell}
                tone={c!.unreadNotifications > 0 ? "gold" : "muted"} />
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
  search,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
  tone: "gold" | "blue" | "green" | "navy" | "muted";
  to?: "/admin/quote-requests" | "/admin/quotes" | "/admin/scheduler" | "/admin/inventory" | "/admin/pricing";
  search?: Record<string, string>;
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
  return to ? <Link to={to} search={search as never}>{inner}</Link> : inner;
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

function OnboardingChecklist() {
  const qc = useQueryClient();
  const fn = useServerFn(getOnboardingStatus);
  const hintsFn = useServerFn(listMyDismissedHints);
  const dismissFn = useServerFn(dismissHint);
  const [collapsed, setCollapsed] = useState(false);

  const status = useQuery({
    queryKey: ["admin-onboarding"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  const hints = useQuery({
    queryKey: ["dismissed-hints"],
    queryFn: async () => (await hintsFn()) as string[],
    staleTime: 5 * 60_000,
  });
  const dismiss = useMutation({
    mutationFn: () => dismissFn({ data: { hint_key: "admin-getting-started" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dismissed-hints"] }),
  });

  const dismissed = (hints.data ?? []).includes("admin-getting-started");
  const s = status.data;
  if (!s || dismissed) return null;

  const steps: Array<{ done: boolean; label: string; to: "/admin/inventory" | "/admin/pricing" | "/admin/staff" | "/admin/quotes" | "/admin/jobs"; sub: string }> = [
    { done: s.hasInventoryCounts, label: "Set inventory counts", to: "/admin/inventory", sub: "Enter what you actually own." },
    { done: s.hasMappings, label: "Link price list to inventory", to: "/admin/pricing", sub: "So date-based availability works." },
    { done: s.hasStaff && s.hasStaffLogins, label: "Add & invite staff", to: "/admin/staff", sub: s.hasStaff && !s.hasStaffLogins ? "Staff added — send them logins." : "Add your crew and invite them." },
    { done: s.hasBookedJob, label: "Get your first booked job", to: "/admin/quotes", sub: "Send a quote, then book it." },
    { done: s.hasCrewAssigned, label: "Assign crew to a job", to: "/admin/jobs", sub: "Open a job → assign crew per event." },
  ];
  const completed = steps.filter((x) => x.done).length;
  if (completed === steps.length) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Getting started</p>
            <p className="text-sm font-semibold text-foreground">{completed} of {steps.length} steps complete</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => dismiss.mutate()}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Dismiss checklist"
          title="Dismiss for good"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      {!collapsed && (
        <ul className="mt-4 divide-y divide-border">
          {steps.map((step) => (
            <li key={step.label}>
              <Link
                to={step.to}
                className="flex items-start gap-3 py-3 hover:bg-secondary/40"
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 flex-none text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.sub}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
