import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import {
  getMyProfile,
  updateMyProfile,
  updateMyAdminProfile,
} from "@/lib/profile.functions";
import { Loader2, ShieldCheck, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile | Pacific North Rentals" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getMyProfile);
  const saveFn = useServerFn(updateMyProfile);
  const saveAdminFn = useServerFn(updateMyAdminProfile);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/profile" } as never });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getFn(),
    enabled: !!user,
  });

  const [form, setForm] = useState({ display_name: "", phone: "", company: "" });
  const [adminForm, setAdminForm] = useState({ internal_title: "", admin_notes: "" });
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        display_name: data.display_name ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
      });
      setAdminForm({
        internal_title: data.internal_title ?? "",
        admin_notes: data.admin_notes ?? "",
      });
    }
  }, [data]);

  const saveBase = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  const saveAdmin = useMutation({
    mutationFn: () => saveAdminFn({ data: adminForm }),
    onSuccess: () => {
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  if (loading || !user || isLoading || !data) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  const input =
    "w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <SiteLayout>
      <PageHero
        eyebrow="My Profile"
        title="Your Account Details"
        subtitle={user.email ?? ""}
      />
      <section className="mx-auto max-w-2xl px-4 py-12 lg:px-8">
        {data.is_admin && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-amber-900">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" /> Admin account
            </span>
            <Link
              to="/admin"
              className="rounded-full bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-50 hover:opacity-90"
            >
              Open Admin
            </Link>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveBase.mutate();
          }}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-serif text-xl text-primary">Contact Info</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Display name</label>
            <input
              className={input}
              maxLength={120}
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                className={input}
                maxLength={40}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company</label>
              <input
                className={input}
                maxLength={160}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>
          {saveBase.error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(saveBase.error as Error).message}
            </p>
          )}
          <button
            type="submit"
            disabled={saveBase.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
          >
            {saveBase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
          {savedAt && !saveBase.isPending && (
            <span className="ml-3 inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </form>

        {data.is_admin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveAdmin.mutate();
            }}
            className="mt-6 space-y-5 rounded-2xl border border-amber-500/40 bg-card p-6 shadow-sm"
          >
            <h2 className="inline-flex items-center gap-2 font-serif text-xl text-primary">
              <ShieldCheck className="h-5 w-5 text-amber-600" /> Admin-only Fields
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium">Internal title / role</label>
              <input
                className={input}
                maxLength={120}
                value={adminForm.internal_title}
                onChange={(e) => setAdminForm({ ...adminForm, internal_title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Admin notes</label>
              <textarea
                className={input + " min-h-[120px]"}
                maxLength={2000}
                value={adminForm.admin_notes}
                onChange={(e) => setAdminForm({ ...adminForm, admin_notes: e.target.value })}
              />
            </div>
            {saveAdmin.error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {(saveAdmin.error as Error).message}
              </p>
            )}
            <button
              type="submit"
              disabled={saveAdmin.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
            >
              {saveAdmin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save admin fields
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm">
          <Link to="/account" className="text-muted-foreground hover:text-primary">
            ← Back to my account
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
