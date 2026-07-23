import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2, Save, ShieldCheck, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import {
  listPricingInventoryMappings,
  listInventoryOptions,
  upsertPricingInventoryMapping,
  removePricingInventoryMapping,
} from "@/lib/pricing-mappings.functions";

// Legacy tab search values used to deep-link into this page's now-removed
// gallery/images/text tabs. They now live on /admin/content.
const LEGACY_TAB_TO_CONTENT: Record<string, "media" | "hero" | "text"> = {
  gallery: "media",
  images: "hero",
  text: "text",
};

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({ meta: [{ title: "Pricing | Admin" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z
      .object({ tab: z.string().optional(), filter: z.enum(["unlinked"]).optional() })
      .parse(s),
  beforeLoad: ({ search }) => {
    const t = (search as { tab?: string }).tab;
    if (t && LEGACY_TAB_TO_CONTENT[t]) {
      throw redirect({ to: "/admin/content", search: { tab: LEGACY_TAB_TO_CONTENT[t] } as never });
    }
  },
  component: PricingPage,
});

function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();

  if (authLoading || roleLoading) {
    return <AdminLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!user) return null;
  if (!isAdmin) return <AdminLayout><ClaimAdmin /></AdminLayout>;

  return (
    <AdminLayout>
      <AdminPageHeader
        eyebrow="Catalog & Pricing"
        title="Pricing"
        subtitle="Edit the public rental price list customers see. Link each line to its physical inventory item so date-aware availability works."
      />
      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Price list.</strong>{" "}
        For quantities, reservations and check-in/out, use{" "}
        <Link to="/admin/inventory" className="font-semibold text-primary underline">Inventory Management</Link>.
        {" "}To edit site text, hero images, or the media library, use{" "}
        <Link to="/admin/content" className="font-semibold text-primary underline">Site Content</Link>.
      </div>
      <PricingAdmin />
    </AdminLayout>
  );
}

function ClaimAdmin() {
  const { user: _user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.rpc("claim_first_admin");
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["is-admin"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 font-serif text-3xl text-primary">Admin access required</h1>
      <p className="mt-3 text-muted-foreground">If no admin has been set up yet, you can claim this account as the first admin.</p>
      <button onClick={claim} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Claim as first admin
      </button>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <p className="mt-8"><Link to="/account" className="text-sm text-muted-foreground underline">Back to account</Link></p>
    </div>
  );
}

type PriceItem = { id: string; category: string; name: string; price_cents: number; unit: string; notes: string | null; sort_order: number };
export type InvOption = { id: string; name: string; category: string | null; total_owned_quantity: number };

function PricingAdmin() {
  const search = Route.useSearch();
  const [onlyUnlinked, setOnlyUnlinked] = useState(search.filter === "unlinked");
  const qc = useQueryClient();
  const listMappingsFn = useServerFn(listPricingInventoryMappings);
  const listInvFn = useServerFn(listInventoryOptions);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_items").select("*").order("category").order("sort_order");
      if (error) throw error;
      return data as PriceItem[];
    },
  });
  const { data: mappings = [] } = useQuery({
    queryKey: ["admin-pricing-mappings"],
    queryFn: () => listMappingsFn(),
  });
  const { data: invOptions = [] } = useQuery({
    queryKey: ["admin-inventory-options"],
    queryFn: () => listInvFn(),
  });

  const mappingByPricing = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of mappings) m[row.pricing_item_id] = row.inventory_item_id;
    return m;
  }, [mappings]);

  const filtered = useMemo(() => {
    if (!onlyUnlinked) return items;
    return items.filter((i) => !mappingByPricing[i.id]);
  }, [items, mappingByPricing, onlyUnlinked]);

  const unlinkedCount = items.filter((i) => !mappingByPricing[i.id]).length;

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").insert({ category: "New Category", name: "New item", price_cents: 0, unit: "each", sort_order: 0 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing"] }),
  });

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} />
          Show only unlinked
          {unlinkedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {unlinkedCount} not linked
            </span>
          )}
        </label>
        <button onClick={() => add.mutate()} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add item</button>
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Price ($)</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Linked inventory item</th>
              <th className="px-3 py-2">Order</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <PricingRow
                key={it.id}
                item={it}
                mappedInventoryId={mappingByPricing[it.id] ?? null}
                invOptions={invOptions}
              />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                {onlyUnlinked ? "Every price-list item is linked to an inventory item." : "No pricing items yet."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked editor */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {onlyUnlinked ? "Every price-list item is linked to an inventory item." : "No pricing items yet."}
          </div>
        )}
        {filtered.map((it) => (
          <PricingCard
            key={it.id}
            item={it}
            mappedInventoryId={mappingByPricing[it.id] ?? null}
            invOptions={invOptions}
          />
        ))}
      </div>
    </div>
  );
}

