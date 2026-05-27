import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { getRecommendation } from "@/lib/saved-recommendations.functions";
import { RecommendationReport, RecommendationViewer } from "@/components/RecommendationViewer";
import type { AIRecommendation } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";
import { ChevronLeft, FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/account/$id")({
  head: () => ({ meta: [{ title: "Saved Plan | Pacific North Events & Tents" }] }),
  component: SavedPlanPage,
});

function SavedPlanPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const getFn = useServerFn(getRecommendation);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: `/account/${id}` } as never });
  }, [user, loading, navigate, id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-rec", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user,
  });

  if (loading || isLoading || !user) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </SiteLayout>
    );
  }
  if (error || !data) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-destructive">Could not load this plan.</p>
          <Link to="/account" className="mt-4 inline-block text-sm text-primary underline">← Back to account</Link>
        </div>
      </SiteLayout>
    );
  }

  const input = data.input as unknown as RecommenderInput;
  const recommendation = data.recommendation as unknown as AIRecommendation;
  const contactName = (data.contact as { name?: string } | null)?.name;

  return (
    <SiteLayout>
      <PageHero eyebrow="Saved Plan" title={data.title} subtitle={data.location || undefined} />
      <section className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/account" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4" /> Back to account
          </Link>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">
            <FileText className="h-4 w-4" /> Open PDF Viewer
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-secondary/30 px-6 py-4 text-sm text-muted-foreground">
            Preview · <button onClick={() => setOpen(true)} className="text-primary underline">open viewer</button> for Download / Print
          </div>
          <div className="max-h-[600px] overflow-auto">
            <RecommendationReport
              recommendation={recommendation}
              blueprintImage={data.blueprint_image}
              input={input}
              contactName={contactName}
            />
          </div>
        </div>
      </section>
      <RecommendationViewer
        open={open}
        onClose={() => setOpen(false)}
        recommendation={recommendation}
        blueprintImage={data.blueprint_image}
        input={input}
        contactName={contactName}
        fileName={`event-recommendation-${data.event_date || "plan"}`}
      />
    </SiteLayout>
  );
}

