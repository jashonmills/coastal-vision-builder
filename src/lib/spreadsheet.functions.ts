import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { upsertCalendarEvent } from "./scheduler.functions";

export const IMPORT_TYPES = [
  "pricing",
  "inventory",
  "customers",
  "quote_requests",
  "rental_events",
  "equipment_checklist",
  "other",
] as const;

const PricingRowSchema = z.object({
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  price_cents: z.number().int().min(0),
  unit: z.string().min(1).max(50).default("each"),
  notes: z.string().max(1000).nullable().optional(),
  sort_order: z.number().int().optional().default(0),
});

const InventoryRowSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  category_slug: z.string().max(100).optional().nullable(),
  sku: z.string().max(100).nullable().optional(),
  item_type: z.string().max(50).default("physical_rental"),
  total_owned_quantity: z.number().int().min(0).default(0),
  default_rental_price_cents: z.number().int().min(0).nullable().optional(),
  unit_label: z.string().max(50).default("each"),
  short_description: z.string().max(500).nullable().optional(),
  admin_notes: z.string().max(2000).nullable().optional(),
});

const ImportSchema = z.object({
  import_type: z.enum(IMPORT_TYPES),
  source_name: z.string().min(1).max(200),
  source_type: z.enum(["csv_upload", "xlsx_upload"]),
  column_mapping: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.unknown())).max(5000),
});

export const importSpreadsheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Create source record
    const { data: source, error: srcErr } = await supabase
      .from("spreadsheet_sources")
      .insert({
        source_type: data.source_type,
        source_name: data.source_name,
        provider: "upload",
        created_by: userId,
      })
      .select("id")
      .single();
    if (srcErr) throw new Error(srcErr.message);

    // 2. Apply column mapping (raw header -> canonical field)
    const mapped = data.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [srcCol, destField] of Object.entries(data.column_mapping)) {
        if (!destField) continue;
        out[destField] = row[srcCol];
      }
      return out;
    });

    const warnings: Array<{ row: number; message: string }> = [];
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;
    let skipped = 0;

    if (data.import_type === "pricing") {
      for (let i = 0; i < mapped.length; i++) {
        const raw = mapped[i];
        const parsed = PricingRowSchema.safeParse({
          ...raw,
          price_cents: toCents(raw.price_cents ?? raw.price),
          sort_order: toInt(raw.sort_order),
        });
        if (!parsed.success) {
          errors.push({ row: i + 1, message: parsed.error.issues.map((x) => x.message).join("; ") });
          skipped++;
          continue;
        }
        const { error } = await supabase.from("pricing_items").insert(parsed.data);
        if (error) {
          errors.push({ row: i + 1, message: error.message });
          skipped++;
        } else imported++;
      }
    } else if (data.import_type === "inventory") {
      for (let i = 0; i < mapped.length; i++) {
        const raw = mapped[i];
        const slug = String(raw.slug ?? raw.name ?? "")
          .toString()
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const parsed = InventoryRowSchema.safeParse({
          ...raw,
          slug,
          total_owned_quantity: toInt(raw.total_owned_quantity ?? raw.owned_quantity),
          default_rental_price_cents: raw.default_rental_price_cents
            ? toCents(raw.default_rental_price_cents)
            : raw.price
              ? toCents(raw.price)
              : null,
        });
        if (!parsed.success) {
          errors.push({ row: i + 1, message: parsed.error.issues.map((x) => x.message).join("; ") });
          skipped++;
          continue;
        }
        const { category_slug, ...itemData } = parsed.data;
        let category_id: string | null = null;
        if (category_slug) {
          const { data: cat } = await supabase
            .from("inventory_categories")
            .select("id")
            .eq("slug", category_slug)
            .maybeSingle();
          category_id = cat?.id ?? null;
          if (!cat) warnings.push({ row: i + 1, message: `Unknown category: ${category_slug}` });
        }
        const { error } = await supabase.from("inventory_items").insert({ ...itemData, category_id });
        if (error) {
          errors.push({ row: i + 1, message: error.message });
          skipped++;
        } else imported++;
      }
    } else if (data.import_type === "rental_events") {
      for (let i = 0; i < mapped.length; i++) {
        const raw = mapped[i];
        try {
          await upsertCalendarEvent({
            data: {
              title: String(raw.event_name ?? "Imported Event"),
              event_type: "rental_reserved",
              start_time: String(raw.event_date),
              location: raw.event_location ? String(raw.event_location) : null,
              notes: raw.notes ? String(raw.notes) : null,
            },
            context,
          });
          imported++;
        } catch (e) {
          errors.push({ row: i + 1, message: e instanceof Error ? e.message : "Unknown error" });
          skipped++;
        }
      }
    } else {
      warnings.push({ row: 0, message: `Import type '${data.import_type}' is logged only — no destination wiring yet.` });
      skipped = mapped.length;
    }

    // 3. Log the import
    const { data: imp, error: impErr } = await supabase
      .from("spreadsheet_imports")
      .insert({
        spreadsheet_source_id: source.id,
        import_type: data.import_type,
        status: errors.length === 0 ? "completed" : skipped === mapped.length ? "failed" : "partial",
        rows_detected: mapped.length,
        rows_imported: imported,
        rows_skipped: skipped,
        warnings,
        errors,
        column_mapping: data.column_mapping,
        source_file_name: data.source_name,
        imported_by: userId,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (impErr) throw new Error(impErr.message);

    return {
      import_id: imp.id,
      imported,
      skipped,
      warnings,
      errors,
    };
  });

export const listImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("spreadsheet_imports")
      .select("id, import_type, status, rows_detected, rows_imported, rows_skipped, source_file_name, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

function toCents(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function toInt(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}
