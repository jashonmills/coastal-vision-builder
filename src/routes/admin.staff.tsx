import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { listStaff, upsertStaff } from "@/lib/staff.functions";
import { HelpTip } from "@/components/HelpTip";

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

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async () => (await listFn()) as unknown as StaffRow[],
    enabled: !!user && isAdmin,
  });

  const save = useMutation({
    mutationFn: (s: Partial<StaffRow> & { roles?: string[] }) => upFn({ data: s as never }),
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({ queryKey: ["admin-staff"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rl || isLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user || !isAdmin) {
    return <SiteLayout><div className="p-12 text-center">Admin access required. <Link to="/admin" className="text-primary underline">Go to admin</Link></div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <AdminPageHeader eyebrow="Team" title="Staff" subtitle="Click any card to open a full profile." />
      <section>
        <HelpTip hintKey="admin-staff-intro" className="mb-4">
          Tap a staff member to open their profile. Use "Invite to log in" on the profile to give them app access.
        </HelpTip>
        <NewStaffForm saving={save.isPending} onCreate={(s) => save.mutate(s)} />

        {data.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
            No staff yet. Add your first team member above.
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {data.map((s) => <StaffLinkCard key={s.id} staff={s} />)}
          </ul>
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
    <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Full name"
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      />
      <button
        type="button" onClick={submit} disabled={!name.trim() || saving}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {saving ? "Adding…" : "Add staff"}
      </button>
    </div>
  );
}

function StaffLinkCard({ staff }: { staff: StaffRow }) {
  const roles = staff.roles && staff.roles.length ? staff.roles : (staff.role ? [staff.role] : []);
  return (
    <li>
      <Link
        to="/admin/staff_/$id"
        params={{ id: staff.id }}
        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40"
      >
        <span className="inline-block h-10 w-10 shrink-0 rounded-full border border-border" style={{ background: staff.color ?? "#888" }} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">{staff.name}</p>
            {!staff.active && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">Inactive</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {roles.length ? roles.join(", ") : "No roles"}
            {staff.email ? ` · ${staff.email}` : ""}
          </p>
          <p className="mt-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                staff.user_id ? "bg-emerald-600/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
              }`}
            >
              {staff.user_id ? (<><CheckCircle2 className="h-3 w-3" /> Login linked</>) : "No login"}
            </span>
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
