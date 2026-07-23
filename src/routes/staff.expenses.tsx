import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-staff";
import { addExpense, getReceiptSignedUrl, listMyExpenses } from "@/lib/expenses.functions";
import { listMyJobs } from "@/lib/jobs.functions";

export const Route = createFileRoute("/staff/expenses")({
  head: () => ({ meta: [{ title: "Expenses | Crew" }, { name: "robots", content: "noindex" }] }),
  component: ExpensesPage,
});

const CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "supplies", label: "Supplies" },
  { value: "tolls", label: "Tolls" },
  { value: "meals", label: "Meals" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

function fmt$(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function ExpensesPage() {
  const qc = useQueryClient();
  const { staff } = useIsStaff();
  const addFn = useServerFn(addExpense);
  const listFn = useServerFn(listMyExpenses);
  const jobsFn = useServerFn(listMyJobs);
  const signFn = useServerFn(getReceiptSignedUrl);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("supplies");
  const [jobId, setJobId] = useState<string>("");
  const [note, setNote] = useState("");
  const [incurredOn, setIncurredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
  }, []);

  const jobsQ = useQuery({
    queryKey: ["my-jobs", "expenses-picker"],
    queryFn: () => {
      const s = new Date(); s.setDate(s.getDate() - 30);
      const e = new Date(); e.setDate(e.getDate() + 60);
      return jobsFn({ data: { start_date: s.toISOString(), end_date: e.toISOString() } as never });
    },
  });
  const listQ = useQuery({
    queryKey: ["my-expenses", range.start_date, range.end_date],
    queryFn: () => listFn({ data: range as never }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(amount.replace(/[^\d.]/g, "")) * 100);
      if (!cents || cents < 0) throw new Error("Enter an amount");
      let receiptPath: string | null = null;
      if (file && staff?.id) {
        setUploading(true);
        try {
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
          const path = `${staff.id}/${crypto.randomUUID()}.${ext || "jpg"}`;
          const { error } = await supabase.storage.from("receipts").upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
          if (error) throw new Error(error.message);
          receiptPath = path;
        } finally {
          setUploading(false);
        }
      }
      return addFn({
        data: {
          job_id: jobId || null,
          category,
          amount_cents: cents,
          note: note || null,
          receipt_path: receiptPath,
          incurred_on: incurredOn,
        } as never,
      });
    },
    onSuccess: () => {
      toast.success("Expense added");
      setAmount(""); setNote(""); setFile(null); setJobId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["my-expenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const jobs = ((jobsQ.data ?? []) as Array<{ job: { id: string; title: string | null; event_date: string | null } }>);

  return (
    <div className="space-y-6">
      <header>
        <Link to="/staff/more" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> More
        </Link>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">Expenses</h1>
        <p className="text-sm text-muted-foreground">Snap a receipt and log it in seconds.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Add expense</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-1 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 h-12 w-full rounded-md border border-border bg-background px-3 text-base"
            />
          </label>
          <label className="col-span-1 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
            <input
              type="date"
              value={incurredOn}
              onChange={(e) => setIncurredOn(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-border bg-background px-3 text-base"
            />
          </label>
          <label className="col-span-2 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="mt-1 h-12 w-full rounded-md border border-border bg-background px-3 text-base"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job (optional)</span>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="mt-1 h-12 w-full rounded-md border border-border bg-background px-3 text-base"
            >
              <option value="">— No job —</option>
              {jobs.map((j) => (
                <option key={j.job.id} value={j.job.id}>
                  {j.job.title ?? "Job"}{j.job.event_date ? ` · ${j.job.event_date}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background p-3 text-sm"
              placeholder="What was this for?"
            />
          </label>
          <div className="col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipt photo</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="receipt-file"
              />
              <label
                htmlFor="receipt-file"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background text-sm font-semibold text-muted-foreground hover:bg-secondary"
              >
                <Camera className="h-4 w-4" />
                {file ? file.name.slice(0, 30) : "Take / attach photo"}
              </label>
            </div>
          </div>
        </div>
        <button
          onClick={() => submit.mutate()}
          disabled={submit.isPending || uploading}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {(submit.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
          Save expense
        </button>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last 30 days</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Total: {fmt$(listQ.data?.total_cents ?? 0)}
          </span>
        </div>
        {listQ.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (listQ.data?.expenses ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          <ul className="space-y-2">
            {(listQ.data?.expenses ?? []).map((e) => (
              <ExpenseRow key={e.id} exp={e} signFn={signFn} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ExpenseRow({ exp, signFn }: {
  exp: { id: string; category: string; amount_cents: number; note: string | null; receipt_path: string | null; incurred_on: string; jobs?: any };
  signFn: (args: { data: { path: string } }) => Promise<{ url: string | null }>;
}) {
  const [loadingUrl, setLoadingUrl] = useState(false);
  const openReceipt = async () => {
    if (!exp.receipt_path) return;
    setLoadingUrl(true);
    try {
      const { url } = await signFn({ data: { path: exp.receipt_path } });
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open receipt");
    } finally {
      setLoadingUrl(false);
    }
  };
  const j = exp.jobs as { title?: string | null } | null;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="capitalize">{exp.category}</span>
          <span className="text-xs font-normal text-muted-foreground">· {exp.incurred_on}</span>
        </p>
        {j?.title && <p className="truncate text-xs text-muted-foreground">Job: {j.title}</p>}
        {exp.note && <p className="mt-0.5 truncate text-xs text-muted-foreground">{exp.note}</p>}
      </div>
      <div className="flex items-center gap-2">
        {exp.receipt_path && (
          <button
            onClick={openReceipt}
            disabled={loadingUrl}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            {loadingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Receipt className="h-3 w-3" />}
            Receipt
          </button>
        )}
        <span className="text-base font-semibold text-foreground">{fmt$(exp.amount_cents)}</span>
      </div>
    </li>
  );
}
