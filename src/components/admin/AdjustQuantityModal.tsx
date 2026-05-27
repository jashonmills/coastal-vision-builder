import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ADJUSTMENT_TYPES,
  STATUS_LABEL,
  type AdjustmentType,
  type InventoryItem,
  type QuantityStatus,
  planAdjustment,
} from "@/lib/inventory";

// Types for the new master/transaction tables aren't in generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

const STATUS_OPTIONS: QuantityStatus[] = [
  "available", "reserved", "checked_out", "cleaning", "maintenance", "damaged_missing",
];

export function AdjustQuantityModal({
  item,
  onClose,
  initialType = "add_stock",
}: {
  item: InventoryItem;
  onClose: () => void;
  initialType?: AdjustmentType;
}) {
  const qc = useQueryClient();
  const [adjType, setAdjType] = useState<AdjustmentType>(initialType);
  const [qty, setQty] = useState<number>(1);
  const [fromStatus, setFromStatus] = useState<QuantityStatus>("available");
  const [toStatus, setToStatus] = useState<QuantityStatus>("cleaning");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setErr(null); }, [adjType, qty, fromStatus, toStatus]);

  const meta = useMemo(() => ADJUSTMENT_TYPES.find((t) => t.value === adjType)!, [adjType]);

  const showFrom = ["move_status", "mark_damaged", "mark_missing", "move_to_maintenance", "admin_correction"].includes(adjType);
  const showTo = ["move_status", "adjust_count", "admin_correction"].includes(adjType);

  const submit = useMutation({
    mutationFn: async () => {
      const planned = planAdjustment(item, adjType, qty, showFrom ? fromStatus : undefined, showTo ? toStatus : undefined);
      if (!planned.ok) throw new Error(planned.error);
      const { plan } = planned;

      // Build update payload by adding deltas to current values.
      const update: Record<string, number> = {};
      for (const [k, delta] of Object.entries(plan.apply)) {
        const cur = Number((item as unknown as Record<string, number>)[k] ?? 0);
        update[k] = cur + (delta as number);
        if (update[k] < 0) update[k] = 0;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { error: upErr } = await db.from("inventory_items").update(update).eq("id", item.id);
      if (upErr) throw upErr;

      const { error: txErr } = await db.from("inventory_transactions").insert({
        inventory_item_id: item.id,
        transaction_type: plan.txType,
        quantity: qty,
        from_status: plan.from,
        to_status: plan.to,
        notes: notes || null,
        created_by: userData.user?.id ?? null,
      });
      if (txErr) throw txErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inventory-items"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-item", item.id] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-tx", item.id] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4">
      <div className="mt-12 w-full max-w-lg rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-primary">Adjust inventory quantity</h3>
            <p className="text-sm text-muted-foreground">{item.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          className="space-y-4"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Adjustment type</span>
            <select
              value={adjType}
              onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">{meta.description}</span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              {adjType === "adjust_count" ? "New count" : "Quantity"}
            </span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value || "0", 10))}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>

          {showFrom && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">From status</span>
              <select
                value={fromStatus}
                onChange={(e) => setFromStatus(e.target.value as QuantityStatus)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
          )}

          {showTo && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">To status</span>
              <select
                value={toStatus}
                onChange={(e) => setToStatus(e.target.value as QuantityStatus)}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              >
                {STATUS_OPTIONS.filter((s) => adjType !== "adjust_count" || s !== "available").map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes (optional)</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
              maxLength={500}
            />
          </label>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
