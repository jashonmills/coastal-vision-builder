import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, Save, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  listStaff,
  upsertStaff,
  deleteStaff,
  inviteStaffUser,
  ALLOWED_STAFF_ROLES,
  type StaffRole,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "Staff | Admin" }] }),
  component: StaffPage,
});

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  roles: string[] | null;
  color: string | null;
  notes: string | null;
  active: boolean;
  user_id: string | null;
};

function StaffPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const qc = useQueryClient();
  const listFn = useServerFn(listStaff);
  const upFn = useServerFn(upsertStaff);
  const delFn = useServerFn(deleteStaff);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => (await listFn()) as unknown as StaffRow[],
    enabled: !!user && isAdmin,
  });

  const save = useMutation({
    mutationFn: (s: Partial<StaffRow> & { roles?: string[] }) => upFn({ data: s as never }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-staff"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-staff"] }),
  });

  if (loading || rl || isLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user || !isAdmin) {
    return <SiteLayout><div className="p-12 text-center">Admin access required. <Link to="/admin" className="text-primary underline">Go to admin</Link></div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <AdminPageHeader eyebrow="Team" title="Staff" subtitle="Team members assignable to calendar events and job sheets." />
      <section className="mx-auto max-w-6xl">
        <NewStaffForm saving={save.isPending} onCreate={(s) => save.mutate(s)} />

        {data.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
            No staff yet. Add your first team member above.
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {data.map((s) => (
              <StaffCard
                key={s.id}
                staff={s}
                onSave={(p) => save.mutate(p)}
                onDelete={() => { if (confirm("Delete staff?")) del.mutate(s.id); }}
              />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function NewStaffForm({ onCreate, saving }: { onCreate: (s: Partial<StaffRow> & { roles?: string[] }) => void; saving: boolean }) {
  const [name, setName] = useState("");
  const submit = () => {
    if (!name.trim() || saving) return;
    onCreate({ name: name.trim(), active: true, roles: [] });
    setName("");
  };
  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Full name"
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim() || saving}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {saving ? "Adding…" : "Add staff"}
      </button>
    </div>
  );
}

function StaffCard({
  staff,
  onSave,
  onDelete,
}: {
  staff: StaffRow;
  onSave: (p: Partial<StaffRow> & { roles?: string[] }) => void;
  onDelete: () => void;
}) {
  const [d, setD] = useState<StaffRow>(staff);
  const dirty = JSON.stringify(d) !== JSON.stringify(staff);
  const rolesArr = (d.roles && d.roles.length ? d.roles : []) as string[];
  const legacyRole = d.role && rolesArr.length === 0 ? d.role : null;

  const toggleRole = (r: StaffRole) => {
    const has = rolesArr.includes(r);
    const next = has ? rolesArr.filter((x) => x !== r) : [...rolesArr, r];
    setD({ ...d, roles: next });
  };

  const save = () =>
    onSave({
      id: d.id,
      name: d.name,
      role: d.role,
      email: d.email,
      phone: d.phone,
      color: d.color,
      active: d.active,
      notes: d.notes,
      roles: rolesArr,
    });

  const inviteFn = useServerFn(inviteStaffUser);
  const qc = useQueryClient();
  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { staff_id: d.id, email: d.email ?? "" } }),
    onSuccess: (res: { invited: boolean }) => {
      toast.success(res.invited ? "Invitation sent" : "Existing account linked");
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <input type="color" value={d.color ?? "#888888"} onChange={(e) => setD({ ...d, color: e.target.value })} className="h-10 w-10 shrink-0 rounded-full border border-border bg-background" aria-label="Color" />
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Full name" className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 text-sm font-medium" />
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            d.user_id
              ? "bg-emerald-600/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-700"
          }`}
          title={d.user_id ? "Linked to a login account" : "No login yet"}
        >
          {d.user_id ? <><CheckCircle2 className="h-3 w-3" /> Login linked</> : "No login"}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input type="email" inputMode="email" value={d.email ?? ""} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="name@example.com" className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
          <input type="tel" inputMode="tel" value={d.phone ?? ""} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="(555) 123-4567" className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Roles</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {ALLOWED_STAFF_ROLES.map((r) => {
            const on = rolesArr.includes(r);
            return (
              <button
                type="button"
                key={r}
                onClick={() => toggleRole(r)}
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        {legacyRole && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Legacy role: <span className="italic">{legacyRole}</span> — pick above to convert.
          </p>
        )}
      </div>

      <div className="mt-3">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
        <textarea value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value })} rows={2} className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="h-4 w-4" />
          Active
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => invite.mutate()}
            disabled={invite.isPending || !d.email}
            title={!d.email ? "Add an email to invite" : d.user_id ? "Re-invite / relink" : "Send login invite"}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-40"
          >
            {invite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {d.user_id ? "Re-invite" : "Invite to log in"}
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-red-600/30 px-3 py-2 text-xs font-semibold text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button disabled={!dirty} onClick={save} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
