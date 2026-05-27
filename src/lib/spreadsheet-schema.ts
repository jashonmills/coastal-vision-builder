// Canonical destination fields per import type (used by the column-mapping UI)
export const FIELD_SCHEMAS: Record<string, { fields: Array<{ key: string; label: string; required?: boolean }> }> = {
  pricing: {
    fields: [
      { key: "category", label: "Category", required: true },
      { key: "name", label: "Name", required: true },
      { key: "price", label: "Price ($)", required: true },
      { key: "unit", label: "Unit" },
      { key: "notes", label: "Notes" },
      { key: "sort_order", label: "Sort order" },
    ],
  },
  inventory: {
    fields: [
      { key: "name", label: "Item name", required: true },
      { key: "category_slug", label: "Category slug" },
      { key: "sku", label: "SKU" },
      { key: "item_type", label: "Item type" },
      { key: "total_owned_quantity", label: "Owned quantity" },
      { key: "default_rental_price_cents", label: "Rental price (cents)" },
      { key: "price", label: "Rental price ($)" },
      { key: "unit_label", label: "Unit" },
      { key: "short_description", label: "Short description" },
      { key: "admin_notes", label: "Admin notes" },
    ],
  },
  customers: {
    fields: [
      { key: "name", label: "Customer name", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "notes", label: "Notes" },
    ],
  },
  quote_requests: {
    fields: [
      { key: "customer_name", label: "Customer name", required: true },
      { key: "customer_email", label: "Email", required: true },
      { key: "event_type", label: "Event type" },
      { key: "event_date", label: "Event date" },
      { key: "guest_count", label: "Guest count" },
      { key: "event_location", label: "Location" },
    ],
  },
  rental_events: {
    fields: [
      { key: "event_name", label: "Event name", required: true },
      { key: "customer_name", label: "Customer name" },
      { key: "event_date", label: "Event date", required: true },
      { key: "event_location", label: "Location" },
      { key: "guest_count", label: "Guest count" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ],
  },
  equipment_checklist: {
    fields: [
      { key: "item_name", label: "Item", required: true },
      { key: "quantity", label: "Quantity" },
      { key: "category", label: "Category" },
      { key: "notes", label: "Notes" },
    ],
  },
  other: { fields: [] },
};

export const IMPORT_TYPE_LABELS: Record<string, string> = {
  pricing: "Pricing Catalog",
  inventory: "Operational Inventory",
  customers: "Customers",
  quote_requests: "Quote Requests",
  rental_events: "Rental Events",
  equipment_checklist: "Equipment Checklist",
  other: "Other / Custom",
};
