import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Search, UserSquare2 } from "lucide-react";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { listCustomers } from "@/lib/customers.functions";

const STAGES = ["lead", "quoted", "booked", "repeat", "archived"] as const;
type Stage = (typeof STAGES)[number];

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers | Admin" }] }),
  component: CustomersPage,
});

function stageClasses(stage: string): string {
  switch (stage) {
    case "booked":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "repeat":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "quoted":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "archived":
      return "bg-muted text-muted-foreground border-border";
    case "lead":
    default:
      return "bg-sky-100 text-sky-800 border-sky-200";
  }
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${stageClasses(
        stage,
      )}`}
    >
      {stage}
    </span>
  );
}

function CustomersPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: rl } = useIsAdmin();
  const fn = useServerFn(listCustomers);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "">("");
  const [debounced, setDebounced] = useState("");

  useMemo(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", debounced, stage],
    queryFn: () =>
      fn({
        data: {
          search: debounced || undefined,
          stage: stage || undefined,
          limit: 100,
        },
      }),
    enabled: !!user && isAdmin,
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

  const rows = data?.customers ?? [];

  return (
    <AdminLayout>
      <AdminPageHeader
        eyebrow="CRM"
        title="Customers"
        subtitle="Everyone who's ever asked for a quote, planned an event, or signed a contract."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage | "")}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <UserSquare2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            {debounced || stage ? "No customers match those filters." : "No customers yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2 text-right">Requests</th>
                <th className="px-3 py-2 text-right">Quotes</th>
                <th className="px-3 py-2 text-right">Booked</th>
                <th className="px-3 py-2">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link
                      to="/admin/customers/$id"
                      params={{ id: c.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name || "—"}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-3 py-2">
                    <StageBadge stage={c.lifecycle_stage} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.quote_request_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.quote_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.booked_count}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
