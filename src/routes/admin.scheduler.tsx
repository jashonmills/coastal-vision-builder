import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, X, Check, Trash2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  listCalendarEvents,
  upsertCalendarEvent,
  deleteCalendarEvent,
  markEventComplete,
  EVENT_TYPES,
  EVENT_STATUSES,
  EVENT_COLORS,
} from "@/lib/scheduler.functions";
import { listEventStaffForEvents } from "@/lib/assignments.functions";
import { CrewAssign, StaffDots } from "@/components/admin/CrewAssign";
import { invalidateOpsQueries } from "@/lib/admin-cache";

export const Route = createFileRoute("/admin/scheduler")({
  head: () => ({ meta: [{ title: "Scheduler | Admin" }] }),
  component: SchedulerPage,
});

type ViewMode = "month" | "week" | "list";
type CalEvent = {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  status: string;
  location: string | null;
  notes: string | null;
  color: string | null;
  quote_id: string | null;
  quote_request_id: string | null;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  quote_request: "Quote Request",
  quote_follow_up: "Follow-up",
  quote_sent: "Quote Sent",
  rental_reserved: "Reserved Rental",
  delivery: "Delivery",
  pickup: "Pickup",
  check_out: "Check Out",
  check_in: "Check In",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  blocked_date: "Blocked",
  internal_note: "Note",
  venue_inquiry: "Beacon Inquiry",
  venue_hold: "Beacon Hold",
  venue_booked: "Beacon Booked",
  venue_setup: "Beacon Setup",
  venue_teardown: "Beacon Teardown",
};

const VENUE_TYPES = new Set(["venue_inquiry", "venue_hold", "venue_booked", "venue_setup", "venue_teardown"]);

function SchedulerPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return "list";
    return "month";
  });

  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [venueFilter, setVenueFilter] = useState<"all" | "rentals" | "beacon">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [editing, setEditing] = useState<Partial<CalEvent> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin/scheduler" } as never });
  }, [user, authLoading, navigate]);

  const range = useMemo(() => rangeForView(cursor, view), [cursor, view]);
  const listFn = useServerFn(listCalendarEvents);
  const upsertFn = useServerFn(upsertCalendarEvent);
  const deleteFn = useServerFn(deleteCalendarEvent);
  const completeFn = useServerFn(markEventComplete);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", range.from, range.to],
    queryFn: async () => (await listFn({ data: range })) as CalEvent[],
    enabled: !!user && isAdmin,
  });

  const filtered = events.filter((e) => {
    if (filterType !== "all" && e.event_type !== filterType) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (venueFilter === "beacon" && !VENUE_TYPES.has(e.event_type)) return false;
    if (venueFilter === "rentals" && VENUE_TYPES.has(e.event_type)) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const eventIds = useMemo(() => filtered.map((e) => e.id).sort(), [filtered]);
  const bulkFn = useServerFn(listEventStaffForEvents);
  const { data: crewRows = [] } = useQuery({
    queryKey: ["event-staff-bulk", eventIds.join(",")],
    queryFn: async () =>
      (await bulkFn({ data: { event_ids: eventIds } })) as Array<{
        event_id: string;
        staff_id: string;
        name: string;
        color: string | null;
        role: string | null;
      }>,
    enabled: !!user && isAdmin && eventIds.length > 0,
    staleTime: 30_000,
  });
  const crewByEvent = useMemo(() => {
    const m = new Map<string, Array<{ staff_id: string; name: string; color: string | null }>>();
    for (const r of crewRows) {
      const arr = m.get(r.event_id) ?? [];
      arr.push({ staff_id: r.staff_id, name: r.name, color: r.color });
      m.set(r.event_id, arr);
    }
    return m;
  }, [crewRows]);

  const upsert = useMutation({
    mutationFn: async (e: Partial<CalEvent>) => upsertFn({ data: e as never }),
    onSuccess: () => { invalidateOpsQueries(qc); setEditing(null); setSelected(null); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { invalidateOpsQueries(qc); setSelected(null); },
  });
  const complete = useMutation({
    mutationFn: async (id: string) => completeFn({ data: { id } }),
    onSuccess: () => invalidateOpsQueries(qc),
  });

  if (authLoading || roleLoading)
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  if (!user || !isAdmin)
    return <SiteLayout><div className="p-12 text-center text-muted-foreground">Admin access required.</div></SiteLayout>;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Scheduler" subtitle="Quote requests, rentals, deliveries, pickups, and tasks." />
      <section className="py-8">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setEditing({ event_type: "internal_note", status: "scheduled", start_time: new Date().toISOString() })}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> New Event
          </button>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={() => setCursor(new Date())} className="rounded border border-border bg-card px-3 py-1 text-sm">Today</button>
          <button onClick={() => setCursor(shift(cursor, view, -1))} className="rounded border border-border bg-card px-3 py-1 text-sm">‹</button>
          <button onClick={() => setCursor(shift(cursor, view, 1))} className="rounded border border-border bg-card px-3 py-1 text-sm">›</button>
          <span className="ml-2 font-medium">{labelForView(cursor, view)}</span>
          <div className="ml-auto flex gap-2">
            {(["month", "week", "list"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs ${view === v ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>{v}</button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", "rentals", "beacon"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVenueFilter(v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                venueFilter === v
                  ? v === "beacon"
                    ? "border-transparent bg-[#7c5cff] text-white"
                    : "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {v === "beacon" ? "Beacon" : v}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded border px-2 py-1 text-sm">
            <option value="all">All types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border px-2 py-1 text-sm">
            <option value="all">All statuses</option>
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded border px-3 py-1 text-sm" />
        </div>

        {/* Views */}
        {view === "month" && <MonthGrid cursor={cursor} events={filtered} crewByEvent={crewByEvent} onSelect={(e) => setSelected(e)} />}
        {view === "week" && <WeekList cursor={cursor} events={filtered} crewByEvent={crewByEvent} onSelect={(e) => setSelected(e)} />}
        {view === "list" && <AgendaList events={filtered} crewByEvent={crewByEvent} onSelect={(e) => setSelected(e)} />}
      </section>

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h3 className="font-serif text-2xl text-primary">{selected.title}</h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: selected.color ?? EVENT_COLORS[selected.event_type] }} />
            {EVENT_TYPE_LABELS[selected.event_type]} · {selected.status}
          </div>
          {VENUE_TYPES.has(selected.event_type) && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#7c5cff]/10 px-2 py-1 text-xs font-medium text-[#5b3fdc]">
              Venue: Beacon on Broadway · 735 Broadway, Seaside, OR
            </p>
          )}
          <p className="mt-3 text-sm"><strong>When:</strong> {new Date(selected.start_time).toLocaleString()}</p>
          {selected.location && <p className="text-sm"><strong>Where:</strong> {selected.location}</p>}
          {selected.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{selected.notes}</p>}

          <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned crew</div>
            <CrewAssign eventId={selected.id} compact />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selected.quote_request_id && <Link to="/admin/quote-requests/$id" params={{ id: selected.quote_request_id }} className="rounded-full border border-border bg-card px-3 py-1 text-xs">View Request</Link>}
            {selected.quote_id && <Link to="/admin/quotes/$id/edit" params={{ id: selected.quote_id }} className="rounded-full border border-border bg-card px-3 py-1 text-xs">View Quote</Link>}
            <button onClick={() => complete.mutate(selected.id)} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"><Check className="h-3 w-3" /> Mark Complete</button>
            <button onClick={() => setEditing(selected)} className="rounded-full border border-border bg-card px-3 py-1 text-xs">Edit</button>
            <button onClick={() => { if (confirm("Delete this event?")) del.mutate(selected.id); }} className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs text-white"><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
        </Modal>
      )}

      {/* Edit / create modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <EventForm value={editing} onCancel={() => setEditing(null)} onSave={(v) => upsert.mutate(v)} saving={upsert.isPending} />
        </Modal>
      )}
    </SiteLayout>
  );
}

function rangeForView(cursor: Date, view: ViewMode) {
  const d = new Date(cursor);
  if (view === "month") {
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    // pad to include leading/trailing days
    from.setDate(from.getDate() - 7);
    to.setDate(to.getDate() + 7);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (view === "week") {
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const from = new Date(d); from.setDate(d.getDate() - 30);
  const to = new Date(d); to.setDate(d.getDate() + 60);
  return { from: from.toISOString(), to: to.toISOString() };
}

function shift(d: Date, view: ViewMode, dir: 1 | -1) {
  const n = new Date(d);
  if (view === "month") n.setMonth(n.getMonth() + dir);
  else if (view === "week") n.setDate(n.getDate() + 7 * dir);
  else n.setDate(n.getDate() + 14 * dir);
  return n;
}

function labelForView(d: Date, view: ViewMode) {
  if (view === "month") return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (view === "week") return `Week of ${new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()).toLocaleDateString()}`;
  return "Upcoming";
}

type CrewMap = Map<string, Array<{ staff_id: string; name: string; color: string | null }>>;

function MonthGrid({ cursor, events, crewByEvent, onSelect }: { cursor: Date; events: CalEvent[]; crewByEvent: CrewMap; onSelect: (e: CalEvent) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
  while (cells.length % 7) cells.push({ date: null });

  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const k = new Date(e.start_time).toDateString();
    const arr = byDay.get(k) ?? []; arr.push(e); byDay.set(k, arr);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 bg-secondary/50 text-center text-xs font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          const evs = c.date ? byDay.get(c.date.toDateString()) ?? [] : [];
          const isToday = c.date?.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={`min-h-[100px] border-b border-r border-border p-1 ${isToday ? "bg-primary/5" : ""}`}>
              {c.date && <div className="mb-1 text-xs font-medium">{c.date.getDate()}</div>}
              <div className="space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <button key={e.id} onClick={() => onSelect(e)} className="flex w-full items-center justify-between gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] text-white" style={{ background: e.color ?? EVENT_COLORS[e.event_type] }}>
                    <span className="truncate">{e.title}</span>
                    <StaffDots entries={crewByEvent.get(e.id) ?? []} max={3} />
                  </button>
                ))}
                {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekList({ cursor, events, crewByEvent, onSelect }: { cursor: Date; events: CalEvent[]; crewByEvent: CrewMap; onSelect: (e: CalEvent) => void }) {
  const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div className="space-y-3">
      {days.map((d) => {
        const evs = events.filter((e) => new Date(e.start_time).toDateString() === d.toDateString());
        return (
          <div key={d.toISOString()} className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-sm font-medium">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
            {evs.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">No events</p> : (
              <div className="divide-y divide-border">{evs.map((e) => <EventRow key={e.id} e={e} crew={crewByEvent.get(e.id) ?? []} onSelect={onSelect} />)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgendaList({ events, crewByEvent, onSelect }: { events: CalEvent[]; crewByEvent: CrewMap; onSelect: (e: CalEvent) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {events.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No upcoming events.</p> : (
        <div className="divide-y divide-border">{events.map((e) => <EventRow key={e.id} e={e} crew={crewByEvent.get(e.id) ?? []} onSelect={onSelect} />)}</div>
      )}
    </div>
  );
}

function EventRow({ e, crew, onSelect }: { e: CalEvent; crew: Array<{ staff_id: string; name: string; color: string | null }>; onSelect: (e: CalEvent) => void }) {
  return (
    <button onClick={() => onSelect(e)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/40">
      <span className="h-3 w-3 flex-none rounded-full" style={{ background: e.color ?? EVENT_COLORS[e.event_type] }} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{e.title}</p>
        <p className="text-xs text-muted-foreground">{new Date(e.start_time).toLocaleString()} · {EVENT_TYPE_LABELS[e.event_type]} · {e.status}</p>
        {e.location && <p className="truncate text-xs text-muted-foreground">{e.location}</p>}
      </div>
      <StaffDots entries={crew} max={5} />
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        {children}
      </div>
    </div>
  );
}

function EventForm({ value, onCancel, onSave, saving }: { value: Partial<CalEvent>; onCancel: () => void; onSave: (v: Partial<CalEvent>) => void; saving: boolean }) {
  const [v, setV] = useState<Partial<CalEvent>>(value);
  const startLocal = v.start_time ? new Date(v.start_time).toISOString().slice(0, 16) : "";
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-xl text-primary">{value.id ? "Edit Event" : "New Event"}</h3>
      <label className="block text-sm">Title<input value={v.title ?? ""} onChange={(e) => setV({ ...v, title: e.target.value })} className="mt-1 w-full rounded border px-2 py-1" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">Type
          <select value={v.event_type ?? "internal_note"} onChange={(e) => setV({ ...v, event_type: e.target.value })} className="mt-1 w-full rounded border px-2 py-1">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="block text-sm">Status
          <select value={v.status ?? "scheduled"} onChange={(e) => setV({ ...v, status: e.target.value })} className="mt-1 w-full rounded border px-2 py-1">
            {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">Start
        <input type="datetime-local" value={startLocal} onChange={(e) => setV({ ...v, start_time: new Date(e.target.value).toISOString() })} className="mt-1 w-full rounded border px-2 py-1" />
      </label>
      <label className="block text-sm">Location<input value={v.location ?? ""} onChange={(e) => setV({ ...v, location: e.target.value })} className="mt-1 w-full rounded border px-2 py-1" /></label>
      <label className="block text-sm">Notes<textarea value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} rows={3} className="mt-1 w-full rounded border px-2 py-1" /></label>

      {value.id ? (
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned crew</div>
          <CrewAssign eventId={value.id} compact />
          <p className="mt-2 text-[10px] text-muted-foreground">Crew changes save immediately — the Save button below only saves the event details.</p>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">Save the event first, then assign crew.</p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full border border-border px-4 py-1 text-sm">Cancel</button>
        <button disabled={saving || !v.title || !v.event_type || !v.start_time} onClick={() => onSave(v)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}
