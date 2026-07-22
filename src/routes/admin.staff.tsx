import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AdminTabs } from "./admin.quote-requests";
import { listStaff, upsertStaff, deleteStaff } from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "Staff | Admin" }] }),
  component: StaffPage,
});

function StaffPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const qc = useQueryClient();
  const listFn = useServerFn(listStaff);
  const upFn = useServerFn(upsertStaff);
  const delFn = useServerFn(deleteStaff);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => listFn(),
    enabled: !!user && isAdmin,
  });

  const save = useMutation({
    mutationFn: (s: any) => upFn({ data: s }),
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
      <section className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <AdminTabs active="staff" />
        <h1 className="font-serif text-3xl text-primary">Staff</h1>
        <p className="text-sm text-muted-foreground">Team members assignable to calendar events and job sheets.</p>

        <NewStaffForm
          saving={save.isPending}
          onCreate={(s) => save.mutate(s)}
        />

        {data.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
            No staff yet. Add your first team member above.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="mt-6 grid gap-3 md:hidden">
              {data.map((s: any) => (
                <StaffCard key={s.id} staff={s} onSave={(p) => save.mutate(p)} onDelete={() => { if (confirm("Delete staff?")) del.mutate(s.id); }} />
              ))}
            </div>
            {/* Desktop table */}
            <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2 w-20">Color</th>
                    <th className="px-3 py-2 w-20">Active</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s: any) => (
                    <StaffRow key={s.id} staff={s} onSave={(p) => save.mutate(p)} onDelete={() => { if (confirm("Delete staff?")) del.mutate(s.id); }} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function NewStaffForm({ onCreate, saving }: { onCreate: (s: any) => void; saving: boolean }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const submit = () => {
    if (!name.trim() || saving) return;
    onCreate({ name: name.trim(), role: role.trim() || null, active: true });
    setName("");
    setRole("");
  };
  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_auto]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Full name"
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Role (e.g. Driver, Setup)"
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

function StaffRow({ staff, onSave, onDelete }: { staff: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [d, setD] = useState(staff);
  const dirty = JSON.stringify(d) !== JSON.stringify(staff);
  return (
    <tr className="border-t border-border align-middle">
      <td className="px-3 py-2"><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><input value={d.role ?? ""} onChange={(e) => setD({ ...d, role: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><input value={d.email ?? ""} onChange={(e) => setD({ ...d, email: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><input value={d.phone ?? ""} onChange={(e) => setD({ ...d, phone: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-sm" /></td>
      <td className="px-3 py-2"><input type="color" value={d.color ?? "#888888"} onChange={(e) => setD({ ...d, color: e.target.value })} className="h-8 w-12 rounded border border-border bg-background" /></td>
      <td className="px-3 py-2"><input type="checkbox" checked={!!d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button disabled={!dirty} onClick={() => onSave({ id: d.id, name: d.name, role: d.role, email: d.email, phone: d.phone, color: d.color, active: d.active })} className="rounded bg-emerald-600 p-1 text-white disabled:opacity-30"><Save className="h-3 w-3" /></button>
          <button onClick={onDelete} className="rounded bg-red-600 p-1 text-white"><Trash2 className="h-3 w-3" /></button>
        </div>
      </td>
    </tr>
  );
}

function StaffCard({ staff, onSave, onDelete }: { staff: any; onSave: (p: any) => void; onDelete: () => void }) {
  const [d, setD] = useState(staff);
  const dirty = JSON.stringify(d) !== JSON.stringify(staff);
  const save = () => onSave({ id: d.id, name: d.name, role: d.role, email: d.email, phone: d.phone, color: d.color, active: d.active });
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <input type="color" value={d.color ?? "#888888"} onChange={(e) => setD({ ...d, color: e.target.value })} className="h-10 w-10 shrink-0 rounded-full border border-border bg-background" aria-label="Color" />
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Full name" className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 text-sm font-medium" />
      </div>
      <div className="mt-3 grid gap-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">Role</label>
        <input value={d.role ?? ""} onChange={(e) => setD({ ...d, role: e.target.value })} placeholder="Driver, Setup, etc." className="rounded border border-border bg-background px-3 py-2 text-sm" />
        <label className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Email</label>
        <input type="email" inputMode="email" value={d.email ?? ""} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="name@example.com" className="rounded border border-border bg-background px-3 py-2 text-sm" />
        <label className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Phone</label>
        <input type="tel" inputMode="tel" value={d.phone ?? ""} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="(555) 123-4567" className="rounded border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="h-4 w-4" />
          Active
        </label>
        <div className="flex gap-2">
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
