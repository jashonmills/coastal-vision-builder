import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { listTimeEntries } from "@/lib/time.functions";
import { listStaff } from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/timesheets")({
  head: () => ({
    meta: [
      { title: "Timesheets | Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TimesheetsPage,
});

function fmtHours(seconds: number) {
  return `${(seconds / 3600).toFixed(2)}h`;
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function TimesheetsPage() {
  const listFn = useServerFn(listTimeEntries);
  const staffFn = useServerFn(listStaff);

  const [staffId, setStaffId] = useState<string>("");
  const [days, setDays] = useState<7 | 14 | 30 | 90>(14);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, [days]);

  const staffQ = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: () => staffFn(),
  });

  const q = useQuery({
    queryKey: ["admin-timesheets", staffId, range.start_date, range.end_date],
    queryFn: () =>
      listFn({
        data: {
          ...(staffId ? { staff_id: staffId } : {}),
          start_date: range.start_date,
          end_date: range.end_date,
        } as never,
      }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-serif text-primary">Timesheets</h1>
          <p className="text-sm text-muted-foreground">Crew hours across jobs and ad-hoc work.</p>
        </header>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">All staff</option>
              {(staffQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 14 | 30 | 90)}
              className="mt-1 h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="rounded-full bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary">
            Total: {fmtHours(q.data?.total_seconds ?? 0)}
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryCard
                title="By staff"
                rows={(q.data?.by_staff ?? []).map((r) => ({ label: r.name, seconds: r.seconds }))}
              />
              <SummaryCard
                title="By job"
                rows={(q.data?.by_job ?? []).map((r) => ({ label: r.title, seconds: r.seconds }))}
              />
            </div>

            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="hidden w-full text-sm md:table">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Staff</th>
                      <th className="px-4 py-2">Work</th>
                      <th className="px-4 py-2">In</th>
                      <th className="px-4 py-2">Out</th>
                      <th className="px-4 py-2 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.data?.entries ?? []).length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No entries in this range.</td></tr>
                    ) : (
                      (q.data?.entries ?? []).map((e) => {
                        const staffRow = e.staff as { name?: string } | null;
                        const jobRow = e.jobs as { title?: string | null } | null;
                        return (
                          <tr key={e.id} className="border-t border-border/60">
                            <td className="max-w-[160px] truncate px-4 py-2 font-medium text-foreground">{staffRow?.name ?? "—"}</td>
                            <td className="max-w-[220px] truncate px-4 py-2">
                              {jobRow?.title ?? e.task_label ?? (
                                <span className="capitalize text-muted-foreground">{e.category}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">{fmtDT(e.clock_in)}</td>
                            <td className="px-4 py-2 text-muted-foreground">{e.clock_out ? fmtDT(e.clock_out) : <span className="text-emerald-700">open</span>}</td>
                            <td className="px-4 py-2 text-right font-semibold">{e.duration_seconds != null ? fmtHours(e.duration_seconds) : "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="divide-y divide-border md:hidden">
                {(q.data?.entries ?? []).length === 0 ? (
                  <li className="px-4 py-10 text-center text-muted-foreground">No entries in this range.</li>
                ) : (
                  (q.data?.entries ?? []).map((e) => {
                    const staffRow = e.staff as { name?: string } | null;
                    const jobRow = e.jobs as { title?: string | null } | null;
                    const work = jobRow?.title ?? e.task_label ?? e.category;
                    return (
                      <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{staffRow?.name ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground capitalize">{work}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {fmtDT(e.clock_in)} → {e.clock_out ? fmtDT(e.clock_out) : <span className="text-emerald-700">open</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold">{e.duration_seconds != null ? fmtHours(e.duration_seconds) : "—"}</p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: { label: string; seconds: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
              <span className="truncate text-foreground">{r.label}</span>
              <span className="font-semibold text-foreground">{fmtHours(r.seconds)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
