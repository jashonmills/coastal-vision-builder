import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, Minus, Plus, RotateCcw, Truck } from "lucide-react";
import { toast } from "sonner";
import { getPullList, markJobLoaded, setPullLineProgress } from "@/lib/pull.functions";

export const Route = createFileRoute("/staff/jobs_/$id/pull")({
  component: PullListPage,
});

type Line = {
  id: string;
  name: string;
  category: string | null;
  quantity_required: number;
  quantity_pulled: number;
};
type Group = { category: string; items: Line[]; fully_pulled: number; total: number };
type Data = {
  job_id: string;
  status: string;
  groups: Group[];
  summary: { total: number; fully_pulled: number; total_required: number; total_pulled: number };
};

function PullListPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getPullList);
  const setFn = useServerFn(setPullLineProgress);
  const loadedFn = useServerFn(markJobLoaded);

  const q = useQuery({
    queryKey: ["pull-list", id],
    queryFn: () => getFn({ data: { job_id: id } as never }),
  });

  const setMut = useMutation({
    mutationFn: (v: { line_id: string; quantity_pulled: number }) =>
      setFn({ data: v as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pull-list", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const loadedMut = useMutation({
    mutationFn: () => loadedFn({ data: { job_id: id } as never }),
    onSuccess: (res: any) => {
      if (res?.unchanged) toast.info(`Status already "${res.status}"`);
      else toast.success("Marked truck loaded");
      qc.invalidateQueries({ queryKey: ["pull-list", id] });
      qc.invalidateQueries({ queryKey: ["my-job", id] });
      qc.invalidateQueries({ queryKey: ["pull-summary", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (q.error || !q.data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Pull list not available.</p>
        <Link to="/staff/jobs/$id" params={{ id }} className="mt-3 inline-block text-primary underline">Back to job</Link>
      </div>
    );
  }
  const data = q.data as unknown as Data;
  const { summary, groups } = data;
  const allDone = summary.total > 0 && summary.fully_pulled === summary.total;
  const pct = summary.total_required > 0
    ? Math.round((summary.total_pulled / summary.total_required) * 100) : 0;

  const confirmLoad = () => {
    if (!allDone) {
      if (!confirm(`Only ${summary.fully_pulled}/${summary.total} lines are fully pulled. Mark truck loaded anyway?`)) return;
    }
    loadedMut.mutate();
  };

  return (
    <div className="space-y-4">
      <Link to="/staff/jobs/$id" params={{ id }} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Job details
      </Link>

      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-lg text-primary">Pull list</h1>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {summary.fully_pulled} / {summary.total} lines
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{summary.total_pulled} / {summary.total_required} units · {pct}%</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No physical items to pull for this job.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.category} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <header className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">{g.category}</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.fully_pulled} / {g.total}
              </span>
            </header>
            <ul className="space-y-2">
              {g.items.map((l) => (
                <LineRow
                  key={l.id}
                  line={l}
                  disabled={setMut.isPending}
                  onSet={(qty) => setMut.mutate({ line_id: l.id, quantity_pulled: qty })}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {summary.total > 0 && (
        <button
          onClick={confirmLoad}
          disabled={loadedMut.isPending || data.status === "loaded"}
          className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-sm transition ${
            data.status === "loaded"
              ? "bg-emerald-600 text-white"
              : allDone
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-amber-600 text-white hover:bg-amber-700"
          } disabled:opacity-60`}
        >
          <Truck className="h-5 w-5" />
          {data.status === "loaded" ? "Truck marked loaded" : "Mark truck loaded"}
        </button>
      )}

      <button
        onClick={() => navigate({ to: "/staff/jobs/$id", params: { id } })}
        className="mt-1 w-full rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground"
      >
        Done
      </button>
    </div>
  );
}

function LineRow({
  line,
  onSet,
  disabled,
}: {
  line: Line;
  onSet: (qty: number) => void;
  disabled: boolean;
}) {
  const full = line.quantity_pulled >= line.quantity_required;
  const [local, setLocal] = useState<number | null>(null);
  const value = local ?? line.quantity_pulled;
  const commit = (n: number) => {
    const clamped = Math.max(0, Math.min(n, line.quantity_required));
    setLocal(clamped);
    onSet(clamped);
    setTimeout(() => setLocal(null), 400);
  };

  return (
    <li className={`rounded-xl border p-3 ${full ? "border-emerald-500 bg-emerald-50" : "border-border bg-background"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{line.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pulled <span className="font-semibold text-foreground">{value}</span> / {line.quantity_required} required
          </p>
        </div>
        {full && <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Fully pulled" />}
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => commit(value - 1)}
          disabled={disabled || value <= 0}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
          aria-label="Decrease"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="text-center text-lg font-semibold tabular-nums">{value}</div>
        <button
          type="button"
          onClick={() => commit(value + 1)}
          disabled={disabled || value >= line.quantity_required}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background disabled:opacity-40"
          aria-label="Increase"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => commit(line.quantity_required)}
          disabled={disabled || full}
          className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          Pull all
        </button>
        <button
          type="button"
          onClick={() => commit(0)}
          disabled={disabled || value === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-40"
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
