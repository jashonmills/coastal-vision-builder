// Shared types + helpers for the rental inventory operating system.

export type ItemType =
  | "physical_rental"
  | "accessory"
  | "consumable"
  | "service_fee"
  | "cleaning_fee"
  | "delivery_fee"
  | "labor_fee"
  | "package"
  | "other";

export const ITEM_TYPES: ItemType[] = [
  "physical_rental",
  "accessory",
  "consumable",
  "service_fee",
  "cleaning_fee",
  "delivery_fee",
  "labor_fee",
  "package",
  "other",
];

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  physical_rental: "Physical rental",
  accessory: "Accessory",
  consumable: "Consumable",
  service_fee: "Service fee",
  cleaning_fee: "Cleaning fee",
  delivery_fee: "Delivery fee",
  labor_fee: "Labor fee",
  package: "Package",
  other: "Other",
};

export type QuantityStatus =
  | "available"
  | "reserved"
  | "checked_out"
  | "cleaning"
  | "maintenance"
  | "damaged_missing";

export const STATUS_LABEL: Record<QuantityStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  checked_out: "Checked out",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  damaged_missing: "Damaged / Missing",
};

export type InventoryCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category_id: string | null;
  item_type: ItemType;
  description: string | null;
  short_description: string | null;
  unit_label: string;
  default_quantity_unit: string;
  total_owned_quantity: number;
  reserved_quantity: number;
  checked_out_quantity: number;
  cleaning_quantity: number;
  maintenance_quantity: number;
  damaged_missing_quantity: number;
  replacement_cost_cents: number;
  default_rental_price_cents: number | null;
  cleaning_fee_cents: number | null;
  beach_cleaning_fee_cents: number | null;
  setup_required: boolean;
  requires_cleaning: boolean;
  requires_anchoring: boolean;
  beach_compatible: boolean;
  wind_sensitive: boolean;
  active: boolean;
  visible_to_planner: boolean;
  visible_to_chat: boolean;
  admin_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryTransaction = {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity: number;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export function computeAvailable(i: Pick<InventoryItem,
  "total_owned_quantity" | "reserved_quantity" | "checked_out_quantity" |
  "cleaning_quantity" | "maintenance_quantity" | "damaged_missing_quantity"
>): number {
  return (
    i.total_owned_quantity -
    i.reserved_quantity -
    i.checked_out_quantity -
    i.cleaning_quantity -
    i.maintenance_quantity -
    i.damaged_missing_quantity
  );
}

export type AdjustmentType =
  | "add_stock"
  | "remove_stock"
  | "adjust_count"
  | "move_status"
  | "mark_damaged"
  | "mark_missing"
  | "mark_cleaned_available"
  | "move_to_maintenance"
  | "return_from_maintenance"
  | "admin_correction";

export const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; description: string }[] = [
  { value: "add_stock", label: "Add stock", description: "Increase owned and available (new purchase, found item)." },
  { value: "remove_stock", label: "Remove stock", description: "Decrease owned and available (sold, retired)." },
  { value: "adjust_count", label: "Adjust count", description: "Set a status bucket to a corrected value (audit/recount)." },
  { value: "move_status", label: "Move between statuses", description: "Move items from one bucket to another." },
  { value: "mark_damaged", label: "Mark damaged", description: "Move items into damaged / missing." },
  { value: "mark_missing", label: "Mark missing", description: "Move items into damaged / missing." },
  { value: "mark_cleaned_available", label: "Mark cleaned / available", description: "Move items from cleaning back to available." },
  { value: "move_to_maintenance", label: "Move to maintenance", description: "Take items off the floor for service." },
  { value: "return_from_maintenance", label: "Return from maintenance", description: "Return items from maintenance to available." },
  { value: "admin_correction", label: "Admin correction", description: "Free-form correction with note (audited)." },
];

// Map AdjustmentType -> { txType, from, to }. `null` from means owned/available bucket.
type StatusKey = "owned" | QuantityStatus;
export type AdjustmentPlan = {
  txType: string;
  from: StatusKey | null;
  to: StatusKey | null;
  // delta to apply per bucket
  apply: Partial<Record<keyof InventoryItem, number>>;
};

