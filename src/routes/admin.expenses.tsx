import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Receipt, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getReceiptSignedUrl, listExpenses, updateExpense, deleteExpense } from "@/lib/expenses.functions";
import { listStaff } from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({ meta: [{ title: "Expenses | Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminExpensesPage,
});

const CATEGORIES = ["fuel", "supplies", "tolls", "meals", "equipment", "other"] as const;
type Cat = (typeof CATEGORIES)[number];

function fmt$(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function AdminExpensesPage() {
  const listFn = useServerFn(listExpenses);
  const staffFn = useServerFn(listStaff);

  const [staffId, setStaffId] = useState("");
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [openId, setOpenId] = useState<string | null>(null);

  const range = useMemo(() => {
    const end = new Date(); const start = new Date();
    start.setDate(start.getDate() - days);
    return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
  }, [days]);

  const staffQ = useQuery({ queryKey: ["admin-staff-list"], queryFn: () => staffFn() });
  const q = useQuery({
    queryKey: ["admin-expenses", staffId, range.start_date, range.end_date],
    queryFn: () => listFn({ data: { ...(staffId ? { staff_id: staffId } : {}), ...range } as never }),
  });

  const expenses = q.data?.expenses ?? [];
  const active = expenses.find((e: any) => e.id === openId) ?? null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-serif text-primary">Expenses</h1>
          <p className="text-sm text-muted-foreground">Reimbursable spend by crew and job. Tap any row to view or correct.</p>
        </header>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="">All staff</option>
              {(staffQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Range</label>
            <select value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90 | 365)} className="mt-1 h-10 rounded-md border border-border bg-background px-3 text-sm">
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
                    {expenses.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No expenses in this range.</td></tr>
                    ) : expenses.map((e: any) => (
                      <tr key={e.id} onClick={() => setOpenId(e.id)} className="cursor-pointer border-t border-border/60 hover:bg-secondary/40">
                        <td className="px-4 py-2 text-muted-foreground">{e.incurred_on}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{e.staff?.name ?? "—"}</td>
                        <td className="px-4 py-2 capitalize text-muted-foreground">{e.category}</td>
                        <td className="max-w-[180px] truncate px-4 py-2 text-muted-foreground">{e.jobs?.title ?? "—"}</td>
                        <td className="max-w-[200px] truncate px-4 py-2 text-muted-foreground">{e.note ?? ""}</td>
                        <td className="px-4 py-2 text-center">
                          {e.receipt_path ? <span className="inline-flex items-center gap-1 text-primary"><Receipt className="h-3.5 w-3.5" /> Yes</span> : "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">{fmt$(e.amount_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {expenses.length === 0 ? (
                  <li className="px-4 py-10 text-center text-muted-foreground">No expenses in this range.</li>
                ) : expenses.map((e: any) => (
                  <li key={e.id}>
                    <button onClick={() => setOpenId(e.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left text-sm hover:bg-secondary/40">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-semibold text-foreground">{e.staff?.name ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground"><span>{e.incurred_on}</span> · <span className="capitalize">{e.category}</span></p>
                        {e.jobs?.title && <p className="truncate text-xs text-muted-foreground">Job: {e.jobs.title}</p>}
                        {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
                        {e.receipt_path && <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Receipt className="h-3.5 w-3.5" /> Receipt attached</p>}
                      </div>
                      <div className="shrink-0 text-right font-semibold">{fmt$(e.amount_cents)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {active && <ExpenseDialog expense={active} onClose={() => setOpenId(null)} />}
    </AdminLayout>
  );
}

function ExpenseDialog({ expense, onClose }: { expense: any; onClose: () => void }) {
  const qc = useQueryClient();
  const updFn = useServerFn(updateExpense);
  const delFn = useServerFn(deleteExpense);
  const signFn = useServerFn(getReceiptSignedUrl);

  const [category, setCategory] = useState<Cat>(expense.category);
  const [amount, setAmount] = useState<string>(((expense.amount_cents ?? 0) / 100).toFixed(2));
  const [incurredOn, setIncurredOn] = useState<string>(expense.incurred_on);
  const [note, setNote] = useState<string>(expense.note ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    setCategory(expense.category);
    setAmount(((expense.amount_cents ?? 0) / 100).toFixed(2));
    setIncurredOn(expense.incurred_on);
    setNote(expense.note ?? "");
    setReceiptUrl(null);
    if (expense.receipt_path) {
      signFn({ data: { path: expense.receipt_path } }).then((r) => setReceiptUrl(r.url)).catch(() => {});
    }
  }, [expense.id]);

  const save = useMutation({
    mutationFn: () => updFn({ data: {
      id: expense.id,
      category,
      amount_cents: Math.round(parseFloat(amount || "0") * 100),
      incurred_on: incurredOn,
      note: note.trim() ? note.trim() : null,
    } as never }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-expenses"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: expense.id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-expenses"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Expense</p>
            <h2 className="truncate font-serif text-lg text-foreground">
              {expense.staff?.id ? (
                <Link to="/admin/staff_/$id" params={{ id: expense.staff.id }} className="hover:underline" onClick={onClose}>{expense.staff?.name}</Link>
              ) : expense.staff?.name ?? "Expense"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button>
        </header>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 text-sm">
          {expense.jobs?.id && (
            <p className="rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
              Linked job: <Link to="/admin/jobs/$id" params={{ id: expense.jobs.id }} className="text-primary hover:underline" onClick={onClose}>{expense.jobs.title ?? "Job"}</Link>
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
              <input type="date" value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount ($)</span>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Cat)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Note</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
          </label>
          {expense.receipt_path && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Receipt</p>
              {receiptUrl ? (
                <a href={receiptUrl} target="_blank" rel="noopener" className="block">
                  <img src={receiptUrl} alt="Receipt" className="max-h-80 w-full rounded-lg border border-border object-contain" />
                </a>
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <button onClick={() => { if (confirm("Delete this expense?")) del.mutate(); }} className="inline-flex items-center gap-1 rounded-full border border-red-600/30 px-3 py-2 text-xs font-semibold text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground">Cancel</button>
            <button disabled={save.isPending} onClick={() => save.mutate()} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: { label: string; cents: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
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
