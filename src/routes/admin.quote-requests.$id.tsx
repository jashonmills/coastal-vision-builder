import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { getQuoteRequest, createQuoteFromRequest, updateQuoteRequestStatus } from "@/lib/quotes.functions";
import { StatusPill } from "./admin.quote-requests";

export const Route = createFileRoute("/admin/quote-requests/$id")({
  head: () => ({ meta: [{ title: "Quote Request | Admin" }] }),
  component: QuoteRequestDetailPage,
});

function QuoteRequestDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const getFn = useServerFn(getQuoteRequest);
  const createFn = useServerFn(createQuoteFromRequest);
  const updFn = useServerFn(updateQuoteRequestStatus);
  const navigate = useNavigate();

  const { data: req, isLoading } = useQuery({
    queryKey: ["quote-request", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user && isAdmin,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { quote_request_id: id } }),
    onSuccess: ({ id: qid }) => {
      toast.success("Quote draft created");
      navigate({ to: "/admin/quotes/$id/edit", params: { id: qid } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || roleLoading || isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }
  if (!user || !isAdmin || !req) return <SiteLayout><div className="p-12 text-center text-muted-foreground">Not available.</div></SiteLayout>;

  const rec = (req.recommendation as any) || {};
  const input = (req.planner_input as any) || {};
  const picks: Array<{ category?: string; item_name?: string; quantity?: number; reason?: string }> = rec.picks ?? [];

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <Link to="/admin/quote-requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </Link>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-primary">{req.customer_name}</h1>
            <p className="text-sm text-muted-foreground">{req.customer_email}{req.customer_phone ? ` · ${req.customer_phone}` : ""}</p>
            <div className="mt-2"><StatusPill status={req.status} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Create Quote from This Plan
            </button>
            <a
              href={`mailto:${req.customer_email}?subject=Your Pacific North Events Quote Request`}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              <ExternalLink className="h-3 w-3" /> Email
            </a>
            {req.status !== "archived" && (
              <button
                onClick={() => updFn({ data: { id, status: "archived" } }).then(() => navigate({ to: "/admin/quote-requests" }))}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
              >
                Archive
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card title="Event Info">
            <Field label="Type" value={req.event_type} />
            <Field label="Date" value={req.event_date} />
            <Field label="Location" value={req.event_location} />
            <Field label="Guests" value={req.guest_count?.toString()} />
            <Field label="Surface" value={input.surface} />
            <Field label="Weather exposure" value={input.exposure} />
            <Field label="Seating" value={input.seated} />
            <Field label="Food" value={input.food} />
            <Field label="Dancing" value={input.dancing} />
            <Field label="Sidewalls" value={input.sidewalls} />
            <Field label="After sunset" value={input.afterSunset} />
          </Card>
          <Card title="Customer">
            <Field label="Preferred contact" value={req.preferred_contact_method} />
            <Field label="Customer note" value={req.customer_note} />
            {req.pdf_url && (
              <a href={req.pdf_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline">
                <ExternalLink className="h-3 w-3" /> View planner PDF
              </a>
            )}
          </Card>
        </div>

        <Card title="Planner Recommendation" className="mt-6">
          {rec.tent_size && <Field label="Recommended tent" value={rec.tent_size} />}
          {rec.layout_caption && <Field label="Layout" value={rec.layout_caption} />}
          {rec.summary && <p className="mt-2 text-sm text-muted-foreground">{rec.summary}</p>}
          {picks.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Equipment</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {picks.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium">{p.quantity}× {p.item_name}</span>
                    {p.category && <span className="ml-2 text-xs text-muted-foreground">{p.category}</span>}
                    {p.reason && <div className="text-xs text-muted-foreground">{p.reason}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {rec.weather_notes?.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <strong>Weather:</strong> {rec.weather_notes.join(" · ")}
            </div>
          )}
        </Card>
      </section>
    </SiteLayout>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
