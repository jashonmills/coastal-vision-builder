import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyRecommendations,
  deleteRecommendation,
  getRecommendation,
  MAX_ACTIVE_PLANS,
} from "@/lib/saved-recommendations.functions";
import { FileText, Loader2, LogOut, Send, Trash2 } from "lucide-react";
import { RequestQuoteModal, StatusBadge, type PlanStatus } from "@/components/RequestQuoteModal";
import type { AIRecommendation } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";

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
  const getFn = useServerFn(getRecommendation);
  const [quoteFor, setQuoteFor] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/account" } as never });
  }, [user, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-recommendations"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const quoteRec = useQuery({
    queryKey: ["saved-rec", quoteFor],
    queryFn: () => getFn({ data: { id: quoteFor! } }),
    enabled: !!quoteFor,
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

  const atCap = (data?.length ?? 0) >= MAX_ACTIVE_PLANS;

  return (
    <SiteLayout>
      <PageHero eyebrow="My Account" title="Your Saved Event Plans" subtitle={`Signed in as ${user.email}`} />
      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {atCap ? (
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center rounded-full bg-muted px-5 py-2 text-sm font-semibold text-muted-foreground"
              >
                + New Recommendation
              </button>
            ) : (
              <Link to="/ai-tent-planner" className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
                + New Recommendation
              </Link>
            )}
            {atCap && (
              <p className="mt-2 text-xs text-muted-foreground">
                You've reached your {MAX_ACTIVE_PLANS}-plan limit. Delete an old plan to create a new one.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-primary">
              Edit profile
            </Link>
            <button onClick={signOut} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-primary">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-serif text-xl text-primary">You don't have any saved event plans yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Start the AI Tent Planner to create your first setup, then request a quote when you're ready.</p>
            <Link to="/ai-tent-planner" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
              Start AI Tent Planner
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => {
              const requested = r.status === "quote_requested" || r.status === "quote_sent" || r.status === "booked" || !!r.quote_requested_at;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to="/account/$id" params={{ id: r.id }} className="font-serif text-lg text-primary hover:underline">{r.title}</Link>
                      <StatusBadge status={(r.status as PlanStatus) || "plan_created"} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.event_date ? new Date(r.event_date + "T00:00:00").toLocaleDateString() : "No date"}
                      {r.location ? ` · ${r.location}` : ""}
                    </p>
                    {requested && r.quote_requested_at && (
                      <p className="mt-0.5 text-xs text-[color:var(--gold)]">
                        Quote requested on {new Date(r.quote_requested_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {requested ? (
                      <button
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                      >
                        <Send className="h-3.5 w-3.5" /> Quote Requested
                      </button>
                    ) : (
                      <button
                        onClick={() => setQuoteFor(r.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]"
                      >
                        <Send className="h-3.5 w-3.5" /> Request Quote
                      </button>
                    )}
                    <Link to="/account/$id" params={{ id: r.id }} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/70">View</Link>
                    <button onClick={() => { if (confirm("Delete this plan?")) del.mutate(r.id); }} className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {quoteFor && quoteRec.data && (
        <RequestQuoteModal
          open={!!quoteFor}
          onClose={() => setQuoteFor(null)}
          recommendationId={quoteFor}
          input={quoteRec.data.input as unknown as RecommenderInput}
          recommendation={quoteRec.data.recommendation as unknown as AIRecommendation}
          contact={quoteRec.data.contact as { name?: string; email?: string; phone?: string; preferredContact?: string } | null}
          userEmail={user.email}
        />
      )}
    </SiteLayout>
  );
}
