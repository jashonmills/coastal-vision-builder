import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Pencil,
  Box,
  Boxes,
  AlertTriangle,
  Wrench,
  Sparkles,
  PackageCheck,
  Trash2,
  X,
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({ meta: [{ title: "Inventory Management | Admin" }] }),
  component: InventoryAdminPage,
});

type MasterItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sku: string | null;
  unit_type: string;
  total_quantity: number;
  reserved_quantity: number;
  checked_out_quantity: number;
  cleaning_quantity: number;
  maintenance_quantity: number;
  replacement_cost_cents: number;
  rental_price_cents: number | null;
  requires_cleaning: boolean;
  beach_cleaning_fee_applicable: boolean;
  requires_anchoring: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  "Tents / Canopies",
  "Canopy Accessories",
  "Tables",
  "Chairs",
  "Dance Floors",
  "Staging",
  "Audio / PA",
  "Bars / Food Service",
  "Anchoring / Weights",
  "Delivery / Fees",
  "Cleaning Fees",
  "Miscellaneous",
];

const available = (i: MasterItem) =>
  Math.max(
    0,
    i.total_quantity -
      i.reserved_quantity -
      i.checked_out_quantity -
      i.cleaning_quantity -
      i.maintenance_quantity,
  );

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
        subtitle="Track rental stock, reservations, and check-in/check-out status."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <InventoryDashboard />
      </section>
    </SiteLayout>
  );
}

