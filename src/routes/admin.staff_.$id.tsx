import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Loader2, Mail, Phone, Save, Trash2, CheckCircle2,
  CalendarDays, Clock, DollarSign, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  getStaffProfile, upsertStaff, deleteStaff, inviteStaffUser,
  ALLOWED_STAFF_ROLES, type StaffRole,
} from "@/lib/staff.functions";
import { listTimeEntries } from "@/lib/time.functions";
import { listExpenses } from "@/lib/expenses.functions";

export const Route = createFileRoute("/admin/staff_/$id")({
  head: () => ({ meta: [{ title: "Staff profile | Admin" }, { name: "robots", content: "noindex" }] }),
  component: StaffProfilePage,
});

function fmtHours(seconds: number) { return `${(seconds / 3600).toFixed(2)}h`; }
function fmt$(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StaffProfilePage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const qc = useQueryClient();

  const getFn = useServerFn(getStaffProfile);
  const upFn = useServerFn(upsertStaff);
  const delFn = useServerFn(deleteStaff);
  const inviteFn = useServerFn(inviteStaffUser);
  const timeFn = useServerFn(listTimeEntries);
  const expFn = useServerFn(listExpenses);

  const enabled = !!user && isAdmin;
  const q = useQuery({
    queryKey: ["admin-staff-profile", id],
    queryFn: () => getFn({ data: { id } }),
    enabled,
  });

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, []);

  const timeQ = useQuery({
    queryKey: ["admin-staff-time", id, range.start_date],
    queryFn: () => timeFn({ data: { staff_id: id, start_date: range.start_date, end_date: range.end_date } as never }),
    enabled,
  });
  const expRange = useMemo(() => {
    const end = new Date();
    const start = new Date(); start.setDate(start.getDate() - 30);
    return { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) };
  }, []);
  const expQ = useQuery({
    queryKey: ["admin-staff-exp", id, expRange.start_date],
    queryFn: () => expFn({ data: { staff_id: id, ...expRange } as never }),
    enabled,
  });

  const staff = q.data?.staff as any;
  const [d, setD] = useState<any>(null);
  useEffect(() => { if (staff) setD({ ...staff, roles: staff.roles ?? [] }); }, [staff]);

  const dirty = d && staff && JSON.stringify(d) !== JSON.stringify({ ...staff, roles: staff.roles ?? [] });

  const save = useMutation({
    mutationFn: () => upFn({ data: {
      id: d.id, name: d.name, email: d.email, phone: d.phone, color: d.color,
      notes: d.notes, active: d.active, roles: d.roles,
    } as never }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-staff-profile", id] }); qc.invalidateQueries({ queryKey: ["admin-staff"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); window.location.href = "/admin/staff"; },
    onError: (e: Error) => toast.error(e.message),
  });

  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { staff_id: id, email: (d?.email ?? "").trim() } }),
    onSuccess: (res: { invited: boolean }) => {
      toast.success(res.invited ? "Invitation sent" : "Existing account linked");
      qc.invalidateQueries({ queryKey: ["admin-staff-profile", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rl || q.isLoading || !d) {
    return <AdminLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!user || !isAdmin) {
    return <AdminLayout><div className="p-12 text-center">Admin access required.</div></AdminLayout>;
  }

  const toggleRole = (r: StaffRole) => {
    const has = (d.roles ?? []).includes(r);
    setD({ ...d, roles: has ? d.roles.filter((x: string) => x !== r) : [...(d.roles ?? []), r] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link to="/admin/staff" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to staff
        </Link>

        <AdminPageHeader
          eyebrow="Team"
          title={d.name || "Staff"}
          subtitle={(d.roles ?? []).join(" · ") || "No roles set"}
        />

        {/* Header card */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="inline-block h-10 w-10 shrink-0 rounded-full border border-border" style={{ background: d.color ?? "#888" }} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-xl text-foreground">{d.name}</h2>
            <p className="text-xs text-muted-foreground">
              {d.active ? "Active" : "Inactive"} · {(d.roles ?? []).length ? d.roles.join(", ") : "no roles"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              d.user_id ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
            }`}
          >
            {d.user_id ? (<><CheckCircle2 className="h-3 w-3" /> Login linked</>) : "No login"}
          </span>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left column: rollups */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {d.email ? <a className="truncate text-primary hover:underline" href={`mailto:${d.email}`}>{d.email}</a> : <span className="text-muted-foreground">No email</span>}
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {d.phone ? <a className="text-primary hover:underline" href={`tel:${d.phone}`}>{d.phone}</a> : <span className="text-muted-foreground">No phone</span>}
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Kpi icon={Clock} label="This week" value={fmtHours(q.data?.week_seconds ?? 0)} />
              <Kpi icon={Clock} label="30 days" value={fmtHours(q.data?.period_seconds ?? 0)} />
              <Kpi icon={DollarSign} label="Exp 30d" value={fmt$(q.data?.expense_period_cents ?? 0)} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming jobs</p>
              </div>
              {(q.data?.upcoming_jobs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing on the calendar.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(q.data?.upcoming_jobs ?? []).map((j: any, i: number) => (
                    <li key={i} className="rounded-lg border border-border/60 bg-background p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-foreground">
                          {j.job ? (
                            <Link to="/admin/jobs/$id" params={{ id: j.job.id }} className="hover:underline">
                              {j.job.title || j.event_title || "Job"}
                            </Link>
                          ) : (j.event_title || "Event")}
                        </p>
                        <span className="shrink-0 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{j.role || "crew"}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        <CalendarDays className="mr-1 inline h-3 w-3" />
                        {new Date(j.start_at).toLocaleDateString()} {j.ack_at ? "· acknowledged" : "· awaiting ack"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: editable + activity */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input value={d.name ?? ""} onChange={(e) => setD({ ...d, name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Color">
                  <input type="color" value={d.color ?? "#888888"} onChange={(e) => setD({ ...d, color: e.target.value })} className="h-10 w-full rounded border border-border bg-background" />
                </Field>
                <Field label="Email">
                  <input type="email" value={d.email ?? ""} onChange={(e) => setD({ ...d, email: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={d.phone ?? ""} onChange={(e) => setD({ ...d, phone: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Roles" className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {ALLOWED_STAFF_ROLES.map((r) => {
                    const on = (d.roles ?? []).includes(r);
                    return (
                      <button key={r} type="button" onClick={() => toggleRole(r)}
                        className={`rounded-full border px-3 py-1 text-xs capitalize ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                      >{r}</button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Notes" className="mt-3">
                <textarea rows={3} value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value })} className={inputCls} />
              </Field>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="h-4 w-4" />
                  Active
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button" onClick={() => invite.mutate()} disabled={invite.isPending || !d.email}
                    title={!d.email ? "Add an email to invite" : d.user_id ? "Re-invite / relink" : "Send login invite"}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
                  >
                    {invite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    {d.user_id ? "Re-invite" : "Invite to log in"}
                  </button>
                  <button onClick={() => { if (confirm("Delete this staff member?")) del.mutate(); }} className="inline-flex items-center gap-1 rounded-full border border-red-600/30 px-3 py-2 text-xs font-semibold text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                    {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent hours (30d)</p>
                </div>
                <Link to="/admin/timesheets" className="text-xs text-primary hover:underline">Open timesheets</Link>
              </div>
              {timeQ.isLoading ? <Loader2 className="mx-auto my-4 h-4 w-4 animate-spin text-primary" /> :
                (timeQ.data?.entries ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No entries.</p> : (
                  <ul className="divide-y divide-border text-sm">
                    {(timeQ.data?.entries ?? []).slice(0, 10).map((e: any) => (
                      <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-2">
                        <div className="min-w-0">
                          <p className="truncate">{e.jobs?.title ?? e.task_label ?? <span className="capitalize text-muted-foreground">{e.category}</span>}</p>
                          <p className="text-[11px] text-muted-foreground">{fmtDate(e.clock_in)} → {e.clock_out ? fmtDate(e.clock_out) : "open"}</p>
                        </div>
                        <p className="shrink-0 self-center font-semibold">{e.duration_seconds != null ? fmtHours(e.duration_seconds) : "—"}</p>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent expenses (30d)</p>
                </div>
                <Link to="/admin/expenses" className="text-xs text-primary hover:underline">Open expenses</Link>
              </div>
              {expQ.isLoading ? <Loader2 className="mx-auto my-4 h-4 w-4 animate-spin text-primary" /> :
                (expQ.data?.expenses ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No expenses.</p> : (
                  <ul className="divide-y divide-border text-sm">
                    {(expQ.data?.expenses ?? []).slice(0, 10).map((e: any) => (
                      <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-2">
                        <div className="min-w-0">
                          <p className="truncate capitalize">{e.category}{e.note ? ` · ${e.note}` : ""}</p>
                          <p className="text-[11px] text-muted-foreground">{e.incurred_on}{e.jobs?.title ? ` · ${e.jobs.title}` : ""}</p>
                        </div>
                        <p className="shrink-0 self-center font-semibold">{fmt$(e.amount_cents)}</p>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

const inputCls = "w-full rounded border border-border bg-background px-3 py-2 text-sm";
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Kpi({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
