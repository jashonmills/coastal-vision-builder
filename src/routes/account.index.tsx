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
import {
  listMyQuotes,
  listMyContracts,
  getMyContractDownloadUrl,
} from "@/lib/customer-portal.functions";
import { Download, FileSignature, FileText, Loader2, LogOut, Send, Trash2 } from "lucide-react";
import { RequestQuoteModal, StatusBadge, type PlanStatus } from "@/components/RequestQuoteModal";
import type { AIRecommendation } from "@/lib/recommender.functions";
import type { RecommenderInput } from "@/lib/recommender";

type TabKey = "plans" | "quotes" | "contracts";

const CONTRACT_LABEL: Record<string, string> = {
  "rental-contract": "Rental Contract",
  "beacon-contract": "Beacon on Broadway Contract",
  "catering-contract": "Catering Contract",
  "credit-card-authorization": "Credit Card Authorization",
};

function money(cents: number | null | undefined): string {
  const c = cents ?? 0;
  return `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "My Account | Pacific North Events & Tents" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("plans");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { next: "/account" } as never });
  }, [user, loading, navigate]);

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
      <PageHero eyebrow="My Account" title="Your Event Hub" subtitle={`Signed in as ${user.email}`} />
      <section className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-secondary p-1 text-sm">
            {(["plans", "quotes", "contracts"] as TabKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-2 font-medium transition-colors capitalize ${
                  tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {k === "plans" ? "Plans" : k === "quotes" ? "Quotes" : "Contracts"}
              </button>
            ))}
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

        {tab === "plans" && <PlansTab />}
        {tab === "quotes" && <QuotesTab />}
        {tab === "contracts" && <ContractsTab />}
      </section>
    </SiteLayout>
  );
}

/* --------------------------------- Plans --------------------------------- */

function PlansTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyRecommendations);
  const delFn = useServerFn(deleteRecommendation);
  const getFn = useServerFn(getRecommendation);
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-recommendations"],
    queryFn: () => listFn(),
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

  const atCap = (data?.length ?? 0) >= MAX_ACTIVE_PLANS;

  return (
    <>
      <div className="mb-4">
        {atCap ? (
          <button disabled className="inline-flex cursor-not-allowed items-center rounded-full bg-muted px-5 py-2 text-sm font-semibold text-muted-foreground">
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
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<FileText className="mx-auto h-10 w-10 text-muted-foreground" />}
          title="You don't have any saved event plans yet"
          body="Start the AI Tent Planner to create your first setup, then request a quote when you're ready."
          cta={<Link to="/ai-tent-planner" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">Start AI Tent Planner</Link>}
        />
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
                    <button disabled className="inline-flex cursor-not-allowed items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
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
      {quoteFor && quoteRec.data && (
        <RequestQuoteModal
          open={!!quoteFor}
          onClose={() => setQuoteFor(null)}
          recommendationId={quoteFor}
          input={quoteRec.data.input as unknown as RecommenderInput}
          recommendation={quoteRec.data.recommendation as unknown as AIRecommendation}
          contact={quoteRec.data.contact as { name?: string; email?: string; phone?: string; preferredContact?: string } | null}
          userEmail={user?.email}
        />
      )}
    </>
  );
}

/* --------------------------------- Quotes -------------------------------- */

function QuotesTab() {
  const listFn = useServerFn(listMyQuotes);
  const { data, isLoading } = useQuery({ queryKey: ["my-quotes"], queryFn: () => listFn() });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="mx-auto h-10 w-10 text-muted-foreground" />}
        title="No quotes yet"
        body="Once you request a quote and our team sends it back, it will appear here. You'll also get an email notification."
        cta={<Link to="/ai-tent-planner" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">Start a Plan</Link>}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((q) => (
        <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif text-lg text-primary">{q.quote_number}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                q.status === "booked" ? "bg-emerald-100 text-emerald-800"
                : q.status === "approved" ? "bg-blue-100 text-blue-800"
                : "bg-amber-100 text-amber-900"
              }`}>{q.status}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {q.event_type ? `${q.event_type} · ` : ""}
              {q.event_date ? new Date(q.event_date + "T00:00:00").toLocaleDateString() : "No date"}
              {q.event_location ? ` · ${q.event_location}` : ""}
              {q.guest_count ? ` · ${q.guest_count} guests` : ""}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">Total: {money(q.total_cents)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/account/quote/$id"
              params={{ id: q.id }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]"
            >
              View Quote
            </Link>
            <Link
              to="/rental-contract/fill/$contractId"
              params={{ contractId: "rental-contract" }}
              search={{ quoteId: q.id }}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--gold)] px-3 py-1.5 text-xs font-semibold text-[color:var(--ink-on-gold,#1a1a1a)] hover:opacity-90"
            >
              <FileSignature className="h-3.5 w-3.5" /> Sign Contract
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------- Contracts ------------------------------ */

function ContractsTab() {
  const listFn = useServerFn(listMyContracts);
  const urlFn = useServerFn(getMyContractDownloadUrl);
  const { data, isLoading } = useQuery({ queryKey: ["my-contracts"], queryFn: () => listFn() });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function download(id: string) {
    setBusyId(id);
    try {
      const { url } = await urlFn({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open contract");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<FileSignature className="mx-auto h-10 w-10 text-muted-foreground" />}
        title="No signed contracts yet"
        body="Once you sign a contract online, it will appear here and you can download the signed PDF anytime."
        cta={<Link to="/rental-contract" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)]">View Contracts</Link>}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg text-primary">
              {CONTRACT_LABEL[c.contract_type] ?? c.contract_type}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Signed {new Date(c.created_at).toLocaleDateString()}
              {c.event_date ? ` · Event ${new Date(c.event_date + "T00:00:00").toLocaleDateString()}` : ""}
            </p>
          </div>
          <button
            onClick={() => download(c.id)}
            disabled={busyId === c.id}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[color:var(--navy-soft)] disabled:opacity-60"
          >
            {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </button>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------- Shared --------------------------------- */

function EmptyState({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      {icon}
      <p className="mt-4 font-serif text-xl text-primary">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {cta}
    </div>
  );
}
