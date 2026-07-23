import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, CalendarDays, MapPin, Clock, Phone, KeyRound, Car, Info,
  Check, X, Navigation, ClipboardList, Truck, Wrench, Wine,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-staff";
import { useIsAdmin } from "@/hooks/use-admin";
import { listMyJobs, acknowledgeAssignment } from "@/lib/jobs.functions";

export const Route = createFileRoute("/my-schedule")({
  head: () => ({
    meta: [
      { title: "My Schedule | Pacific North Events & Tents" },
      { name: "description", content: "Your upcoming crew assignments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MySchedulePage,
});

type MyJob = {
  job: {
    id: string;
    quote_id: string;
    title: string | null;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    site_address: string | null;
    site_contact_name: string | null;
    site_contact_phone: string | null;
    gate_code: string | null;
    parking_notes: string | null;
    access_notes: string | null;
    notes: string | null;
  };
  events: Array<{
    assignment_id: string;
    role: string | null;
    ack_status: string;
    event: {
      id: string;
      start_time: string | null;
      end_time: string | null;
      event_type: string | null;
      location: string | null;
    } | null;
  }>;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function dateKey(v: string) {
  return v.slice(0, 10);
}
function isTodayKey(v: string | null) {
  if (!v) return false;
  return dateKey(v) === new Date().toISOString().slice(0, 10);
}

function MySchedulePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isStaff, staff, loading: staffLoading } = useIsStaff();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { next: "/my-schedule" } as never });
    }
  }, [authLoading, user, navigate]);

  const listFn = useServerFn(listMyJobs);
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 45);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, []);

  const { data: myJobs = [], isLoading } = useQuery({
    queryKey: ["my-jobs", user?.id ?? "anon", range.start_date],
    enabled: !!user && (isStaff || isAdmin),
    queryFn: async () => (await listFn({ data: range })) as unknown as MyJob[],
  });

  if (authLoading || staffLoading || adminLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (!user) return null;

  if (!isStaff && !isAdmin) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Crew" title="My Schedule" subtitle="Access required." />
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-muted-foreground">
            This page is for assigned crew. If you should have access, ask an admin to
            invite your account from the Staff console.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">Back to home</Link>
        </section>
      </SiteLayout>
    );
  }

  const today = myJobs.filter((j) => isTodayKey(j.job.event_date) || j.events.some((e) => isTodayKey(e.event?.start_time ?? null)));
  const upcoming = myJobs.filter((j) => !today.includes(j));
  const grouped = upcoming.reduce<Record<string, MyJob[]>>((acc, j) => {
    const k = j.job.event_date ?? j.events[0]?.event?.start_time?.slice(0, 10) ?? "unscheduled";
    (acc[k] ||= []).push(j);
    return acc;
  }, {});

  const staffName = staff?.name ?? user.email?.split("@")[0] ?? "there";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Crew"
        title="My Schedule"
        subtitle={`Welcome back, ${staffName}. Here's what's on your plate.`}
      />

      <section className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:py-12">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : myJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-serif text-primary">
                <CalendarDays className="h-5 w-5" /> Today
              </h2>
              {today.length === 0 ? (
                <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  Nothing scheduled for today. Enjoy the day!
                </p>
              ) : (
                <div className="space-y-4">
                  {today.map((j) => <JobCard key={j.job.id} data={j} highlight />)}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-serif text-primary">
                <CalendarDays className="h-5 w-5" /> Upcoming
              </h2>
              {Object.keys(grouped).length === 0 ? (
                <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  Nothing else scheduled in the next 45 days.
                </p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, items]) => (
                      <div key={k}>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {k === "unscheduled" ? "Unscheduled" : fmtDate(k + "T00:00:00")}
                        </h3>
                        <div className="space-y-3">
                          {items.map((j) => <JobCard key={j.job.id} data={j} />)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function JobCard({ data, highlight }: { data: MyJob; highlight?: boolean }) {
  const { job, events } = data;
  const qc = useQueryClient();
  const ackFn = useServerFn(acknowledgeAssignment);

  const roles = Array.from(
    new Set(events.map((e) => (e.role ?? "").trim()).filter(Boolean)),
  );

  // "Overall" ack pinned to the earliest event's ack (fine for MVP).
  const firstAssignment = events[0];
  const currentAck = firstAssignment?.ack_status ?? "assigned";

  const ackMutation = useMutation({
    mutationFn: (input: { assignment_id: string; ack_status: "accepted" | "declined"; decline_reason?: string | null }) =>
      ackFn({
        data: {
          event_staff_id: input.assignment_id,
          ack_status: input.ack_status,
          decline_reason: input.decline_reason ?? null,
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
      await ackMutation.mutateAsync({ assignment_id: e.assignment_id, ack_status: status, decline_reason: reason });
    }
  };

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const mapsUrl = job.site_address
    ? `https://maps.google.com/?q=${encodeURIComponent(job.site_address)}`
    : null;
  const telUrl = job.site_contact_phone ? `tel:${job.site_contact_phone.replace(/[^\d+]/g, "")}` : null;

  const earliestEvent = events
    .map((e) => e.event?.start_time)
    .filter((v): v is string => !!v)
    .sort()[0];

  return (
    <article
      className={`rounded-2xl border bg-card p-4 shadow-sm ${
        highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{job.title ?? "Job"}</h3>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">
            {job.event_date ? new Date(job.event_date + "T00:00:00").toLocaleDateString() : "No date"}
          </p>
        </div>
        <StatusPill status={job.status} />
      </header>

      {/* Times */}
      {earliestEvent && (
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>Call time {fmtTime(earliestEvent)}</span>
        </div>
      )}

      {/* Site block */}
      <div className="mt-3 space-y-2 text-sm">
        {job.site_address && (
          <InfoRow icon={MapPin} label="Address">
            <span>{job.site_address}</span>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                <Navigation className="h-3.5 w-3.5" /> Directions
              </a>
            )}
          </InfoRow>
        )}
        {job.site_contact_name && (
          <InfoRow icon={Info} label="Contact">
            <span>{job.site_contact_name}</span>
          </InfoRow>
        )}
        {telUrl && (
          <InfoRow icon={Phone} label="Phone">
            <a href={telUrl} className="font-semibold text-primary underline-offset-2 hover:underline">
              {job.site_contact_phone}
            </a>
          </InfoRow>
        )}
        {job.gate_code && (
          <InfoRow icon={KeyRound} label="Gate code">
            <code className="rounded bg-secondary px-2 py-0.5 font-mono text-xs">{job.gate_code}</code>
          </InfoRow>
        )}
        {job.parking_notes && (
          <InfoRow icon={Car} label="Parking"><span className="whitespace-pre-wrap">{job.parking_notes}</span></InfoRow>
        )}
        {job.access_notes && (
          <InfoRow icon={Info} label="Access"><span className="whitespace-pre-wrap">{job.access_notes}</span></InfoRow>
        )}
      </div>

      {/* Roles */}
      {roles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Accept / Decline */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => respondAll("accepted")}
          disabled={ackMutation.isPending || currentAck === "accepted"}
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
          disabled={ackMutation.isPending}
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reason (optional)
          </label>
          <textarea
            rows={2}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeclineOpen(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await respondAll("declined", declineReason || undefined);
                setDeclineOpen(false);
                setDeclineReason("");
              }}
              className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Confirm decline
            </button>
          </div>
        </div>
      )}

      {/* Role-aware placeholders */}
      {roles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {roles.map((r) => {
            const cfg = actionForRole(r);
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <button
                key={r}
                disabled
                title="Coming soon"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/60 text-xs font-semibold text-muted-foreground"
              >
                <Icon className="h-4 w-4" /> {cfg.label}
                <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider">Soon</span>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

function actionForRole(role: string): { label: string; icon: typeof ClipboardList } | null {
  const r = role.toLowerCase();
  if (r === "assembler" || r === "puller" || r === "setup") return { label: "Pull list", icon: ClipboardList };
  if (r === "driver") return { label: "Start trip", icon: Truck };
  if (r === "coordinator") return { label: "Setup checklist", icon: Wrench };
  if (r === "bartender" || r === "server" || r === "chef") return { label: "Shift details", icon: Wine };
  return { label: "Job details", icon: Info };
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Info; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label={label} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
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

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold text-foreground">No jobs yet</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        You're all set. When an admin assigns you to a job, it'll show up here.
      </p>
    </div>
  );
}
