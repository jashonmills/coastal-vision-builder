import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, Save, CalendarPlus, PackageCheck, CheckCircle2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { getJob, updateJob } from "@/lib/jobs.functions";
import { getPullList } from "@/lib/pull.functions";
import { getJobReconciliation, getJobPhotoSignedUrl } from "@/lib/returns.functions";
import { JobNotesList } from "@/components/JobNotesList";
import { CrewAssign } from "@/components/admin/CrewAssign";


import { StatusBadge } from "./admin.jobs";

const STATUSES = [
  "booked", "prep", "loaded", "en_route", "on_site", "event",
  "teardown", "picked_up", "returned", "reconciled", "closed", "cancelled",
] as const;

export const Route = createFileRoute("/admin/jobs_/$id")({
  head: () => ({ meta: [{ title: "Job | Admin" }, { name: "robots", content: "noindex" }] }),
  component: JobDetailPage,
});

type JobRow = {
  id: string;
  quote_id: string;
  customer_id: string | null;
  title: string | null;
  event_date: string | null;
  status: string;
  site_address: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  gate_code: string | null;
  parking_notes: string | null;
  access_notes: string | null;
  notes: string | null;
};

function JobDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const qc = useQueryClient();
  const getFn = useServerFn(getJob);
  const updateFn = useServerFn(updateJob);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-job", id],
    enabled: !!user && isAdmin,
    queryFn: () => getFn({ data: { id } }),
  });

  const [form, setForm] = useState<Partial<JobRow>>({});
  useEffect(() => {
    if (data?.job) {
      const j = data.job as JobRow;
      setForm({
        site_address: j.site_address ?? "",
        site_contact_name: j.site_contact_name ?? "",
        site_contact_phone: j.site_contact_phone ?? "",
        gate_code: j.gate_code ?? "",
        parking_notes: j.parking_notes ?? "",
        access_notes: j.access_notes ?? "",
        notes: j.notes ?? "",
      });
    }
  }, [data?.job]);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateFn({ data: { id, ...patch } as never }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-job", id] });
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rl || isLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  if (!isAdmin) return <AdminLayout><p className="p-8">Admin required.</p></AdminLayout>;
  if (!data?.job) return <AdminLayout><p className="p-8">Job not found.</p></AdminLayout>;

  const job = data.job as JobRow;
  const quote = data.quote as any;
  const customer = data.customer as any;
  const events = (data.events ?? []) as Array<any>;
  const crew = (data.crew ?? []) as Array<any>;
  const crewByEvent = new Map<string, typeof crew>();
  for (const c of crew) {
    const list = crewByEvent.get(c.event_id) ?? [];
    list.push(c);
    crewByEvent.set(c.event_id, list);
  }

  return (
    <AdminLayout>
      <Link to="/admin/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      <div className="mt-4">
        <AdminPageHeader
          eyebrow="Field Ops"
          title={job.title || "Job"}
          subtitle={`${customer?.name ?? quote?.customer_name ?? ""} · ${job.event_date ?? "no date"}`}
          actions={<StatusBadge status={job.status} />}
        />
      </div>

      {/* Status advance */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advance status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => save.mutate({ status: s })}
              disabled={save.isPending || s === job.status}
              className={`rounded-full border px-3 py-1 text-xs capitalize ${
                s === job.status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary"
              } disabled:opacity-60`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-serif text-lg text-primary">Site logistics</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Site address" value={form.site_address ?? ""} onChange={(v) => setForm((f) => ({ ...f, site_address: v }))} className="sm:col-span-2" />
            <Field label="Contact name" value={form.site_contact_name ?? ""} onChange={(v) => setForm((f) => ({ ...f, site_contact_name: v }))} />
            <Field label="Contact phone" value={form.site_contact_phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, site_contact_phone: v }))} />
            <Field label="Gate code" value={form.gate_code ?? ""} onChange={(v) => setForm((f) => ({ ...f, gate_code: v }))} />
            <TextArea label="Parking notes" value={form.parking_notes ?? ""} onChange={(v) => setForm((f) => ({ ...f, parking_notes: v }))} />
            <TextArea label="Access notes" value={form.access_notes ?? ""} onChange={(v) => setForm((f) => ({ ...f, access_notes: v }))} className="sm:col-span-2" />
            <TextArea label="Internal notes" value={form.notes ?? ""} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} className="sm:col-span-2" />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Save logistics
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked quote</p>
            {quote ? (
              <div className="space-y-1 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{quote.quote_number}</div>
                <div className="font-medium">{quote.customer_name}</div>
                <Link to="/admin/quotes/$id/edit" params={{ id: job.quote_id }} className="text-primary hover:underline">Open quote →</Link>
                <div className="pt-1"><Link to="/admin/quotes/$id/job-sheet" params={{ id: job.quote_id }} className="text-primary hover:underline">Job sheet →</Link></div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No quote.</p>}
          </div>

          {customer && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
              <Link to="/admin/customers/$id" params={{ id: customer.id }} className="font-medium text-primary hover:underline">
                {customer.name || customer.email}
              </Link>
              {customer.email && <div className="text-xs text-muted-foreground">{customer.email}</div>}
              {customer.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}
            </div>
          )}
        </aside>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-serif text-lg text-primary">Assigned crew</h3>
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Crew is assigned per calendar event. Schedule this job on the calendar first, then add crew.
            </p>
            <Link
              to="/admin/scheduler"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <CalendarPlus className="h-4 w-4" /> Schedule &amp; assign crew
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => {
              const list = crewByEvent.get(ev.id) ?? [];
              return (
                <div key={ev.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium capitalize">
                      {ev.event_type}: {new Date(ev.start_time).toLocaleString()}
                    </span>
                    {ev.location && <span className="text-muted-foreground">{ev.location}</span>}
                  </div>

                  <CrewAssign eventId={ev.id} />

                  {list.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Acknowledgment status
                      </p>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {list.map((c) => (
                          <li key={c.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? "#888" }} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{c.name}</div>
                                {c.role && <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{c.role}</div>}
                              </div>
                            </div>
                            <AckPill status={c.ack_status} reason={c.decline_reason} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-serif text-lg text-primary">Crew notes</h3>
        <JobNotesList jobId={job.id} />
      </section>
      <PullProgressSection jobId={job.id} />
    </AdminLayout>
  );
}

function PullProgressSection({ jobId }: { jobId: string }) {
  const fn = useServerFn(getPullList);
  const q = useQuery({
    queryKey: ["admin-pull-list", jobId],
    queryFn: () => fn({ data: { job_id: jobId } as never }),
  });
  if (q.isLoading) return null;
  const d = q.data as any;
  if (!d || !d.summary || d.summary.total === 0) {
    return (
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 font-serif text-lg text-primary">Pull progress</h3>
        <p className="text-sm text-muted-foreground">No physical items on this job's quote.</p>
      </section>
    );
  }
  const s = d.summary as { total: number; fully_pulled: number; total_required: number; total_pulled: number };
  const pct = s.total_required ? Math.round((s.total_pulled / s.total_required) * 100) : 0;
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-primary">Pull progress</h3>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {s.fully_pulled} / {s.total} lines · {s.total_pulled} / {s.total_required} units
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {(d.groups as Array<{ category: string; fully_pulled: number; total: number }>).map((g) => (
          <li key={g.category} className="flex items-center justify-between border-b border-border/40 py-1">
            <span className="text-foreground">{g.category}</span>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{g.fully_pulled} / {g.total}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}



function AckPill({ status, reason }: { status: string; reason: string | null }) {
  const map: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
    declined: "bg-rose-100 text-rose-800 border-rose-200",
    assigned: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status] ?? map.assigned}`}
      title={status === "declined" && reason ? reason : undefined}
    >
      {status}
    </span>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );
}
