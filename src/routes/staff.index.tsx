import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Clock, MapPin, Navigation, Phone, Check, X, ClipboardList,
  Loader2, ChevronRight, Square,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-staff";
import { listMyJobs, acknowledgeAssignment } from "@/lib/jobs.functions";
import { getActiveTimeEntry, getWeeklyHours, clockOut } from "@/lib/time.functions";

export const Route = createFileRoute("/staff/")({
  component: StaffHome,
});

type MyJob = Awaited<ReturnType<typeof listMyJobs>>[number];

function todayKey() { return new Date().toISOString().slice(0, 10); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function StaffHome() {
  const { user } = useAuth();
  const { staff } = useIsStaff();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyJobs);
  const activeFn = useServerFn(getActiveTimeEntry);
  const weekFn = useServerFn(getWeeklyHours);
  const outFn = useServerFn(clockOut);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 45);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, []);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["my-jobs", user?.id ?? "anon", "home"],
    enabled: !!user,
    queryFn: async () => (await listFn({ data: range })) as unknown as MyJob[],
  });

  const activeQ = useQuery({
    queryKey: ["time-active", user?.id ?? "anon"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: () => activeFn(),
  });
  const weekQ = useQuery({
    queryKey: ["time-week-total", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => weekFn(),
  });

  const outMut = useMutation({
    mutationFn: () => outFn({ data: {} as never }),
    onSuccess: () => {
      toast.success("Clocked out");
      qc.invalidateQueries({ queryKey: ["time-active"] });
      qc.invalidateQueries({ queryKey: ["time-week-total"] });
      qc.invalidateQueries({ queryKey: ["time-week"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tk = todayKey();
  const today = jobs.filter((j) => (j.job.event_date ?? "").slice(0, 10) === tk);
  const upcoming = jobs.filter((j) => (j.job.event_date ?? "") > tk);
  const pending = jobs.reduce(
    (n, j) => n + j.events.filter((e) => e.ack_status === "assigned").length,
    0,
  );
  const weekHours = ((weekQ.data?.seconds ?? 0) / 3600).toFixed(1);

  const firstName = staff?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const salute = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crew Dashboard</p>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">
          {salute}, {firstName}
        </h1>
      </header>

      {activeQ.data && (
        <ActiveBanner
          entry={activeQ.data}
          onClockOut={() => outMut.mutate()}
          pending={outMut.isPending}
        />
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Today" value={today.length} />
        <Kpi label="Upcoming" value={upcoming.length} sub="next 45 days" />
        <Kpi label="Pending" value={pending} sub="acceptances" tone={pending ? "warn" : "muted"} />
        <Link to="/staff/clock" className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hours</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{weekHours}</p>
          <p className="text-[10px] text-muted-foreground">this week</p>
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-serif text-primary">
            <CalendarDays className="h-4 w-4" /> Today
          </h2>
          <Link to="/staff/jobs" className="text-xs font-semibold text-primary hover:underline">
            All jobs <ChevronRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : today.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            No jobs today — check your <Link to="/staff/calendar" className="text-primary underline">calendar</Link> for what's coming up.
          </div>
        ) : (
          <div className="space-y-3">
            {today.map((j) => <JobCard key={j.job.id} data={j} highlight />)}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/staff/calendar"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm active:scale-[.99]"
        >
          <CalendarDays className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Company calendar</p>
          <p className="text-xs text-muted-foreground">Browse all upcoming jobs</p>
        </Link>
        <Link
          to="/staff/jobs"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm active:scale-[.99]"
        >
          <ClipboardList className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">My jobs</p>
          <p className="text-xs text-muted-foreground">All jobs assigned to you</p>
        </Link>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, tone = "default" }: { label: string; value: number; sub?: string; tone?: "default" | "warn" | "muted" }) {
  const cls =
    tone === "warn" ? "border-amber-300 bg-amber-50" :
    tone === "muted" ? "border-border bg-card" :
    "border-border bg-card";
  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function JobCard({ data, highlight }: { data: MyJob; highlight?: boolean }) {
  const { job, events } = data;
  const qc = useQueryClient();
  const ackFn = useServerFn(acknowledgeAssignment);

  const roles = Array.from(new Set(events.map((e) => (e.role ?? "").trim()).filter(Boolean)));
  const currentAck = events[0]?.ack_status ?? "assigned";
  const earliest = events.map((e) => e.event?.start_time).filter((v): v is string => !!v).sort()[0];

  const ack = useMutation({
    mutationFn: (input: { assignment_id: string; ack_status: "accepted" | "declined"; reason?: string }) =>
      ackFn({
        data: {
          event_staff_id: input.assignment_id,
          ack_status: input.ack_status,
          decline_reason: input.reason ?? null,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Response saved");
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respondAll = async (status: "accepted" | "declined", reason?: string) => {
    for (const e of events) {
      await ack.mutateAsync({ assignment_id: e.assignment_id, ack_status: status, reason });
    }
  };

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const mapsUrl = job.site_address ? `https://maps.google.com/?q=${encodeURIComponent(job.site_address)}` : null;
  const telUrl = job.site_contact_phone ? `tel:${job.site_contact_phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <article className={`rounded-2xl border bg-card p-4 shadow-sm ${highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <Link to="/staff/jobs/$id" params={{ id: job.id }} className="block truncate text-base font-semibold text-foreground hover:underline">
            {job.title ?? "Job"}
          </Link>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
            {job.event_date ? new Date(job.event_date + "T00:00:00").toLocaleDateString() : "No date"}
          </p>
        </div>
        <StatusPill status={job.status} />
      </header>

      {earliest && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Call time {fmtTime(earliest)}</span>
        </div>
      )}

      {job.site_address && (
        <div className="mt-2 flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="break-words">{job.site_address}</span>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Navigation className="h-3.5 w-3.5" /> Directions
              </a>
            )}
          </div>
        </div>
      )}
      {telUrl && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <a href={telUrl} className="font-semibold text-primary underline-offset-2 hover:underline">
            {job.site_contact_phone}
          </a>
        </div>
      )}

      {roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">{r}</span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => respondAll("accepted")}
          disabled={ack.isPending || currentAck === "accepted"}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
            currentAck === "accepted"
              ? "bg-emerald-600 text-white"
              : "border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          } disabled:opacity-60`}
        >
          <Check className="h-4 w-4" /> {currentAck === "accepted" ? "Accepted" : "Accept"}
        </button>
        <button
          onClick={() => setDeclineOpen((v) => !v)}
          disabled={ack.isPending}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition ${
            currentAck === "declined"
              ? "bg-rose-600 text-white"
              : "border border-rose-600 text-rose-700 hover:bg-rose-50"
          } disabled:opacity-60`}
        >
          <X className="h-4 w-4" /> {currentAck === "declined" ? "Declined" : "Decline"}
        </button>
      </div>
      {declineOpen && (
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason (optional)</label>
          <textarea rows={2} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeclineOpen(false)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button
              onClick={async () => {
                await respondAll("declined", declineReason || undefined);
                setDeclineOpen(false);
                setDeclineReason("");
              }}
              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
            >Confirm decline</button>
          </div>
        </div>
      )}
    </article>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: "bg-sky-100 text-sky-800",
    prep: "bg-amber-100 text-amber-800",
    loaded: "bg-amber-100 text-amber-800",
    en_route: "bg-indigo-100 text-indigo-800",
    on_site: "bg-indigo-100 text-indigo-800",
    event: "bg-emerald-100 text-emerald-800",
    teardown: "bg-orange-100 text-orange-800",
    picked_up: "bg-orange-100 text-orange-800",
    returned: "bg-teal-100 text-teal-800",
    reconciled: "bg-teal-100 text-teal-800",
    closed: "bg-muted text-muted-foreground",
    cancelled: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