function PricingRow({ item, mappedInventoryId, invOptions }: {
  item: PriceItem;
  mappedInventoryId: string | null;
  invOptions: InvOption[];
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(item);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);
  const upsertFn = useServerFn(upsertPricingInventoryMapping);
  const removeFn = useServerFn(removePricingInventoryMapping);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").update({
        category: draft.category, name: draft.name, price_cents: draft.price_cents, unit: draft.unit, notes: draft.notes, sort_order: draft.sort_order, updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing"] }),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing"] }),
  });
  const setMapping = useMutation({
    mutationFn: async (invId: string) => {
      if (invId === "") await removeFn({ data: { pricing_item_id: item.id } });
      else await upsertFn({ data: { pricing_item_id: item.id, inventory_item_id: invId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-mappings"] }),
  });

  const groups = useMemo(() => {
    const g: Record<string, InvOption[]> = {};
    for (const o of invOptions) {
      const k = o.category ?? "Uncategorized";
      (g[k] ||= []).push(o);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [invOptions]);

  return (
    <tr className="border-t border-border">
      <td className="px-2 py-1"><input className="w-32 rounded border px-2 py-1" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></td>
      <td className="px-2 py-1"><input className="w-48 rounded border px-2 py-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
      <td className="px-2 py-1"><input type="number" step="0.01" className="w-24 rounded border px-2 py-1" value={(draft.price_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></td>
      <td className="px-2 py-1"><input className="w-20 rounded border px-2 py-1" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></td>
      <td className="px-2 py-1"><input className="w-56 rounded border px-2 py-1" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-2">
          <select
            className="w-56 rounded border px-2 py-1 text-sm"
            value={mappedInventoryId ?? ""}
            disabled={setMapping.isPending}
            onChange={(e) => setMapping.mutate(e.target.value)}
          >
            <option value="">— None (not linked)</option>
            {groups.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.total_owned_quantity === 0 ? " (0 owned)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!mappedInventoryId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900" title="Not linked to any inventory item — availability can't be checked and no holds will be placed for this line.">
              <AlertTriangle className="h-3 w-3" /> Not linked
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-1"><input type="number" className="w-16 rounded border px-2 py-1" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || "0", 10) })} /></td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="rounded-full bg-emerald-600 p-1.5 text-white disabled:opacity-30"><Save className="h-3.5 w-3.5" /></button>
          <button onClick={() => { if (confirm("Delete this item?")) del.mutate(); }} className="rounded-full bg-red-600 p-1.5 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

function PricingCard({ item, mappedInventoryId, invOptions }: {
  item: PriceItem;
  mappedInventoryId: string | null;
  invOptions: InvOption[];
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(item);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);
  const upsertFn = useServerFn(upsertPricingInventoryMapping);
  const removeFn = useServerFn(removePricingInventoryMapping);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").update({
        category: draft.category, name: draft.name, price_cents: draft.price_cents, unit: draft.unit, notes: draft.notes, sort_order: draft.sort_order, updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing"] }),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing"] }),
  });
  const setMapping = useMutation({
    mutationFn: async (invId: string) => {
      if (invId === "") await removeFn({ data: { pricing_item_id: item.id } });
      else await upsertFn({ data: { pricing_item_id: item.id, inventory_item_id: invId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-mappings"] }),
  });

  const groups = useMemo(() => {
    const g: Record<string, InvOption[]> = {};
    for (const o of invOptions) {
      const k = o.category ?? "Uncategorized";
      (g[k] ||= []).push(o);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [invOptions]);

  const field = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm";
  const lbl = "block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className={lbl}>Name</span>
          <input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label>
          <span className={lbl}>Category</span>
          <input className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        </label>
        <label>
          <span className={lbl}>Unit</span>
          <input className={field} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
        </label>
        <label>
          <span className={lbl}>Price ($)</span>
          <input type="number" step="0.01" className={field} value={(draft.price_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
        </label>
        <label>
          <span className={lbl}>Sort order</span>
          <input type="number" className={field} value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || "0", 10) })} />
        </label>
        <label className="col-span-2">
          <span className={lbl}>Notes</span>
          <input className={field} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
        <label className="col-span-2">
          <span className={lbl}>Linked inventory item</span>
          <select
            className={field}
            value={mappedInventoryId ?? ""}
            disabled={setMapping.isPending}
            onChange={(e) => setMapping.mutate(e.target.value)}
          >
            <option value="">— None (not linked)</option>
            {groups.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.total_owned_quantity === 0 ? " (0 owned)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!mappedInventoryId && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              <AlertTriangle className="h-3 w-3" /> Not linked
            </span>
          )}
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={() => { if (confirm("Delete this item?")) del.mutate(); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>
    </div>
  );
}
