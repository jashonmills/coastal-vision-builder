import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getReceiptSignedUrl, listExpenses } from "@/lib/expenses.functions";
import { listStaff } from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({ meta: [{ title: "Expenses | Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminExpensesPage,
});

function fmt$(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function AdminExpensesPage() {
  const listFn = useServerFn(listExpenses);
  const staffFn = useServerFn(listStaff);
  const signFn = useServerFn(getReceiptSignedUrl);

  const [staffId, setStaffId] = useState("");
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
  }, [days]);

  const staffQ = useQuery({ queryKey: ["admin-staff-list"], queryFn: () => staffFn() });
  const q = useQuery({
    queryKey: ["admin-expenses", staffId, range.start_date, range.end_date],
    queryFn: () => listFn({ data: { ...(staffId ? { staff_id: staffId } : {}), ...range } as never }),
  });

  const openReceipt = async (path: string) => {
    try {
      const { url } = await signFn({ data: { path } });
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-serif text-primary">Expenses</h1>
          <p className="text-sm text-muted-foreground">Reimbursable spend by crew and job.</p>
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
              {(staffQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90 | 365)}
              className="mt-1 h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
          <div className="rounded-full bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary">
            Total: {fmt$(q.data?.total_cents ?? 0)}
          </div>
        </div>

        {q.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SummaryCard title="By staff" rows={(q.data?.by_staff ?? []).map((r) => ({ label: r.name, cents: r.cents }))} />
              <SummaryCard title="By job" rows={(q.data?.by_job ?? []).map((r) => ({ label: r.title, cents: r.cents }))} />
            </div>

            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="hidden w-full text-sm md:table">
                  <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Staff</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Job</th>
                      <th className="px-4 py-2">Note</th>
                      <th className="px-4 py-2 text-center">Receipt</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.data?.expenses ?? []).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No expenses in this range.</td></tr>
                    ) : (
                      (q.data?.expenses ?? []).map((e: any) => (
                        <tr key={e.id} className="border-t border-border/60">
                          <td className="px-4 py-2 text-muted-foreground">{e.incurred_on}</td>
                          <td className="px-4 py-2 font-medium text-foreground">{e.staff?.name ?? "—"}</td>
                          <td className="px-4 py-2 capitalize text-muted-foreground">{e.category}</td>
                          <td className="max-w-[180px] truncate px-4 py-2 text-muted-foreground">{e.jobs?.title ?? "—"}</td>
                          <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground">{e.note ?? ""}</td>
                          <td className="px-4 py-2 text-center">
                            {e.receipt_path ? (
                              <button onClick={() => openReceipt(e.receipt_path)} className="inline-flex items-center gap-1 text-primary hover:underline">
                                <Receipt className="h-3.5 w-3.5" /> View
                              </button>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold">{fmt$(e.amount_cents)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile stacked cards */}
              <ul className="divide-y divide-border md:hidden">
                {(q.data?.expenses ?? []).length === 0 ? (
                  <li className="px-4 py-10 text-center text-muted-foreground">No expenses in this range.</li>
                ) : (
                  (q.data?.expenses ?? []).map((e: any) => (
                    <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-semibold text-foreground">{e.staff?.name ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          <span>{e.incurred_on}</span> · <span className="capitalize">{e.category}</span>
                        </p>
                        {e.jobs?.title && <p className="truncate text-xs text-muted-foreground">Job: {e.jobs.title}</p>}
                        {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
                        {e.receipt_path && (
                          <button onClick={() => openReceipt(e.receipt_path)} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Receipt className="h-3.5 w-3.5" /> View receipt
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 text-right font-semibold">{fmt$(e.amount_cents)}</div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: { label: string; cents: number }[] }) {
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
              <span className="font-semibold text-foreground">{`$${(r.cents / 100).toFixed(2)}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
