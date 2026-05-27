import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { listMyRecommendations, deleteRecommendation } from "@/lib/saved-recommendations.functions";
import { FileText, Loader2, LogOut, Trash2 } from "lucide-react";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "My Account | Pacific North Events & Tents" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyRecommendations);
  const delFn = useServerFn(deleteRecommendation);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/account" } as never });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-recommendations"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-recommendations"] }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero eyebrow="My Account" title="Your Saved Event Plans" subtitle={`Signed in as ${user.email}`} />
      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        <div className="mb-6 flex justify-between">
          <Link to="/ai-tent-planner" className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
            + New Recommendation
          </Link>
          <button onClick={signOut} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-primary">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-serif text-xl text-primary">No saved plans yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Run the Event Recommender and save your first plan.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="min-w-0">
                  <Link to="/account/$id" params={{ id: r.id }} className="block font-serif text-lg text-primary hover:underline">{r.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.event_date ? new Date(r.event_date + "T00:00:00").toLocaleDateString() : "No date"}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/account/$id" params={{ id: r.id }} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70">View</Link>
                  <button onClick={() => { if (confirm("Delete this plan?")) del.mutate(r.id); }} className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteLayout>
  );
}
