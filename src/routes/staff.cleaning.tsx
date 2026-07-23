import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { listCleaningQueue, markCleaned } from "@/lib/returns.functions";

export const Route = createFileRoute("/staff/cleaning")({
  head: () => ({ meta: [{ title: "Cleaning queue | Crew" }, { name: "robots", content: "noindex" }] }),
  component: CleaningPage,
});

type Row = { inventory_item_id: string; name: string; sku: string | null; category: string | null; cleaning_quantity: number };

function CleaningPage() {
  const listFn = useServerFn(listCleaningQueue);
  const q = useQuery({
    queryKey: ["cleaning-queue"],
    queryFn: () => listFn(),
  });

  const rows = (q.data ?? []) as Row[];

  return (
    <div className="space-y-5">
      <Link to="/staff/more" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> More
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</p>
        <h1 className="mt-1 text-2xl font-serif text-primary sm:text-3xl">Cleaning queue</h1>
        <p className="text-sm text-muted-foreground">Return items to available once they're cleaned.</p>
      </header>

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-emerald-600" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing to clean — you're all caught up.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <CleaningRow key={r.inventory_item_id} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function CleaningRow({ row }: { row: Row }) {
  const qc = useQueryClient();
  const markFn = useServerFn(markCleaned);
  const [qty, setQty] = useState(row.cleaning_quantity);
  const mut = useMutation({
    mutationFn: () => markFn({ data: { inventory_item_id: row.inventory_item_id, quantity: qty } as never }),
    onSuccess: () => {
      toast.success(`Marked ${qty} cleaned`);
      qc.invalidateQueries({ queryKey: ["cleaning-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {row.category ?? "Other"}{row.sku ? ` · ${row.sku}` : ""} · {row.cleaning_quantity} to clean
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background">
          <button
            type="button"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            className="h-10 w-10 rounded-full text-lg font-semibold"
          >−</button>
          <span className="min-w-[3ch] text-center tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((n) => Math.min(row.cleaning_quantity, n + 1))}
            className="h-10 w-10 rounded-full text-lg font-semibold"
          >+</button>
        </div>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || qty <= 0}
          className="ml-auto inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Saving…" : "Mark cleaned"}
        </button>
      </div>
    </li>
  );
}
