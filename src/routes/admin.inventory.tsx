import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  Loader2, Plus, Box, Boxes, AlertTriangle, Wrench, Sparkles, PackageCheck,
  Archive, ArrowRight, Search, CalendarClock,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import {
  computeAvailable, ITEM_TYPE_LABEL, ITEM_TYPES, type InventoryCategory, type InventoryItem, type ItemType,
} from "@/lib/inventory";
import { AdjustQuantityModal } from "@/components/admin/AdjustQuantityModal";
import { getInventoryReservationSummaries } from "@/lib/pricing-mappings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory Management | Admin" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ filter: z.enum(["zero"]).optional() }).parse(s),
  component: InventoryAdminPage,
});


function InventoryAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { next: "/admin/inventory" } as never });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }
  if (!user) return null;
  if (!isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-serif text-2xl text-primary">Admin access required</h1>
          <p className="mt-3 text-muted-foreground">
            Go to <Link to="/admin" className="underline">Admin</Link> to set up an admin account.
          </p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Admin"
        title="Inventory Management"
        subtitle="Rental operating system: stock, status, reservations, and lifecycle."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <Dashboard />
      </section>
    </SiteLayout>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [creating, setCreating] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterType, setFilterType] = useState<"" | ItemType>("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "archived">("active");
  const [filterPlanner, setFilterPlanner] = useState(false);
  const [filterChat, setFilterChat] = useState(false);
  const [filterZero, setFilterZero] = useState(search.filter === "zero");
  const [searchText, setSearch] = useState("");

  const summariesFn = useServerFn(getInventoryReservationSummaries);
  const { data: reservationSummaries = {} } = useQuery({
    queryKey: ["admin-inventory-reservation-summaries"],
    queryFn: () => summariesFn(),
  });


  const { data: categories = [] } = useQuery({
    queryKey: ["admin-inventory-categories"],
    queryFn: async (): Promise<InventoryCategory[]> => {
      const { data, error } = await db
        .from("inventory_categories").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-inventory-items"],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await db
        .from("inventory_items").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterCat && i.category_id !== filterCat) return false;
      if (filterType && i.item_type !== filterType) return false;
      if (filterActive === "active" && (!i.active || i.deleted_at)) return false;
      if (filterActive === "archived" && i.active && !i.deleted_at) return false;
      if (filterPlanner && !i.visible_to_planner) return false;
      if (filterChat && !i.visible_to_chat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !(i.sku ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filterCat, filterType, filterActive, filterPlanner, filterChat, search]);

  const summary = useMemo(() => {
    let owned = 0, available = 0, reserved = 0, out = 0, cleaning = 0, maint = 0, damaged = 0;
    let negative = 0, plannerNoStock = 0;
    for (const i of items) {
      owned += i.total_owned_quantity;
      reserved += i.reserved_quantity;
      out += i.checked_out_quantity;
      cleaning += i.cleaning_quantity;
      maint += i.maintenance_quantity;
      damaged += i.damaged_missing_quantity;
      const av = computeAvailable(i);
      available += Math.max(0, av);
      if (av < 0) negative += 1;
      if (i.active && i.visible_to_planner && i.total_owned_quantity === 0) plannerNoStock += 1;
    }
    return { owned, available, reserved, out, cleaning, maint, damaged, negative, plannerNoStock };
  }, [items]);

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("inventory_items")
        .update({ active: false, deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory-items"] }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <SummaryCard icon={<Boxes className="h-4 w-4" />} label="Items" value={items.length} />
        <SummaryCard icon={<Box className="h-4 w-4" />} label="Owned" value={summary.owned} />
        <SummaryCard icon={<PackageCheck className="h-4 w-4" />} label="Available" value={summary.available} />
        <SummaryCard icon={<PackageCheck className="h-4 w-4" />} label="Reserved" value={summary.reserved} />
        <SummaryCard icon={<Box className="h-4 w-4" />} label="Checked out" value={summary.out} />
        <SummaryCard icon={<Sparkles className="h-4 w-4" />} label="Cleaning" value={summary.cleaning} />
        <SummaryCard icon={<Wrench className="h-4 w-4" />} label="Maintenance" value={summary.maint} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Damaged/Missing" value={summary.damaged} />
      </div>

      {/* Warnings */}
      {(summary.plannerNoStock > 0 || summary.negative > 0) && (
        <div className="space-y-2">
          {summary.plannerNoStock > 0 && (
            <Warning>
              {summary.plannerNoStock} planner-visible item{summary.plannerNoStock === 1 ? "" : "s"} have owned quantity 0. Configure real stock counts before promising availability.
            </Warning>
          )}
          {summary.negative > 0 && (
            <Warning tone="error">
              {summary.negative} item{summary.negative === 1 ? "" : "s"} have a negative available quantity. Review buckets immediately.
            </Warning>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2 lg:grid-cols-6">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search name or SKU"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as ItemType | "")}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm">
          <option value="">All types</option>
          {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm">
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
          <option value="all">All</option>
        </select>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={filterPlanner} onChange={(e) => setFilterPlanner(e.target.checked)} />
            Planner
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={filterChat} onChange={(e) => setFilterChat(e.target.checked)} />
            Chat
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Owned</th>
              <th className="px-3 py-2 text-right">Avail</th>
              <th className="px-3 py-2 text-right">Reserved</th>
              <th className="px-3 py-2 text-right">Out</th>
              <th className="px-3 py-2 text-right">Cleaning</th>
              <th className="px-3 py-2 text-right">Maint</th>
              <th className="px-3 py-2 text-right">Damaged</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-12 text-center text-muted-foreground">No items match these filters.</td></tr>
            )}
            {filtered.map((i) => {
              const av = computeAvailable(i);
              const cat = i.category_id ? catMap[i.category_id] : null;
              return (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link to="/admin/inventory/$id" params={{ id: i.id }} className="font-medium text-foreground hover:underline">
                      {i.name}
                    </Link>
                    {i.sku && <div className="text-xs text-muted-foreground">SKU: {i.sku}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{cat?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{ITEM_TYPE_LABEL[i.item_type]}</td>
                  <td className="px-3 py-2 text-right">{i.total_owned_quantity}</td>
                  <td className={`px-3 py-2 text-right font-medium ${av < 0 ? "text-destructive" : ""}`}>{av}</td>
                  <td className="px-3 py-2 text-right">{i.reserved_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.checked_out_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.cleaning_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.maintenance_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.damaged_missing_quantity}</td>
                  <td className="px-3 py-2">
                    {i.deleted_at ? <Badge tone="muted">Archived</Badge>
                      : i.active ? <Badge tone="success">Active</Badge>
                      : <Badge tone="muted">Inactive</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setAdjustItem(i)}
                        className="rounded px-2 py-1 text-xs hover:bg-muted">Adjust</button>
                      <Link to="/admin/inventory/$id" params={{ id: i.id }}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                      {!i.deleted_at && (
                        <button onClick={() => { if (confirm(`Archive "${i.name}"?`)) archive.mutate(i.id); }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Archive">
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && <CreateItemModal categories={categories} onClose={() => setCreating(false)} />}
      {adjustItem && <AdjustQuantityModal item={adjustItem} onClose={() => setAdjustItem(null)} />}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}<span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 font-serif text-xl text-primary">{value}</div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "success" | "muted" | "warning" }) {
  const cls = tone === "success" ? "bg-emerald-100 text-emerald-800"
    : tone === "warning" ? "bg-amber-100 text-amber-900"
    : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

function Warning({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "error" }) {
  const cls = tone === "error"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-amber-400/40 bg-amber-50/50 text-amber-900 dark:bg-amber-900/10 dark:text-amber-200";
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${cls}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

function CreateItemModal({ categories, onClose }: { categories: InventoryCategory[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [itemType, setItemType] = useState<ItemType>("physical_rental");
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required.");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
      const { error } = await db.from("inventory_items").insert({
        name: name.trim(), slug, category_id: categoryId || null, item_type: itemType,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-inventory-items"] }); onClose(); },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="mt-12 w-full max-w-md rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        <h3 className="mb-4 font-serif text-xl text-primary">Add inventory item</h3>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
              className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2">
              <option value="">(uncategorized)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Type</span>
            <select value={itemType} onChange={(e) => setItemType(e.target.value as ItemType)}
              className="w-full rounded-md border border-border bg-background px-3 py-2">
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={create.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
