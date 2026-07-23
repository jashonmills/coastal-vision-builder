import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, Loader2, Play, Square, Briefcase, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { listMyJobs } from "@/lib/jobs.functions";
import {
  clockIn,
  clockOut,
  getActiveTimeEntry,
  listMyTimeEntries,
  type TimeCategory,
} from "@/lib/time.functions";
import { HelpTip } from "@/components/HelpTip";

export const Route = createFileRoute("/staff/clock")({
  component: ClockPage,
});

const AD_HOC_CATEGORIES: { value: TimeCategory; label: string }[] = [
  { value: "warehouse", label: "Warehouse" },
  { value: "maintenance", label: "Maintenance" },
  { value: "travel", label: "Travel" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
function fmtHours(seconds: number) {
  return `${(seconds / 3600).toFixed(2)}h`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function ClockPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const activeFn = useServerFn(getActiveTimeEntry);
  const listFn = useServerFn(listMyTimeEntries);
  const jobsFn = useServerFn(listMyJobs);
  const inFn = useServerFn(clockIn);
  const outFn = useServerFn(clockOut);

  const activeQ = useQuery({
    queryKey: ["time-active", user?.id ?? "anon"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: () => activeFn(),
  });

  const range = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return { start_date: start.toISOString() };
  }, []);
  const weekQ = useQuery({
    queryKey: ["time-week", user?.id ?? "anon", range.start_date],
    enabled: !!user,
    queryFn: () => listFn({ data: range }),
  });

  const jobsQ = useQuery({
    queryKey: ["my-jobs-clock", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 30);
      return await jobsFn({ data: { start_date: start.toISOString(), end_date: end.toISOString() } });
    },
  });

  const inMut = useMutation({
    mutationFn: (input: {
      job_id?: string | null;
      category: TimeCategory;
      task_label?: string | null;
    }) => inFn({ data: input as never }),
    onSuccess: () => {
      toast.success("Clocked in");
      qc.invalidateQueries({ queryKey: ["time-active"] });
      qc.invalidateQueries({ queryKey: ["time-week"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const outMut = useMutation({
    mutationFn: () => outFn({ data: {} as never }),
    onSuccess: () => {
      toast.success("Clocked out");
      qc.invalidateQueries({ queryKey: ["time-active"] });
      qc.invalidateQueries({ queryKey: ["time-week"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = activeQ.data;
  const [mode, setMode] = useState<"job" | "adhoc">("job");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [category, setCategory] = useState<TimeCategory>("warehouse");
  const [label, setLabel] = useState("");

  if (activeQ.isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crew</p>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">Clock</h1>
      </header>

      <HelpTip hintKey="staff-clock-intro">
        Clock into a specific job, or an ad-hoc task like "organizing the warehouse".
      </HelpTip>

      </header>

      {active ? (
        <RunningTimer
          entry={active}
          onClockOut={() => outMut.mutate()}
          pending={outMut.isPending}
        />
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <ModeBtn active={mode === "job"} onClick={() => setMode("job")} icon={Briefcase} label="Job" />
            <ModeBtn active={mode === "adhoc"} onClick={() => setMode("adhoc")} icon={Wrench} label="Ad-hoc task" />
          </div>

          {mode === "job" ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pick a job
              </label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— Select job —</option>
                {(jobsQ.data ?? []).map((j) => (
                  <option key={j.job.id} value={j.job.id}>
                    {(j.job.event_date ?? "").slice(0, 10)} · {j.job.title ?? "Job"}
                  </option>
                ))}
              </select>
              <button
                disabled={!selectedJob || inMut.isPending}
                onClick={() =>
                  inMut.mutate({ job_id: selectedJob, category: "job", task_label: null })
                }
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Play className="h-5 w-5" /> Clock in
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TimeCategory)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {AD_HOC_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Task
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Organizing warehouse"
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              />
              <button
                disabled={inMut.isPending}
                onClick={() =>
                  inMut.mutate({
                    job_id: null,
                    category,
                    task_label: label.trim() || null,
                  })
                }
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Play className="h-5 w-5" /> Clock in
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">This week</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {fmtHours(weekQ.data?.total_seconds ?? 0)}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {(weekQ.data?.entries ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet this week.</p>
          ) : (
            (weekQ.data?.entries ?? []).map((e) => (
              <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/60 pb-2 text-sm last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {(e.jobs as { title?: string | null } | null)?.title ?? e.task_label ?? e.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.clock_in).toLocaleDateString()} · {fmtTime(e.clock_in)}
                    {e.clock_out ? ` – ${fmtTime(e.clock_out)}` : " · open"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {e.duration_seconds != null ? fmtHours(e.duration_seconds) : "…"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        <Link to="/staff" className="text-primary hover:underline">Back to home</Link>
      </p>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: typeof Briefcase; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
        active ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function RunningTimer({
  entry, onClockOut, pending,
}: {
  entry: { clock_in: string; category: string; task_label: string | null; jobs?: { title?: string | null } | null };
  onClockOut: () => void;
  pending: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - new Date(entry.clock_in).getTime()) / 1000));
  const label = entry.jobs?.title ?? entry.task_label ?? entry.category;

  return (
    <section className="rounded-2xl border-2 border-emerald-500/60 bg-emerald-50 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
        <span className="grid h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
        On the clock
      </div>
      <p className="mt-2 truncate text-lg font-semibold text-emerald-900">{label}</p>
      <p className="mt-1 text-xs text-emerald-800">Since {fmtTime(entry.clock_in)}</p>
      <p className="mt-4 text-center font-mono text-4xl font-bold tabular-nums text-emerald-900">
        {fmtDuration(elapsed)}
      </p>
      <button
        onClick={onClockOut}
        disabled={pending}
        className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-rose-600 text-base font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
      >
        <Square className="h-5 w-5" /> Clock out
      </button>
    </section>
  );
}

// Re-export for use in the home dashboard.
export { fmtDuration, fmtHours };
export function ClockIcon() {
  return <Clock className="h-4 w-4" />;
}
