import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const IMPORT_TYPES = [
  "pricing",
  "inventory",
  "customers",
  "quote_requests",
  "rental_events",
  "equipment_checklist",
  "other",
] as const;

type ImportType = (typeof IMPORT_TYPES)[number];

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

// ---------- shared import core ----------

type ImportRunResult = {
  import_id: string;
  imported: number;
  skipped: number;
  warnings: Array<{ row: number; message: string }>;
  errors: Array<{ row: number; message: string }>;
};

async function runImportRows(
  supabase: any,
  userId: string,
  params: {
    import_type: ImportType;
    rows: Record<string, unknown>[];
    column_mapping: Record<string, string>;
    source_id: string;
    source_file_name: string;
  },
): Promise<ImportRunResult> {
  const mapped = params.rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [srcCol, destField] of Object.entries(params.column_mapping)) {
      if (!destField) continue;
      out[destField] = row[srcCol];
    }
    return out;
  });

  const warnings: Array<{ row: number; message: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];
  let imported = 0;
  let skipped = 0;

  if (params.import_type === "pricing") {
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
  } else if (params.import_type === "inventory") {
    for (let i = 0; i < mapped.length; i++) {
      const raw = mapped[i];
      const slug = String(raw.slug ?? raw.name ?? "")
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
  } else if (params.import_type === "rental_events") {
    for (let i = 0; i < mapped.length; i++) {
      const raw = mapped[i];
      const eventDate = raw.event_date ? String(raw.event_date) : null;
      if (!eventDate) {
        errors.push({ row: i + 1, message: "Missing event_date" });
        skipped++;
        continue;
      }
      const startIso = new Date(eventDate).toISOString();
      const { error } = await supabase.from("rental_calendar_events").insert({
        title: String(raw.event_name ?? "Imported Event"),
        event_type: "rental_reserved",
        start_time: startIso,
        all_day: true,
        status: "scheduled",
        location: raw.event_location ? String(raw.event_location) : null,
        notes: raw.notes ? String(raw.notes) : null,
        color: "#1e2a5e",
        created_by: userId,
      });
      if (error) {
        errors.push({ row: i + 1, message: error.message });
        skipped++;
      } else imported++;
    }
  } else {
    warnings.push({ row: 0, message: `Import type '${params.import_type}' is logged only — no destination wiring yet.` });
    skipped = mapped.length;
  }

  const { data: imp, error: impErr } = await supabase
    .from("spreadsheet_imports")
    .insert({
      spreadsheet_source_id: params.source_id,
      import_type: params.import_type,
      status: errors.length === 0 ? "completed" : skipped === mapped.length ? "failed" : "partial",
      rows_detected: mapped.length,
      rows_imported: imported,
      rows_skipped: skipped,
      warnings,
      errors,
      column_mapping: params.column_mapping,
      source_file_name: params.source_file_name,
      imported_by: userId,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (impErr) throw new Error(impErr.message);

  return { import_id: imp.id, imported, skipped, warnings, errors };
}

// ---------- one-time upload import ----------

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

    return await runImportRows(supabase, userId, {
      import_type: data.import_type,
      rows: data.rows,
      column_mapping: data.column_mapping,
      source_id: source.id,
      source_file_name: data.source_name,
    });
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

// ---------- live connections (Google Sheets / Microsoft Excel) ----------

const GATEWAY = "https://connector-gateway.lovable.dev";

export type SheetProvider = "google_sheets" | "microsoft_excel";

function parseSpreadsheetUrl(url: string): { provider: SheetProvider; id: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname === "docs.google.com") {
      const m = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (m) return { provider: "google_sheets", id: m[1] };
    }
    if (
      u.hostname.endsWith("sharepoint.com") ||
      u.hostname.endsWith("onedrive.live.com") ||
      u.hostname.endsWith("1drv.ms") ||
      u.hostname.endsWith("office.com")
    ) {
      // We'll resolve via /shares with the full URL as the id
      return { provider: "microsoft_excel", id: url };
    }
  } catch {
    return null;
  }
  return null;
}

