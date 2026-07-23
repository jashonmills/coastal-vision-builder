import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-staff";
import { getMyJob } from "@/lib/jobs.functions";
import { getPullList } from "@/lib/pull.functions";
import { checkInJobLines } from "@/lib/returns.functions";

export const Route = createFileRoute("/staff/jobs_/$id/checkin")({
  head: () => ({ meta: [{ title: "Check in gear | Crew" }, { name: "robots", content: "noindex" }] }),
  component: CheckInPage,
});

type LineInput = {
  returned_ok: number;
  cleaning: number;
  damaged: number;
  missing: number;
  notes: string;
  photo?: File | null;
};

type PullLine = {
  id: string;
  name: string;
  category: string | null;
  inventory_item_id: string | null;
  quantity_required: number;
  quantity_pulled: number;
  quantity_returned_ok: number;
  quantity_cleaning: number;
  quantity_damaged: number;
  quantity_missing: number;
};

function outstandingOf(l: PullLine) {
  return Math.max(
    0,
    (l.quantity_pulled ?? 0)
      - (l.quantity_returned_ok ?? 0)
      - (l.quantity_cleaning ?? 0)
      - (l.quantity_damaged ?? 0)
      - (l.quantity_missing ?? 0),
  );
}

function CheckInPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { staff } = useIsStaff();

  const jobFn = useServerFn(getMyJob);
  const pullFn = useServerFn(getPullList);
  const submitFn = useServerFn(checkInJobLines);

  const jobQ = useQuery({
    queryKey: ["my-job", id],
    queryFn: () => jobFn({ data: { id } as never }),
  });
  const pullQ = useQuery({
    queryKey: ["staff-pull", id],
    queryFn: () => pullFn({ data: { job_id: id } as never }),
  });

  const linesOut = useMemo<PullLine[]>(() => {
    const groups = (pullQ.data as any)?.groups ?? [];
    const flat: PullLine[] = groups.flatMap((g: any) => g.items as PullLine[]);
    return flat
      .filter((l) => l.inventory_item_id && outstandingOf(l) > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pullQ.data]);

  const [state, setState] = useState<Record<string, LineInput>>({});
  const inputFor = (l: PullLine): LineInput =>
    state[l.id] ?? { returned_ok: 0, cleaning: 0, damaged: 0, missing: 0, notes: "" };

  const updateLine = (l: PullLine, patch: Partial<LineInput>) => {
    const cur = inputFor(l);
    const next = { ...cur, ...patch };
    // Clamp: sum ≤ outstanding
    const out = outstandingOf(l);
    let sum = next.returned_ok + next.cleaning + next.damaged + next.missing;
    if (sum > out) {
      // reduce the just-updated key back down
      const key = Object.keys(patch)[0] as keyof LineInput;
      if (typeof next[key] === "number") {
        (next as any)[key] = Math.max(0, (next[key] as number) - (sum - out));
      }
      sum = next.returned_ok + next.cleaning + next.damaged + next.missing;
    }
    setState((s) => ({ ...s, [l.id]: next }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; applied: number; skipped: Array<{ line_id: string; reason: string }> } | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const changed = Object.entries(state).filter(([, v]) =>
        (v.returned_ok + v.cleaning + v.damaged + v.missing) > 0,
      );
      if (changed.length === 0) throw new Error("Enter some quantities first");
      setSubmitting(true);
      try {
        // Upload photos first (optional, per line)
        const lines: Array<{
          line_id: string; returned_ok: number; cleaning: number; damaged: number; missing: number;
          notes?: string | null; photo_path?: string | null;
        }> = [];
        for (const [line_id, v] of changed) {
          let photo_path: string | null = null;
          if (v.photo && staff?.id) {
            const ext = (v.photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
            const path = `${id}/${staff.id}/${crypto.randomUUID()}.${ext}`;
            const { error } = await supabase.storage.from("job-photos").upload(path, v.photo, {
              contentType: v.photo.type || "image/jpeg",
              upsert: false,
            });
            if (error) throw new Error(error.message);
            photo_path = path;
          }
          lines.push({
            line_id,
            returned_ok: v.returned_ok,
            cleaning: v.cleaning,
            damaged: v.damaged,
            missing: v.missing,
            notes: v.notes || null,
            photo_path,
          });
        }
        return submitFn({ data: { job_id: id, lines } as never });
      } finally {
        setSubmitting(false);
      }
    },
    onSuccess: (res: any) => {
      toast.success("Check-in saved");
      setResult({ status: res.job_status, applied: res.applied?.length ?? 0, skipped: res.skipped ?? [] });
      setState({});
      qc.invalidateQueries({ queryKey: ["staff-pull", id] });
      qc.invalidateQueries({ queryKey: ["admin-reconciliation", id] });
      qc.invalidateQueries({ queryKey: ["my-job", id] });
      qc.invalidateQueries({ queryKey: ["admin-job", id] });
      qc.invalidateQueries({ queryKey: ["cleaning-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (jobQ.isLoading || pullQ.isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!jobQ.data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Job not accessible.</p>
        <Link to="/staff/jobs" className="mt-4 inline-block text-primary underline">Back to My Jobs</Link>
      </div>
    );
  }

  const job = (jobQ.data as any).job as { id: string; title: string | null; event_date: string | null; status: string };
  const stillOut = linesOut.reduce((n, l) => n + outstandingOf(l), 0);

  return (
    <div className="space-y-5">
      <Link to="/staff/jobs/$id" params={{ id }} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to job
      </Link>

      <header>
        <h1 className="text-xl font-serif text-primary sm:text-2xl">Check in gear</h1>
        <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
          {job.title ?? "Job"} · {stillOut} unit{stillOut === 1 ? "" : "s"} still out
        </p>
      </header>

      {result && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Check-in saved</div>
          <p className="mt-1">Job status: <span className="font-semibold capitalize">{result.status.replace("_", " ")}</span> · {result.applied} line{result.applied === 1 ? "" : "s"} updated.</p>
          {result.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-emerald-900/80">
              {result.skipped.map((s, i) => <li key={i}>Skipped: {s.reason}</li>)}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigate({ to: "/staff/jobs/$id", params: { id } })}
              className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
            >Back to job</button>
          </div>
        </div>
      )}

      {linesOut.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing outstanding to check in. All pulled gear has been returned or accounted for.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {linesOut.map((l) => {
              const v = inputFor(l);
              const out = outstandingOf(l);
              return (
                <li key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{l.name}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {l.category ?? "Other"} · {out} out
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Stepper label="Returned OK" tone="ok" value={v.returned_ok} max={out} onChange={(n) => updateLine(l, { returned_ok: n })} />
                    <Stepper label="Cleaning" tone="cleaning" value={v.cleaning} max={out} onChange={(n) => updateLine(l, { cleaning: n })} />
                    <Stepper label="Damaged" tone="damaged" value={v.damaged} max={out} onChange={(n) => updateLine(l, { damaged: n })} />
                    <Stepper label="Missing" tone="missing" value={v.missing} max={out} onChange={(n) => updateLine(l, { missing: n })} />
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-primary">Add note / photo</summary>
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Optional note about this item"
                        value={v.notes}
                        onChange={(e) => updateLine(l, { notes: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                      <PhotoInput
                        file={v.photo ?? null}
                        onChange={(f) => updateLine(l, { photo: f })}
                      />
                    </div>
                  </details>

                  {(v.returned_ok + v.cleaning + v.damaged + v.missing) > 0 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {v.returned_ok + v.cleaning + v.damaged + v.missing} / {out} accounted for on submit.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => submit.mutate()}
            disabled={submitting || submit.isPending}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {submitting || submit.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</> : "Submit check-in"}
          </button>
        </>
      )}
    </div>
  );
}

function Stepper({
  label, value, max, onChange, tone,
}: {
  label: string; value: number; max: number; onChange: (n: number) => void;
  tone: "ok" | "cleaning" | "damaged" | "missing";
}) {
  const toneMap: Record<string, string> = {
    ok: "border-emerald-300 bg-emerald-50 text-emerald-900",
    cleaning: "border-sky-300 bg-sky-50 text-sky-900",
    damaged: "border-amber-300 bg-amber-50 text-amber-900",
    missing: "border-rose-300 bg-rose-50 text-rose-900",
  };
  return (
    <div className={`rounded-xl border p-2 ${toneMap[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="grid h-9 w-9 place-items-center rounded-full border border-current/30 bg-white/80 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[2ch] text-center text-lg font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid h-9 w-9 place-items-center rounded-full border border-current/30 bg-white/80 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PhotoInput({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-secondary"
      >
        <Camera className="h-4 w-4" /> {file ? "Change photo" : "Add damage photo"}
      </button>
      {file && (
        <>
          <span className="truncate text-xs text-muted-foreground">{file.name}</span>
          <button
            type="button"
            onClick={() => { onChange(null); if (ref.current) ref.current.value = ""; }}
            className="text-xs text-rose-600 hover:underline"
          >
            Remove
          </button>
        </>
      )}
    </div>
  );
}
