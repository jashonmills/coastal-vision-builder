import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Save, Sparkles, Wrench, AlertTriangle, Archive } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import {
  computeAvailable, ITEM_TYPE_LABEL, ITEM_TYPES, type InventoryCategory,
  type InventoryItem, type InventoryTransaction, type ItemType, STATUS_LABEL,
} from "@/lib/inventory";
import { AdjustQuantityModal } from "@/components/admin/AdjustQuantityModal";
import { AdminTabs } from "./admin.quote-requests";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

export const Route = createFileRoute("/admin/inventory_/$id")({
  head: () => ({ meta: [{ title: "Inventory Item | Admin" }] }),
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", search: { next: `/admin/inventory/${id}` } as never });
    }
  }, [user, authLoading, navigate, id]);

  if (authLoading || roleLoading) {
    return <SiteLayout><Loader2 className="mx-auto my-24 h-8 w-8 animate-spin text-primary" /></SiteLayout>;
  }
  if (!user || !isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-serif text-2xl text-primary">Admin access required</h1>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
        <AdminTabs active="inventory" />
        <Link to="/admin/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to inventory
        </Link>
        <ItemEditor id={id} />
      </section>
    </SiteLayout>
  );
}

function ItemEditor({ id }: { id: string }) {
  const qc = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState<null | undefined>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ["admin-inventory-item", id],
    queryFn: async (): Promise<InventoryItem | null> => {
      const { data, error } = await db.from("inventory_items").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-inventory-categories"],
    queryFn: async (): Promise<InventoryCategory[]> => {
      const { data, error } = await db.from("inventory_categories").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["admin-inventory-tx", id],
    queryFn: async (): Promise<InventoryTransaction[]> => {
      const { data, error } = await db.from("inventory_transactions")
        .select("*").eq("inventory_item_id", id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<InventoryItem | null>(null);
  useEffect(() => { if (item) setForm(item); }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const patch = {
        name: form.name, sku: form.sku, category_id: form.category_id, item_type: form.item_type,
        description: form.description, short_description: form.short_description,
        unit_label: form.unit_label,
        replacement_cost_cents: form.replacement_cost_cents,
        default_rental_price_cents: form.default_rental_price_cents,
        cleaning_fee_cents: form.cleaning_fee_cents,
        beach_cleaning_fee_cents: form.beach_cleaning_fee_cents,
        setup_required: form.setup_required,
        requires_cleaning: form.requires_cleaning,
        requires_anchoring: form.requires_anchoring,
        beach_compatible: form.beach_compatible,
        wind_sensitive: form.wind_sensitive,
        active: form.active,
        visible_to_planner: form.visible_to_planner,
        visible_to_chat: form.visible_to_chat,
        admin_notes: form.admin_notes,
      };
      const { error } = await db.from("inventory_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory-item", id] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-items"] });
    },
  });

  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("inventory_items")
        .update({ active: false, deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory-item", id] }),
  });

  if (isLoading) return <Loader2 className="mx-auto my-12 h-6 w-6 animate-spin text-primary" />;
  if (!item || !form) {
    return <p className="mt-6 text-muted-foreground">Item not found.</p>;
  }

  const av = computeAvailable(form);

  return (
    <div className="mt-4 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-primary">{item.name}</h1>
          <p className="text-sm text-muted-foreground">
            {ITEM_TYPE_LABEL[item.item_type]} · {categories.find((c) => c.id === item.category_id)?.name ?? "Uncategorized"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAdjustOpen(undefined)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Adjust quantity
          </button>
          {!item.deleted_at && (
            <button onClick={() => { if (confirm("Archive this item?")) archive.mutate(); }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <Archive className="h-4 w-4" /> Archive
            </button>
          )}
        </div>
      </header>

      {/* Quantity breakdown */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <QtyCard label="Owned" value={form.total_owned_quantity} />
        <QtyCard label="Available" value={av} tone={av < 0 ? "error" : "primary"} />
        <QtyCard label="Reserved" value={form.reserved_quantity} />
        <QtyCard label="Checked out" value={form.checked_out_quantity} />
        <QtyCard label="Cleaning" value={form.cleaning_quantity} icon={<Sparkles className="h-4 w-4" />} />
        <QtyCard label="Maintenance" value={form.maintenance_quantity} icon={<Wrench className="h-4 w-4" />} />
        <QtyCard label="Damaged/Missing" value={form.damaged_missing_quantity} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      {av < 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Available is negative. Reconcile buckets via Adjust Quantity → Admin correction.
        </div>
      )}

      {/* Form sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Details">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="SKU"><input className="input" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value || null })} /></Field>
          <Field label="Category">
            <select className="input" value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
              <option value="">(uncategorized)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Item type">
            <select className="input" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as ItemType })}>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Unit label"><input className="input" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} /></Field>
          <Field label="Short description"><input className="input" value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value || null })} /></Field>
          <Field label="Description"><textarea className="input" rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value || null })} /></Field>
        </Section>

        <Section title="Pricing & fees (cents)">
          <Field label="Replacement cost"><NumInput value={form.replacement_cost_cents} onChange={(v) => setForm({ ...form, replacement_cost_cents: v })} /></Field>
          <Field label="Default rental price"><NumInput value={form.default_rental_price_cents ?? 0} onChange={(v) => setForm({ ...form, default_rental_price_cents: v })} /></Field>
          <Field label="Cleaning fee"><NumInput value={form.cleaning_fee_cents ?? 0} onChange={(v) => setForm({ ...form, cleaning_fee_cents: v })} /></Field>
          <Field label="Beach cleaning fee"><NumInput value={form.beach_cleaning_fee_cents ?? 0} onChange={(v) => setForm({ ...form, beach_cleaning_fee_cents: v })} /></Field>
        </Section>

        <Section title="Rules">
          <Check label="Setup required" checked={form.setup_required} onChange={(v) => setForm({ ...form, setup_required: v })} />
          <Check label="Requires cleaning" checked={form.requires_cleaning} onChange={(v) => setForm({ ...form, requires_cleaning: v })} />
          <Check label="Requires anchoring" checked={form.requires_anchoring} onChange={(v) => setForm({ ...form, requires_anchoring: v })} />
          <Check label="Beach compatible" checked={form.beach_compatible} onChange={(v) => setForm({ ...form, beach_compatible: v })} />
          <Check label="Wind sensitive" checked={form.wind_sensitive} onChange={(v) => setForm({ ...form, wind_sensitive: v })} />
        </Section>

        <Section title="Visibility & status">
          <Check label="Active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          <Check label="Visible to planner" checked={form.visible_to_planner} onChange={(v) => setForm({ ...form, visible_to_planner: v })} />
          <Check label="Visible to chat" checked={form.visible_to_chat} onChange={(v) => setForm({ ...form, visible_to_chat: v })} />
          <Field label="Admin notes"><textarea className="input" rows={3} value={form.admin_notes ?? ""} onChange={(e) => setForm({ ...form, admin_notes: e.target.value || null })} /></Field>
        </Section>
      </div>

      <div className="flex justify-end">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </div>

      {/* Upcoming reservations placeholder */}
      <Section title="Upcoming reservations">
        <p className="text-sm text-muted-foreground">
          Reservations appear here once the rental events module ships. They will roll up from approved quotes.
        </p>
      </Section>

      {/* Transaction history */}
      <Section title="Transaction history">
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet. Adjusting quantity will log entries here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2">When</th><th>Type</th><th>Qty</th><th>From</th><th>To</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-1.5 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                    <td>{t.transaction_type}</td>
                    <td>{t.quantity}</td>
                    <td className="text-xs text-muted-foreground">{t.from_status ? STATUS_LABEL[t.from_status as keyof typeof STATUS_LABEL] ?? t.from_status : "—"}</td>
                    <td className="text-xs text-muted-foreground">{t.to_status ? STATUS_LABEL[t.to_status as keyof typeof STATUS_LABEL] ?? t.to_status : "—"}</td>
                    <td className="text-xs text-muted-foreground">{t.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {adjustOpen === undefined && <AdjustQuantityModal item={item} onClose={() => setAdjustOpen(null)} />}
    </div>
  );
}

function QtyCard({ label, value, tone = "default", icon }: { label: string; value: number; tone?: "default" | "primary" | "error"; icon?: React.ReactNode }) {
  const cls = tone === "error" ? "text-destructive" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 font-serif text-2xl ${cls}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-serif text-lg text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" className="input" value={value} onChange={(e) => onChange(parseInt(e.target.value || "0", 10))} />;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