function gwHeaders(provider: SheetProvider): HeadersInit {
  const lov = process.env.LOVABLE_API_KEY;
  const conn = provider === "google_sheets" ? process.env.GOOGLE_SHEETS_API_KEY : process.env.MICROSOFT_EXCEL_API_KEY;
  if (!lov) throw new Error("LOVABLE_API_KEY is not configured");
  if (!conn) {
    throw new Error(
      provider === "google_sheets"
        ? "Google Sheets connector is not linked. Connect it from Admin → Data Import."
        : "Microsoft Excel connector is not linked. Connect it from Admin → Data Import.",
    );
  }
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": conn,
    "Content-Type": "application/json",
  };
}

async function gwFetch(provider: SheetProvider, path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY}/${provider}${path}`, {
    ...init,
    headers: { ...gwHeaders(provider), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${provider} gateway ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Resolve OneDrive/SharePoint share URL → driveItem id
function encodeShareUrl(url: string): string {
  const b64 = Buffer.from(url, "utf8").toString("base64");
  return "u!" + b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function resolveExcelItemId(urlOrId: string): Promise<string> {
  if (!/^https?:\/\//i.test(urlOrId)) return urlOrId;
  const enc = encodeShareUrl(urlOrId);
  const data = await gwFetch("microsoft_excel", `/shares/${enc}/driveItem?$select=id,name`);
  if (!data?.id) throw new Error("Could not resolve Excel file from URL");
  return data.id as string;
}

// List sheet/tab names
async function listSheetNames(provider: SheetProvider, idOrUrl: string): Promise<string[]> {
  if (provider === "google_sheets") {
    const data = await gwFetch("google_sheets", `/v4/spreadsheets/${idOrUrl}?fields=sheets.properties.title`);
    return (data.sheets ?? []).map((s: any) => s.properties.title);
  } else {
    const itemId = await resolveExcelItemId(idOrUrl);
    const data = await gwFetch("microsoft_excel", `/me/drive/items/${itemId}/workbook/worksheets?$select=name`);
    return (data.value ?? []).map((w: any) => w.name);
  }
}

// Fetch all rows as array of objects keyed by header
async function fetchSheetData(
  provider: SheetProvider,
  idOrUrl: string,
  sheetName: string | null,
  range: string | null,
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  let values: unknown[][] = [];
  if (provider === "google_sheets") {
    const sheets = sheetName ? [sheetName] : await listSheetNames("google_sheets", idOrUrl);
    const target = sheets[0];
    const a1 = range ? `${target}!${range}` : target;
    const data = await gwFetch("google_sheets", `/v4/spreadsheets/${idOrUrl}/values/${a1}`);
    values = (data.values ?? []) as unknown[][];
  } else {
    const itemId = await resolveExcelItemId(idOrUrl);
    const name = sheetName ?? (await listSheetNames("microsoft_excel", idOrUrl))[0];
    const path = range
      ? `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(name)}/range(address='${range}')?$select=values`
      : `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(name)}/usedRange?$select=values`;
    const data = await gwFetch("microsoft_excel", path);
    values = (data.values ?? []) as unknown[][];
  }
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = (values[0] ?? []).map((h, i) => String(h ?? `col_${i + 1}`).trim() || `col_${i + 1}`);
  const rows = values.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => (obj[h] = r?.[i] ?? ""));
    return obj;
  });
  return { headers, rows };
}

// === Preview a URL (no save) — for connection wizard ===

export const previewLiveSpreadsheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().url(),
        sheet_name: z.string().max(200).nullable().optional(),
        range: z.string().max(100).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const parsed = parseSpreadsheetUrl(data.url);
    if (!parsed) throw new Error("Unrecognized URL. Use a Google Sheets or Microsoft Excel/OneDrive link.");
    const sheets = await listSheetNames(parsed.provider, parsed.id);
    const { headers, rows } = await fetchSheetData(
      parsed.provider,
      parsed.id,
      data.sheet_name ?? null,
      data.range ?? null,
    );
    const serializable = rows.slice(0, 20).map((r) => {
      const o: Record<string, string> = {};
      for (const k of Object.keys(r)) o[k] = r[k] == null ? "" : String(r[k]);
      return o;
    });
    return {
      provider: parsed.provider,
      external_id: parsed.id,
      available_sheets: sheets,
      sheet_name: data.sheet_name ?? sheets[0] ?? null,
      headers,
      preview_rows: serializable,
      total_rows: rows.length,
    };
  });

// === Save a live connection ===

export const connectLiveSpreadsheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().url(),
        source_name: z.string().min(1).max(200),
        import_type: z.enum(IMPORT_TYPES),
        sheet_name: z.string().max(200).nullable().optional(),
        range: z.string().max(100).nullable().optional(),
        column_mapping: z.record(z.string(), z.string()),
        sync_frequency: z.enum(["manual", "hourly", "daily", "weekly"]).default("daily"),
        sync_enabled: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const parsed = parseSpreadsheetUrl(data.url);
    if (!parsed) throw new Error("Unrecognized URL. Use a Google Sheets or Microsoft Excel/OneDrive link.");

    const { data: src, error } = await supabase
      .from("spreadsheet_sources")
      .insert({
        source_type: parsed.provider === "google_sheets" ? "google_sheets" : "microsoft_excel",
        source_name: data.source_name,
        provider: parsed.provider,
        file_url: data.url,
        external_spreadsheet_id: parsed.id,
        external_sheet_name: data.sheet_name ?? null,
        sheet_range: data.range ?? null,
        import_type: data.import_type,
        column_mapping: data.column_mapping,
        sync_frequency: data.sync_frequency,
        sync_enabled: data.sync_enabled,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { source_id: src.id };
  });

// === List connected sources ===

export const listConnectedSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("spreadsheet_sources")
      .select(
        "id, source_name, provider, file_url, external_sheet_name, sheet_range, import_type, sync_frequency, sync_enabled, last_synced_at, last_sync_status, created_at",
      )
      .in("provider", ["google_sheets", "microsoft_excel"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// === Manual / cron sync of one source ===

export async function syncSourceInternal(supabase: any, userId: string, sourceId: string) {
  const { data: src, error: sErr } = await supabase
    .from("spreadsheet_sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (sErr || !src) throw new Error(sErr?.message ?? "Source not found");
  if (src.provider !== "google_sheets" && src.provider !== "microsoft_excel") {
    throw new Error("Only live connections can be synced");
  }

  const { data: log } = await supabase
    .from("spreadsheet_sync_logs")
    .insert({ spreadsheet_source_id: src.id, status: "running" })
    .select("id")
    .single();

  try {
    const { rows } = await fetchSheetData(
      src.provider as SheetProvider,
      src.external_spreadsheet_id || src.file_url,
      src.external_sheet_name,
      src.sheet_range,
    );
    const result = await runImportRows(supabase, userId, {
      import_type: (src.import_type ?? "other") as ImportType,
      rows,
      column_mapping: src.column_mapping ?? {},
      source_id: src.id,
      source_file_name: src.source_name,
    });
    await supabase
      .from("spreadsheet_sources")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: result.errors.length === 0 ? "ok" : "partial",
      })
      .eq("id", src.id);
    if (log?.id) {
      await supabase
        .from("spreadsheet_sync_logs")
        .update({
          status: result.errors.length === 0 ? "completed" : "partial",
          rows_checked: rows.length,
          rows_created: result.imported,
          rows_skipped: result.skipped,
          errors: result.errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);
    }
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("spreadsheet_sources")
      .update({ last_synced_at: new Date().toISOString(), last_sync_status: "failed" })
      .eq("id", src.id);
    if (log?.id) {
      await supabase
        .from("spreadsheet_sync_logs")
        .update({
          status: "failed",
          errors: [{ row: 0, message: msg }],
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);
    }
    throw e;
  }
}

export const syncConnectedSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ source_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    return await syncSourceInternal(context.supabase, context.userId, data.source_id);
  });

export const updateConnectedSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        source_id: z.string().uuid(),
        sync_frequency: z.enum(["manual", "hourly", "daily", "weekly"]).optional(),
        sync_enabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.sync_frequency !== undefined) patch.sync_frequency = data.sync_frequency;
    if (data.sync_enabled !== undefined) patch.sync_enabled = data.sync_enabled;
    const { error } = await context.supabase.from("spreadsheet_sources").update(patch).eq("id", data.source_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConnectedSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ source_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("spreadsheet_sources").delete().eq("id", data.source_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- helpers ----------

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
