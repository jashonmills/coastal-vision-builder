import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, FileText, ExternalLink, MapPin, CalendarCheck, CalendarPlus, CalendarX, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { getQuoteRequest, createQuoteFromRequest, updateQuoteRequestStatus } from "@/lib/quotes.functions";
import { placeVenueHold, confirmVenueBooking, releaseVenueBooking, listVenueEventsOnDate, BEACON_VENUE } from "@/lib/venue-bookings.functions";
import { StatusPill } from "./admin.quote-requests";
import { invalidateOpsQueries } from "@/lib/admin-cache";
import { buildQuoteRequestMailto } from "@/lib/quote-email-mailto";

export const Route = createFileRoute("/admin/quote-requests_/$id")({
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
  const holdFn = useServerFn(placeVenueHold);
  const confirmFn = useServerFn(confirmVenueBooking);
  const releaseFn = useServerFn(releaseVenueBooking);
  const availFn = useServerFn(listVenueEventsOnDate);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: req, isLoading, refetch } = useQuery({
    queryKey: ["quote-request", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user && isAdmin,
  });

  const isVenue = req?.request_type === "venue";

  const { data: dateEvents = [] } = useQuery({
    queryKey: ["venue-events-on-date", req?.event_date],
    queryFn: () => availFn({ data: { date: req!.event_date as string } }),
    enabled: !!user && isAdmin && isVenue && !!req?.event_date,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { quote_request_id: id } }),
    onSuccess: ({ id: qid }) => {
      toast.success("Quote draft created");
      invalidateOpsQueries(qc);
      navigate({ to: "/admin/quotes/$id/edit", params: { id: qid } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hold = useMutation({
    mutationFn: () => holdFn({ data: { quote_request_id: id } }),
    onSuccess: () => {
      toast.success(`${BEACON_VENUE.name} hold placed on ${req?.event_date}.`);
      refetch();
      invalidateOpsQueries(qc);
      qc.invalidateQueries({ queryKey: ["venue-events-on-date", req?.event_date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const confirmBooking = useMutation({
    mutationFn: () => confirmFn({ data: { quote_request_id: id } }),
    onSuccess: () => {
      toast.success(`${BEACON_VENUE.name} booking confirmed.`);
      refetch();
      invalidateOpsQueries(qc);
      qc.invalidateQueries({ queryKey: ["venue-events-on-date", req?.event_date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const release = useMutation({
    mutationFn: () => releaseFn({ data: { quote_request_id: id } }),
    onSuccess: () => {
      toast.success("Beacon hold released.");
      refetch();
      invalidateOpsQueries(qc);
      qc.invalidateQueries({ queryKey: ["venue-events-on-date", req?.event_date] });
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

  // Determine current Beacon state from related events on the requested date
  const ownEvents = dateEvents.filter((e: any) => e.quote_request_id === id);
  const hasBooked = ownEvents.some((e: any) => e.event_type === "venue_booked");
  const hasHold = ownEvents.some((e: any) => e.event_type === "venue_hold");
  const conflicts = dateEvents.filter((e: any) => e.quote_request_id !== id);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <Link to="/admin/quote-requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to requests
        </Link>

        {isVenue && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#7c5cff]/40 bg-[#7c5cff]/10 px-4 py-3">
            <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#5b3fdc]" />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg text-[#5b3fdc]">{BEACON_VENUE.name}</p>
              <p className="text-xs text-muted-foreground">{BEACON_VENUE.address} · Venue inquiry</p>
            </div>
            {hasBooked ? (
              <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Booked</span>
            ) : hasHold ? (
              <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">On hold</span>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-primary">{req.customer_name}</h1>
            <p className="text-sm text-muted-foreground">{req.customer_email}{req.customer_phone ? ` · ${req.customer_phone}` : ""}</p>
            <div className="mt-2"><StatusPill status={req.status} /></div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isVenue ? (
              <>
                {!hasHold && !hasBooked && (
                  <button
                    onClick={() => hold.mutate()}
                    disabled={hold.isPending || !req.event_date}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    title={!req.event_date ? "Set an event date first" : undefined}
                  >
                    {hold.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                    Place Hold on Date
                  </button>
                )}
                {!hasBooked && (
                  <button
                    onClick={() => confirmBooking.mutate()}
                    disabled={confirmBooking.isPending || !req.event_date}
                    className="inline-flex items-center gap-2 rounded-full bg-[#5b3fdc] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {confirmBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                    Confirm Beacon Booking
                  </button>
                )}
                {(hasHold || hasBooked) && (
                  <button
                    onClick={() => { if (window.confirm("Release this Beacon hold/booking and remove scheduler events?")) release.mutate(); }}
                    disabled={release.isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
                  >
                    {release.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
                    Release
                  </button>
                )}
                <button
                  onClick={() => create.mutate()}
                  disabled={create.isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                >
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Create Add-on Rental Quote
                </button>
              </>
            ) : (
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Create Quote from This Plan
              </button>
            )}
            <a
              href={buildQuoteRequestMailto({
                customerName: req.customer_name,
                customerEmail: req.customer_email,
                eventType: req.event_type,
                eventDate: req.event_date,
                eventLocation: req.event_location,
              })}
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

        {isVenue && req.event_date && (
          <Card title={`Beacon availability on ${req.event_date}`} className="mt-6">
            {conflicts.length === 0 && ownEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No other Beacon holds or bookings on this date.</p>
            )}
            {ownEvents.length > 0 && (
              <ul className="space-y-1 text-sm">
                {ownEvents.map((e: any) => (
                  <li key={e.id} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#5b3fdc]" />
                    <span className="font-medium">{e.event_type === "venue_booked" ? "Booked" : "Hold"}</span>
                    <span className="text-muted-foreground">— {e.title}</span>
                  </li>
                ))}
              </ul>
            )}
            {conflicts.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
                  <AlertTriangle className="h-3 w-3" /> Conflicts on this date
                </div>
                <ul className="space-y-1 text-sm">
                  {conflicts.map((e: any) => (
                    <li key={e.id} className="text-amber-900">{e.title} ({e.event_type})</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

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
