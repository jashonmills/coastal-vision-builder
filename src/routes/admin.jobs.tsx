import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Search, Truck } from "lucide-react";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { listJobs } from "@/lib/jobs.functions";

const STATUSES = [
  "booked", "prep", "loaded", "en_route", "on_site", "event",
  "teardown", "picked_up", "returned", "reconciled", "closed", "cancelled",
] as const;
type JobStatus = (typeof STATUSES)[number];

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({ meta: [{ title: "Jobs | Admin" }] }),
  component: JobsPage,
});

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: "bg-sky-100 text-sky-800 border-sky-200",
    prep: "bg-amber-100 text-amber-800 border-amber-200",
    loaded: "bg-amber-100 text-amber-800 border-amber-200",
    en_route: "bg-indigo-100 text-indigo-800 border-indigo-200",
    on_site: "bg-indigo-100 text-indigo-800 border-indigo-200",
    event: "bg-emerald-100 text-emerald-800 border-emerald-200",
    teardown: "bg-orange-100 text-orange-800 border-orange-200",
    picked_up: "bg-orange-100 text-orange-800 border-orange-200",
    returned: "bg-teal-100 text-teal-800 border-teal-200",
    reconciled: "bg-teal-100 text-teal-800 border-teal-200",
    closed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function JobsPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const fn = useServerFn(listJobs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [date, setDate] = useState("");
  const [debounced, setDebounced] = useState("");

  useMemo(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-jobs", debounced, status, date],
    enabled: !!user && isAdmin,
    queryFn: () =>
      fn({
        data: {
          search: debounced || undefined,
          status: status || undefined,
          date: date || undefined,
          limit: 100,
        },
      }),
  });

  if (loading || rl) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  if (!isAdmin) return <AdminLayout><p className="p-8 text-muted-foreground">Admin access required.</p></AdminLayout>;

  const jobs = data?.jobs ?? [];

  return (
    <AdminLayout>
      <AdminPageHeader
        eyebrow="Field Ops"
        title="Jobs"
        subtitle="Operational execution of every booked quote."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, address, contact…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus | "")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          <Truck className="mx-auto mb-3 h-8 w-8 opacity-40" />
          No jobs match those filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Event date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Site</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j: any) => {
                const q = j.quote ?? {};
                const c = j.customer ?? {};
                return (
                  <tr key={j.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-3 py-2">
                      <Link to="/admin/jobs/$id" params={{ id: j.id }} className="font-medium text-primary hover:underline">
                        {j.title || q.quote_number || "Untitled"}
                      </Link>
                      {q.quote_number && <div className="font-mono text-[11px] text-muted-foreground">{q.quote_number}</div>}
                    </td>
                    <td className="px-3 py-2">{c.name || q.customer_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {j.event_date ? new Date(j.event_date + "T00:00:00").toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={j.status} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{j.site_address || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
