import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarDays, Loader2, MapPin, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listMyJobs } from "@/lib/jobs.functions";
import { StatusPill } from "./staff.index";

export const Route = createFileRoute("/staff/jobs")({
  component: MyJobsPage,
});

type MyJob = Awaited<ReturnType<typeof listMyJobs>>[number];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function bucketOf(job: MyJob["job"]): "today" | "week" | "upcoming" | "past" {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wkStart = startOfWeek(today);
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7);
  const d = job.event_date ? new Date(job.event_date + "T00:00:00") : null;
  if (!d) return "upcoming";
  if (d.getTime() === today.getTime()) return "today";
  if (d < today) return "past";
  if (d >= wkStart && d < wkEnd) return "week";
  return "upcoming";
}

function MyJobsPage() {
  const { user } = useAuth();
  const listFn = useServerFn(listMyJobs);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setDate(now.getDate() + 365); end.setHours(23, 59, 59, 999);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, []);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["my-jobs", user?.id ?? "anon", "full"],
    enabled: !!user,
    queryFn: async () => (await listFn({ data: range })) as unknown as MyJob[],
  });

  const buckets: Record<string, MyJob[]> = { today: [], week: [], upcoming: [], past: [] };
  for (const j of jobs) buckets[bucketOf(j.job)].push(j);
  buckets.past.reverse();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crew</p>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">My Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every job you're assigned to.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No jobs assigned yet.</p>
        </div>
      ) : (
        <>
          <Group title="Today" items={buckets.today} emptyText="Nothing today." />
          <Group title="This week" items={buckets.week} emptyText="Nothing else this week." />
          <Group title="Upcoming" items={buckets.upcoming} emptyText="Nothing further scheduled." />
          {buckets.past.length > 0 && <Group title="Past" items={buckets.past} muted />}
        </>
      )}
    </div>
  );
}

function Group({ title, items, emptyText, muted }: { title: string; items: MyJob[]; emptyText?: string; muted?: boolean }) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className={`space-y-2 ${muted ? "opacity-70" : ""}`}>
          {items.map((j) => <Row key={j.job.id} data={j} />)}
        </div>
      )}
    </section>
  );
}

function Row({ data }: { data: MyJob }) {
  const { job, events } = data;
  const roles = Array.from(new Set(events.map((e) => (e.role ?? "").trim()).filter(Boolean)));
  return (
    <Link
      to="/staff/jobs/$id"
      params={{ id: job.id }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm active:scale-[.99]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{job.title ?? "Job"}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{job.event_date ? new Date(job.event_date + "T00:00:00").toLocaleDateString() : "No date"}</span>
          {roles.length > 0 && <span className="capitalize">· {roles.join(", ")}</span>}
        </p>
        {job.site_address && (
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span className="truncate">{job.site_address}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusPill status={job.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