/** Validate an adjustment and return the buckets to apply. */
export function planAdjustment(
  item: InventoryItem,
  adj: AdjustmentType,
  qty: number,
  fromStatus?: QuantityStatus,
  toStatus?: QuantityStatus,
): { ok: true; plan: AdjustmentPlan } | { ok: false; error: string } {
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: "Quantity must be a positive whole number." };
  }
  const bucketFor = (s: QuantityStatus): keyof InventoryItem => {
    switch (s) {
      case "available": return "total_owned_quantity"; // virtual; handled separately
      case "reserved": return "reserved_quantity";
      case "checked_out": return "checked_out_quantity";
      case "cleaning": return "cleaning_quantity";
      case "maintenance": return "maintenance_quantity";
      case "damaged_missing": return "damaged_missing_quantity";
    }
  };
  const avail = computeAvailable(item);

  switch (adj) {
    case "add_stock":
      return { ok: true, plan: { txType: "add_stock", from: null, to: "available",
        apply: { total_owned_quantity: qty } } };
    case "remove_stock":
      if (avail < qty) return { ok: false, error: `Only ${avail} available to remove.` };
      return { ok: true, plan: { txType: "remove_stock", from: "available", to: null,
        apply: { total_owned_quantity: -qty } } };
    case "mark_damaged":
    case "mark_missing": {
      const from = fromStatus ?? "available";
      if (from === "available") {
        if (avail < qty) return { ok: false, error: `Only ${avail} available.` };
        return { ok: true, plan: { txType: adj, from: "available", to: "damaged_missing",
          apply: { damaged_missing_quantity: qty } } };
      }
      const k = bucketFor(from);
      const cur = Number(item[k] ?? 0);
      if (cur < qty) return { ok: false, error: `Only ${cur} in ${STATUS_LABEL[from]}.` };
      return { ok: true, plan: { txType: adj, from, to: "damaged_missing",
        apply: { [k]: -qty, damaged_missing_quantity: qty } as Partial<Record<keyof InventoryItem, number>> } };
    }
    case "mark_cleaned_available":
      if (item.cleaning_quantity < qty) return { ok: false, error: `Only ${item.cleaning_quantity} in cleaning.` };
      return { ok: true, plan: { txType: "mark_cleaned_available", from: "cleaning", to: "available",
        apply: { cleaning_quantity: -qty } } };
    case "move_to_maintenance": {
      const from = fromStatus ?? "available";
      if (from === "available") {
        if (avail < qty) return { ok: false, error: `Only ${avail} available.` };
        return { ok: true, plan: { txType: "move_to_maintenance", from: "available", to: "maintenance",
          apply: { maintenance_quantity: qty } } };
      }
      const k = bucketFor(from);
      const cur = Number(item[k] ?? 0);
      if (cur < qty) return { ok: false, error: `Only ${cur} in ${STATUS_LABEL[from]}.` };
      return { ok: true, plan: { txType: "move_to_maintenance", from, to: "maintenance",
        apply: { [k]: -qty, maintenance_quantity: qty } as Partial<Record<keyof InventoryItem, number>> } };
    }
    case "return_from_maintenance":
      if (item.maintenance_quantity < qty) return { ok: false, error: `Only ${item.maintenance_quantity} in maintenance.` };
      return { ok: true, plan: { txType: "return_from_maintenance", from: "maintenance", to: "available",
        apply: { maintenance_quantity: -qty } } };
    case "move_status": {
      if (!fromStatus || !toStatus) return { ok: false, error: "Pick both from and to status." };
      if (fromStatus === toStatus) return { ok: false, error: "From and to must differ." };
      // Available is virtual; moving FROM available means decreasing owned-by-bucket headroom by
      // increasing the target bucket only. Moving TO available means decreasing the source bucket.
      if (fromStatus === "available" && toStatus !== "available") {
        if (avail < qty) return { ok: false, error: `Only ${avail} available.` };
        const tk = bucketFor(toStatus);
        return { ok: true, plan: { txType: "move_status", from: "available", to: toStatus,
          apply: { [tk]: qty } as Partial<Record<keyof InventoryItem, number>> } };
      }
      if (toStatus === "available" && fromStatus !== "available") {
        const fk = bucketFor(fromStatus);
        const cur = Number(item[fk] ?? 0);
        if (cur < qty) return { ok: false, error: `Only ${cur} in ${STATUS_LABEL[fromStatus]}.` };
        return { ok: true, plan: { txType: "move_status", from: fromStatus, to: "available",
          apply: { [fk]: -qty } as Partial<Record<keyof InventoryItem, number>> } };
      }
      const fk = bucketFor(fromStatus);
      const tk = bucketFor(toStatus);
      const cur = Number(item[fk] ?? 0);
      if (cur < qty) return { ok: false, error: `Only ${cur} in ${STATUS_LABEL[fromStatus]}.` };
      return { ok: true, plan: { txType: "move_status", from: fromStatus, to: toStatus,
        apply: { [fk]: -qty, [tk]: qty } as Partial<Record<keyof InventoryItem, number>> } };
    }
    case "adjust_count": {
      if (!toStatus) return { ok: false, error: "Choose which bucket to set." };
      if (toStatus === "available") return { ok: false, error: "Available is computed, not set directly." };
      const k = bucketFor(toStatus);
      // qty is the new absolute value
      const delta = qty - Number(item[k] ?? 0);
      return { ok: true, plan: { txType: "adjust_count", from: null, to: toStatus,
        apply: { [k]: delta } as Partial<Record<keyof InventoryItem, number>> } };
    }
    case "admin_correction":
      return { ok: true, plan: { txType: "admin_correction", from: fromStatus ?? null, to: toStatus ?? null, apply: {} } };
  }
}
