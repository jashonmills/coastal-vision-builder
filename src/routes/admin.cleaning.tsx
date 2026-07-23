import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useIsAdmin } from "@/hooks/use-admin";
import { listCleaningQueue } from "@/lib/returns.functions";
import { CleaningRow } from "./staff.cleaning";

export const Route = createFileRoute("/admin/cleaning")({
  head: () => ({ meta: [{ title: "Cleaning | Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCleaningPage,
});

type Row = { inventory_item_id: string; name: string; sku: string | null; category: string | null; cleaning_quantity: number };

function AdminCleaningPage() {
  const { isAdmin, loading } = useIsAdmin();
  const fn = useServerFn(listCleaningQueue);
  const q = useQuery({
    queryKey: ["cleaning-queue"],
    queryFn: () => fn(),
    enabled: isAdmin,
  });

  if (loading) {
    return <AdminLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!isAdmin) return <AdminLayout><p className="p-8">Admin required.</p></AdminLayout>;

  const rows = (q.data ?? []) as Row[];
  const total = rows.reduce((n, r) => n + (r.cleaning_quantity ?? 0), 0);

  return (
    <AdminLayout>
      <AdminPageHeader
        eyebrow="Operations"
        title="Cleaning queue"
        subtitle={`${rows.length} item${rows.length === 1 ? "" : "s"} · ${total} unit${total === 1 ? "" : "s"} awaiting cleaning`}
      />
      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-emerald-600" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing waiting — inventory is clean.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => <CleaningRow key={r.inventory_item_id} row={r} />)}
        </ul>
      )}
    </AdminLayout>
  );
}