function InventoryDashboard() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-inventory-master"],
    queryFn: async (): Promise<MasterItem[]> => {
      const { data, error } = await supabase
        .from("inventory_master_items" as never) as any
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as MasterItem[];
    },
  });

  const summary = useMemo(() => {
    const total = items.reduce((s, i) => s + i.total_quantity, 0);
    const checkedOut = items.reduce((s, i) => s + i.checked_out_quantity, 0);
    const cleaning = items.reduce((s, i) => s + i.cleaning_quantity, 0);
    const maintenance = items.reduce((s, i) => s + i.maintenance_quantity, 0);
    const reserved = items.reduce((s, i) => s + i.reserved_quantity, 0);
    const lowAvail = items.filter((i) => i.active && available(i) <= Math.max(1, Math.floor(i.total_quantity * 0.1))).length;
    return { total, checkedOut, cleaning, maintenance, reserved, lowAvail };
  }, [items]);

  const filtered = useMemo(
    () => (filterCat ? items.filter((i) => i.category === filterCat) : items),
    [items, filterCat],
  );

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_master_items" as never) as any.delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory-master"] }),
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryCard icon={<Boxes className="h-5 w-5" />} label="Total items" value={items.length} />
        <SummaryCard icon={<Box className="h-5 w-5" />} label="Total units" value={summary.total} />
        <SummaryCard icon={<PackageCheck className="h-5 w-5" />} label="Reserved" value={summary.reserved} />
        <SummaryCard icon={<Box className="h-5 w-5" />} label="Checked out" value={summary.checkedOut} />
        <SummaryCard icon={<Sparkles className="h-5 w-5" />} label="Needs cleaning" value={summary.cleaning} />
        <SummaryCard icon={<Wrench className="h-5 w-5" />} label="Maintenance" value={summary.maintenance} />
      </div>

      {summary.lowAvail > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/50 p-4 text-sm text-amber-900 dark:bg-amber-900/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {summary.lowAvail} item{summary.lowAvail === 1 ? "" : "s"} have low availability. Review before
            accepting new reservations.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
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
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Available</th>
              <th className="px-3 py-2 text-right">Reserved</th>
              <th className="px-3 py-2 text-right">Out</th>
              <th className="px-3 py-2 text-right">Cleaning</th>
              <th className="px-3 py-2 text-right">Maint.</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-muted-foreground">
                  No items yet. Click <strong>Add item</strong> to get started.
                </td>
              </tr>
            )}
            {filtered.map((i) => {
              const avail = available(i);
              const low = i.active && avail <= Math.max(1, Math.floor(i.total_quantity * 0.1));
              return (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{i.name}</div>
                    {i.sku && <div className="text-xs text-muted-foreground">SKU: {i.sku}</div>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{i.category}</td>
                  <td className="px-3 py-2 text-right">{i.total_quantity}</td>
                  <td className={`px-3 py-2 text-right font-medium ${low ? "text-amber-600" : ""}`}>
                    {avail}
                  </td>
                  <td className="px-3 py-2 text-right">{i.reserved_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.checked_out_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.cleaning_quantity}</td>
                  <td className="px-3 py-2 text-right">{i.maintenance_quantity}</td>
                  <td className="px-3 py-2">
                    {i.active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(i)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${i.name}"? This cannot be undone.`)) {
                            deleteMut.mutate(i.id);
                          }
                        }}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <ItemEditor
          item={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 font-serif text-2xl text-primary">{value}</div>
    </div>
  );
}

function ItemEditor({ item, onClose }: { item: MasterItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? CATEGORIES[0],
    description: item?.description ?? "",
    sku: item?.sku ?? "",
    unit_type: item?.unit_type ?? "each",
    total_quantity: item?.total_quantity ?? 0,
    reserved_quantity: item?.reserved_quantity ?? 0,
    checked_out_quantity: item?.checked_out_quantity ?? 0,
    cleaning_quantity: item?.cleaning_quantity ?? 0,
    maintenance_quantity: item?.maintenance_quantity ?? 0,
    replacement_cost_cents: item?.replacement_cost_cents ?? 0,
    rental_price_cents: item?.rental_price_cents ?? null,
    requires_cleaning: item?.requires_cleaning ?? false,
    beach_cleaning_fee_applicable: item?.beach_cleaning_fee_applicable ?? false,
    requires_anchoring: item?.requires_anchoring ?? false,
    notes: item?.notes ?? "",
    active: item?.active ?? true,
  });
  const [err, setErr] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        sku: form.sku || null,
        description: form.description || null,
        notes: form.notes || null,
      };
      if (item) {
        const { error } = await supabase
          .from("inventory_master_items" as never) as any
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_master_items" as never) as any.insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory-master"] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-primary">{item ? "Edit item" : "Add inventory item"}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            saveMut.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Name" required>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input" />
          </Field>
          <Field label="Unit type">
            <input
              value={form.unit_type}
              onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Description" wide>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
            />
          </Field>

          <Field label="Total quantity">
            <NumberInput value={form.total_quantity} onChange={(v) => setForm({ ...form, total_quantity: v })} />
          </Field>
          <Field label="Reserved">
            <NumberInput
              value={form.reserved_quantity}
              onChange={(v) => setForm({ ...form, reserved_quantity: v })}
            />
          </Field>
          <Field label="Checked out">
            <NumberInput
              value={form.checked_out_quantity}
              onChange={(v) => setForm({ ...form, checked_out_quantity: v })}
            />
          </Field>
          <Field label="Cleaning">
            <NumberInput
              value={form.cleaning_quantity}
              onChange={(v) => setForm({ ...form, cleaning_quantity: v })}
            />
          </Field>
          <Field label="Maintenance">
            <NumberInput
              value={form.maintenance_quantity}
              onChange={(v) => setForm({ ...form, maintenance_quantity: v })}
            />
          </Field>

          <Field label="Replacement cost (cents)">
            <NumberInput
              value={form.replacement_cost_cents}
              onChange={(v) => setForm({ ...form, replacement_cost_cents: v })}
            />
          </Field>
          <Field label="Rental price (cents, optional)">
            <NumberInput
              value={form.rental_price_cents ?? 0}
              onChange={(v) => setForm({ ...form, rental_price_cents: v || null })}
            />
          </Field>

          <Field label="Flags" wide>
            <div className="flex flex-wrap gap-4 text-sm">
              <Check label="Requires cleaning" checked={form.requires_cleaning} onChange={(v) => setForm({ ...form, requires_cleaning: v })} />
              <Check label="Beach cleaning fee" checked={form.beach_cleaning_fee_applicable} onChange={(v) => setForm({ ...form, beach_cleaning_fee_applicable: v })} />
              <Check label="Requires anchoring" checked={form.requires_anchoring} onChange={(v) => setForm({ ...form, requires_anchoring: v })} />
              <Check label="Active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </Field>

          <Field label="Notes" wide>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input"
            />
          </Field>

          {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}

          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {item ? "Save changes" : "Create item"}
            </button>
          </div>
        </form>

        <style>{`.input{width:100%;border:1px solid hsl(var(--border));background:hsl(var(--background));border-radius:0.375rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.input:focus{border-color:var(--gold)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children, required, wide }: { label: string; children: React.ReactNode; required?: boolean; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value || "0", 10) || 0)}
      className="input"
    />
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
