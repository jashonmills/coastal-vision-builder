import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Loader2, CalendarDays, MapPin, Clock, Users } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsStaff } from "@/hooks/use-staff";
import { useIsAdmin } from "@/hooks/use-admin";
import { listMyAssignments, listEventStaff } from "@/lib/assignments.functions";

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

type Assignment = {
  id: string;
  role: string | null;
  event: {
    id: string;
    title: string | null;
    event_type: string | null;
    start_time: string | null;
    end_time: string | null;
    all_day: boolean | null;
    status: string | null;
    location: string | null;
    notes: string | null;
    color: string | null;
  } | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function dateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isToday(iso: string) {
  return dateKey(iso) === dateKey(new Date().toISOString());
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

  const listFn = useServerFn(listMyAssignments);
  const listCrewFn = useServerFn(listEventStaff);

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 31);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, []);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-assignments", user?.id ?? "anon", range.start_date],
    enabled: !!user && isStaff,
    queryFn: async () => (await listFn({ data: range })) as unknown as Assignment[],
  });

  const eventIds = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.event?.id).filter(Boolean) as string[])),
    [assignments],
  );

  // Fetch other crew per event (admin-only server fn; safe fallback when caller isn't admin)
  const { data: crewByEvent = {} } = useQuery({
    queryKey: ["my-schedule-crew", eventIds.join(",")],
    enabled: isAdmin && eventIds.length > 0,
    queryFn: async () => {
      const map: Record<string, Array<{ name: string; color: string | null; role: string | null }>> = {};
      await Promise.all(
        eventIds.map(async (id) => {
          try {
            const rows = (await listCrewFn({ data: { event_id: id } })) as unknown as Array<{
              role: string | null;
              staff: { name: string; color: string | null } | null;
            }>;
            map[id] = rows
              .map((r) => ({
                name: r.staff?.name ?? "",
                color: r.staff?.color ?? null,
                role: r.role,
              }))
              .filter((r) => r.name);
          } catch {
            map[id] = [];
          }
        }),
      );
      return map;
    },
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
            This page is for assigned crew members. If you should have access, ask an admin to
            invite your account from the Staff console.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary underline">Back to home</Link>
        </section>
      </SiteLayout>
    );
  }

  const today = assignments.filter((a) => a.event?.start_time && isToday(a.event.start_time));
  const upcoming = assignments.filter(
    (a) => a.event?.start_time && !isToday(a.event.start_time) && new Date(a.event.start_time) > new Date(),
  );

  const grouped = upcoming.reduce<Record<string, Assignment[]>>((acc, a) => {
    const k = dateKey(a.event!.start_time!);
    (acc[k] ||= []).push(a);
    return acc;
  }, {});

  const staffName = staff?.name ?? user.email?.split("@")[0] ?? "there";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Crew"
        title="My Schedule"
        subtitle={`Welcome back, ${staffName}. Here's what's on your calendar.`}
      />

      <section className="mx-auto max-w-4xl space-y-10 px-4 py-12 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-serif text-primary">
                <CalendarDays className="h-5 w-5" /> Today
              </h2>
              {today.length === 0 ? (
                <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  Nothing scheduled for today. Enjoy the day off!
                </p>
              ) : (
                <div className="grid gap-3">
                  {today.map((a) => (
                    <EventCard key={a.id} a={a} crew={a.event ? crewByEvent[a.event.id] : undefined} highlight />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-serif text-primary">
                <CalendarDays className="h-5 w-5" /> Upcoming (next 30 days)
              </h2>
              {Object.keys(grouped).length === 0 ? (
                <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                  No upcoming events assigned. Check back soon.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(grouped)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, items]) => (
                      <div key={k}>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {fmtDate(items[0].event!.start_time!)}
                        </h3>
                        <div className="grid gap-3">
                          {items.map((a) => (
                            <EventCard key={a.id} a={a} crew={a.event ? crewByEvent[a.event.id] : undefined} />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function EventCard({
  a,
  crew,
  highlight,
}: {
  a: Assignment;
  crew?: Array<{ name: string; color: string | null; role: string | null }>;
  highlight?: boolean;
}) {
  const ev = a.event;
  if (!ev) return null;
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: ev.color ?? "#888" }}
            />
            <h4 className="truncate font-semibold text-foreground">{ev.title ?? "(Untitled event)"}</h4>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {ev.start_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {ev.all_day
                  ? "All day"
                  : `${fmtTime(ev.start_time)}${ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ""}`}
              </div>
            )}
            {ev.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{ev.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {a.role && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
              {a.role}
            </span>
          )}
          {ev.event_type && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{ev.event_type}</span>
          )}
        </div>
      </div>

      {ev.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{ev.notes}</p>}

      {crew && crew.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {crew.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color ?? "#888" }}
              />
              {c.name}
              {c.role && <span className="text-muted-foreground">· {c.role}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
      <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold text-foreground">No assignments yet</h3>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        You're all set up. When an admin assigns you to an event, it'll show up here.
      </p>
    </div>
  );
}
