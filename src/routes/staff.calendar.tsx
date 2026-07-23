import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MapPin, X } from "lucide-react";
import { listCompanyJobs } from "@/lib/jobs.functions";
import { StatusPill } from "./staff.index";

export const Route = createFileRoute("/staff/calendar")({
  component: StaffCalendar,
});

type CompanyJob = {
  id: string; quote_id: string; title: string | null;
  event_date: string | null; start_time: string | null; end_time: string | null;
  status: string; site_address: string | null; is_mine: boolean;
};

function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function StaffCalendar() {
  const [mode, setMode] = useState<"month" | "list">("month");
  const [cursor, setCursor] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<CompanyJob | null>(null);

  const listFn = useServerFn(listCompanyJobs);
  const range = useMemo(() => {
    const start = new Date(cursor); start.setDate(1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, [cursor]);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["company-jobs", range.start_date],
    queryFn: async () => (await listFn({ data: range })) as unknown as CompanyJob[],
  });

  const byDay = useMemo(() => {
    const map = new Map<string, CompanyJob[]>();
    for (const j of jobs) {
      if (!j.event_date) continue;
      const k = j.event_date.slice(0, 10);
      (map.get(k) ?? map.set(k, []).get(k)!).push(j);
    }
    return map;
  }, [jobs]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
          <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">Calendar</h1>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
          <button onClick={() => setMode("month")} className={`rounded-full px-3 py-1.5 ${mode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Month</button>
          <button onClick={() => setMode("list")} className={`rounded-full px-3 py-1.5 ${mode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>List</button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-card px-2 py-1.5">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary" aria-label="Previous month"
        ><ChevronLeft className="h-4 w-4" /></button>
        <p className="text-sm font-semibold text-foreground">{fmtMonth(cursor)}</p>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary" aria-label="Next month"
        ><ChevronRight className="h-4 w-4" /></button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : mode === "month" ? (
        <MonthGrid cursor={cursor} byDay={byDay} onSelect={setSelected} />
      ) : (
        <ListView jobs={jobs} onSelect={setSelected} />
      )}

      <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> Assigned to you</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" /> Company job</span>
      </p>

      {selected && <JobSheet job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MonthGrid({ cursor, byDay, onSelect }: {
  cursor: Date;
  byDay: Map<string, CompanyJob[]>;
  onSelect: (j: CompanyJob) => void;
}) {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const today = dayKey(new Date());

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c.date) return <div key={i} className="aspect-square rounded-md bg-transparent" />;
          const k = dayKey(c.date);
          const list = byDay.get(k) ?? [];
          const mine = list.some((j) => j.is_mine);
          const isToday = k === today;
          return (
            <div
              key={i}
              className={`aspect-square rounded-md border p-1 text-left ${
                isToday ? "border-primary bg-primary/5" : "border-border bg-card"
              } ${mine ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{c.date.getDate()}</span>
                {mine && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {list.slice(0, 2).map((j) => (
                  <button
                    key={j.id}
                    onClick={() => onSelect(j)}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold ${
                      j.is_mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {j.title ?? "Job"}
                  </button>
                ))}
                {list.length > 2 && (
                  <p className="px-1 text-[9px] text-muted-foreground">+{list.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ jobs, onSelect }: { jobs: CompanyJob[]; onSelect: (j: CompanyJob) => void }) {
  if (jobs.length === 0) {
    return <div className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">No jobs this month.</div>;
  }
  const grouped = jobs.reduce<Record<string, CompanyJob[]>>((acc, j) => {
    const k = j.event_date?.slice(0, 10) ?? "unscheduled";
    (acc[k] ||= []).push(j);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([k, items]) => (
        <div key={k}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {k === "unscheduled" ? "Unscheduled" : new Date(k + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          <div className="space-y-1.5">
            {items.map((j) => (
              <button
                key={j.id}
                onClick={() => onSelect(j)}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border p-3 text-left shadow-sm active:scale-[.99] ${
                  j.is_mine ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{j.title ?? "Job"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmtTime(j.start_time)}{j.site_address ? ` · ${j.site_address}` : ""}
                  </p>
                </div>
                <StatusPill status={j.status} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function JobSheet({ job, onClose }: { job: CompanyJob; onClose: () => void }) {
  const mapsUrl = job.site_address ? `https://maps.google.com/?q=${encodeURIComponent(job.site_address)}` : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-background p-5 shadow-xl sm:rounded-3xl"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {job.event_date ? new Date(job.event_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : ""}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-foreground">{job.title ?? "Job"}</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><StatusPill status={job.status} /></div>
          {job.start_time && <p className="text-muted-foreground">Start {fmtTime(job.start_time)}{job.end_time ? ` – ${fmtTime(job.end_time)}` : ""}</p>}
          {job.site_address && (
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span>{job.site_address}</span></p>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              Directions
            </a>
          )}
        </div>
        {job.is_mine ? (
          <Link
            to="/staff/jobs/$id" params={{ id: job.id }} onClick={onClose}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            Open my job
          </Link>
        ) : (
          <p className="mt-4 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            You're not assigned to this job.
          </p>
        )}
      </div>
    </div>
  );
}
