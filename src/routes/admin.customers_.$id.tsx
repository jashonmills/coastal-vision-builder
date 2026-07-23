import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  FileText,
  Inbox,
  CalendarDays,
  Sparkles,
  Merge,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  getCustomer,
  updateCustomer,
  listCustomers,
  mergeCustomers,
} from "@/lib/customers.functions";
import { StageBadge } from "./admin.customers";
import { supabase } from "@/integrations/supabase/client";

const STAGES = ["lead", "quoted", "booked", "repeat", "archived"] as const;

export const Route = createFileRoute("/admin/customers_/$id")({
  head: () => ({ meta: [{ title: "Customer | Admin" }] }),
  component: CustomerDetailPage,
});

function Section({
  title,
  icon: Icon,
  children,
  count,
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-serif text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {typeof count === "number" && (
          <span className="text-xs text-muted-foreground">{count}</span>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const getFn = useServerFn(getCustomer);
  const updFn = useServerFn(updateCustomer);
  const mergeFn = useServerFn(mergeCustomers);
  const listFn = useServerFn(listCustomers);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !!user && isAdmin,
  });

  // Editable panel state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] =
    useState<(typeof STAGES)[number]>("lead");

  useEffect(() => {
    if (!data?.customer) return;
    setName(data.customer.name ?? "");
    setPhone(data.customer.phone ?? "");
    setCompany(data.customer.company ?? "");
    setNotes(data.customer.notes ?? "");
    setStage(
      (STAGES as readonly string[]).includes(data.customer.lifecycle_stage)
        ? (data.customer.lifecycle_stage as (typeof STAGES)[number])
        : "lead",
    );
  }, [data?.customer]);

  const save = useMutation({
    mutationFn: () =>
      updFn({
        data: {
          id,
          name: name.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          notes: notes.trim() || null,
          lifecycle_stage: stage,
        },
      }),
    onSuccess: () => {
      toast.success("Customer updated");
      qc.invalidateQueries({ queryKey: ["admin-customer", id] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Merge dialog state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergePick, setMergePick] = useState<{ id: string; label: string } | null>(null);
  const { data: mergeCandidates } = useQuery({
    queryKey: ["admin-customer-merge-search", mergeSearch],
    queryFn: () =>
      listFn({ data: { search: mergeSearch.trim() || undefined, limit: 20 } }),
    enabled: mergeOpen && !!user && isAdmin,
  });
  const merge = useMutation({
    mutationFn: () =>
      mergeFn({ data: { primary_id: id, duplicate_id: mergePick!.id } }),
    onSuccess: () => {
      toast.success("Customers merged");
      setMergeOpen(false);
      setMergePick(null);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rl)
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  if (!user || !isAdmin)
    return (
      <AdminLayout>
        <div className="p-12 text-center text-muted-foreground">Admin access required.</div>
      </AdminLayout>
    );
  if (isLoading || !data)
    return (
      <AdminLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );

  const { customer, quoteRequests, quotes, contracts, savedRecommendations, events } = data;

  async function downloadContract(pdfPath: string, contractType: string) {
    try {
      const { data: signed, error } = await supabase.storage
        .from("contract-submissions")
        .createSignedUrl(pdfPath, 60 * 5);
      if (error || !signed?.signedUrl) throw new Error(error?.message ?? "Signed URL failed");
      window.open(signed.signedUrl, "_blank", "noopener");
      void contractType;
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AdminLayout>
      <Link
        to="/admin/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>

      <AdminPageHeader
        eyebrow="CRM"
        title={customer.name || customer.email}
        subtitle={`${customer.email}${customer.phone ? ` · ${customer.phone}` : ""}${
          customer.company ? ` · ${customer.company}` : ""
        }`}
        actions={
          <>
            <StageBadge stage={customer.lifecycle_stage} />
            <button
              onClick={() => setMergeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Merge className="h-3.5 w-3.5" /> Merge duplicate…
            </button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="uppercase tracking-wider text-muted-foreground">First seen</p>
          <p className="mt-1 text-sm text-foreground">
            {new Date(customer.first_seen_at).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="uppercase tracking-wider text-muted-foreground">Last activity</p>
          <p className="mt-1 text-sm text-foreground">
            {new Date(customer.last_activity_at).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs">
          <p className="uppercase tracking-wider text-muted-foreground">Account</p>
          <p className="mt-1 text-sm text-foreground">
            {customer.user_id ? "Signed-up user" : "Guest only"}
          </p>
        </div>
      </div>

      {/* Editable panel */}
      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-serif text-sm font-semibold text-foreground">Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Lifecycle stage</span>
            <select
              value={stage}
              onChange={(e) =>
                setStage(e.target.value as (typeof STAGES)[number])
              }
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2 text-xs">
            <span className="text-muted-foreground">Internal notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Private notes for staff — not shown to the customer."
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Quote Requests" icon={Inbox} count={quoteRequests.length}>
          {quoteRequests.length === 0 ? (
            <EmptyRow>No requests yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {quoteRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.event_type || r.request_type || "Request"} ·{" "}
                      <span className="text-muted-foreground">{r.event_date || "no date"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.status} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to="/admin/quote-requests/$id"
                    params={{ id: r.id }}
                    className="text-xs text-primary hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Quotes" icon={FileText} count={quotes.length}>
          {quotes.length === 0 ? (
            <EmptyRow>No quotes yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <span className="font-mono text-xs text-muted-foreground">
                        {q.quote_number}
                      </span>{" "}
                      · ${((q.total_cents ?? 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.status}
                      {q.payment_received ? " · paid" : ""} · {q.event_date || "no date"}
                    </p>
                  </div>
                  <Link
                    to="/admin/quotes/$id/edit"
                    params={{ id: q.id }}
                    className="text-xs text-primary hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Contracts" icon={FileText} count={contracts.length}>
          {contracts.length === 0 ? (
            <EmptyRow>No signed contracts yet.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.contract_type}</p>
                    <p className="text-xs text-muted-foreground">
                      Signed {new Date(c.created_at).toLocaleDateString()}
                      {c.event_date ? ` · event ${c.event_date}` : ""}
                    </p>
                  </div>
                  {c.pdf_path && (
                    <button
                      onClick={() => downloadContract(c.pdf_path!, c.contract_type)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> PDF
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Saved Plans" icon={Sparkles} count={savedRecommendations.length}>
          {savedRecommendations.length === 0 ? (
            <EmptyRow>No saved planner designs.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {savedRecommendations.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <p className="font-medium">{s.title || "Untitled plan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.status ?? "saved"} · {s.event_date || new Date(s.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Calendar Events" icon={CalendarDays} count={events.length}>
          {events.length === 0 ? (
            <EmptyRow>No scheduled events.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {events.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.start_time).toLocaleString()} · {e.event_type}
                    {e.status ? ` · ${e.status}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Merge dialog (simple, no shadcn Dialog to keep deps minimal) */}
      {mergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">
              Merge duplicate into this customer
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Pick another customer to fold into <span className="font-medium">{customer.email}</span>.
              All linked requests, quotes, and contracts move here, then the duplicate is deleted.
              This can't be undone.
            </p>
            <input
              value={mergeSearch}
              onChange={(e) => {
                setMergeSearch(e.target.value);
                setMergePick(null);
              }}
              placeholder="Search other customers…"
              className="mb-2 h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              {(mergeCandidates?.customers ?? [])
                .filter((c) => c.id !== id)
                .map((c) => {
                  const label = `${c.name || "—"} · ${c.email}`;
                  const picked = mergePick?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setMergePick({ id: c.id, label })}
                      className={`flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                        picked ? "bg-primary/10" : "hover:bg-secondary/40"
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <StageBadge stage={c.lifecycle_stage} />
                    </button>
                  );
                })}
              {(mergeCandidates?.customers?.filter((c) => c.id !== id).length ?? 0) === 0 && (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No matches.
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {mergePick ? `Will merge: ${mergePick.label}` : "Select a duplicate to merge."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMergeOpen(false);
                    setMergePick(null);
                  }}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!mergePick) return;
                    if (
                      window.confirm(
                        `Merge "${mergePick.label}" into ${customer.email}? This can't be undone.`,
                      )
                    ) {
                      merge.mutate();
                    }
                  }}
                  disabled={!mergePick || merge.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {merge.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Merge className="h-3.5 w-3.5" />
                  )}
                  Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* keep navigate typechecked (linter) */}
      <span className="hidden">{typeof navigate}</span>
    </AdminLayout>
  );
}
