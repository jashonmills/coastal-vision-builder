import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { AdminTabs } from "./admin.quote-requests";
import { listAdmins, inviteAdmin, removeAdmin } from "@/lib/admins.functions";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({ meta: [{ title: "Admins | Admin" }] }),
  component: AdminsPage,
});

function AdminsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listFn = useServerFn(listAdmins);
  const inviteFn = useServerFn(inviteAdmin);
  const removeFn = useServerFn(removeAdmin);

  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin/admins" } as never });
  }, [user, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => listFn(),
    enabled: !!user && isAdmin,
  });

  const invite = useMutation({
    mutationFn: (e: string) => inviteFn({ data: { email: e } }),
    onSuccess: (r) => {
      toast.success(r.invited ? "Invitation email sent. They'll get admin access after signing in." : "Admin role granted.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Admin removed");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || roleLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user || !isAdmin) return null;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Admins" subtitle="Invite or remove users with admin access." />
      <section className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <AdminTabs active="admins" />

        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <UserPlus className="h-4 w-4" /> Invite a new admin
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const v = email.trim();
              if (!v) return;
              invite.mutate(v);
            }}
          >
            <input
              type="email"
              required
              placeholder="person@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={invite.isPending || !email.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Send invite
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            If they already have an account, admin access is granted immediately. Otherwise an invitation email is sent.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">
            Current admins {data ? `(${data.length})` : ""}
          </div>
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>
          ) : !data || data.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No admins yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((a) => {
                const active = a.is_self || a.active;
                return (
                <li key={a.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck
                      className={`h-5 w-5 ${active ? "text-green-600" : "text-amber-500"}`}
                      aria-label={active ? "Invite accepted" : "Awaiting sign-in"}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {a.display_name || a.email || a.user_id}
                        {a.is_self && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">You</span>}
                      </p>
                      {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={
                        active
                          ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }
                      title={active ? "Invite accepted" : "Awaiting sign-in"}
                    >
                      {active ? "Active" : "Pending invite"}
                    </span>
                    <button
                      disabled={a.is_self || remove.isPending}
                      onClick={() => { if (confirm(`Remove admin access for ${a.email || a.user_id}?`)) remove.mutate(a.user_id); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </li>
                );
              })}

            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
