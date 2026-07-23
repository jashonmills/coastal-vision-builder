import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, FileSpreadsheet, RefreshCw, Trash2, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { SiteLayout, PageHero } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  importSpreadsheet,
  listImports,
  previewLiveSpreadsheet,
  connectLiveSpreadsheet,
  listConnectedSources,
  syncConnectedSource,
  updateConnectedSource,
  deleteConnectedSource,
} from "@/lib/spreadsheet.functions";
import { FIELD_SCHEMAS, IMPORT_TYPE_LABELS } from "@/lib/spreadsheet-schema";

export const Route = createFileRoute("/admin/data-import")({
  head: () => ({ meta: [{ title: "Data Import | Admin" }] }),
  component: DataImportPage,
});

type ParsedFile = {
  fileName: string;
  sourceType: "csv_upload" | "xlsx_upload";
  headers: string[];
  rows: Record<string, unknown>[];
};

function DataImportPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin/data-import" } as never });
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading)
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  if (!user || !isAdmin)
    return <SiteLayout><div className="p-12 text-center text-muted-foreground">Admin access required.</div></SiteLayout>;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Spreadsheet Import & Sync" subtitle="Bring your existing inventory, pricing, customer, or rental spreadsheets into the system." />
      <section className="mx-auto max-w-6xl py-8">
        <ImportWorkflow />
        <ConnectLiveSection />
        <ImportHistory />
      </section>
    </SiteLayout>
  );
}

function ImportWorkflow() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [importType, setImportType] = useState<keyof typeof FIELD_SCHEMAS>("pricing");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ imported: number; skipped: number; warnings: { row: number; message: string }[]; errors: { row: number; message: string }[] } | null>(null);
  const qc = useQueryClient();
  const importFn = useServerFn(importSpreadsheet);

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No file");
      return await importFn({
        data: {
          import_type: importType,
          source_name: parsed.fileName,
          source_type: parsed.sourceType,
          column_mapping: mapping,
          rows: parsed.rows,
        },
      });
    },
    onSuccess: (r) => {
      setResult({ imported: r.imported, skipped: r.skipped, warnings: r.warnings, errors: r.errors });
      qc.invalidateQueries({ queryKey: ["spreadsheet-imports"] });
    },
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const sourceType = f.name.toLowerCase().endsWith(".csv") ? "csv_upload" : "xlsx_upload";
    setParsed({ fileName: f.name, sourceType, headers, rows });
    // Auto-map matching column names
    const initialMap: Record<string, string> = {};
    const fields = FIELD_SCHEMAS[importType].fields.map((f) => f.key);
    for (const h of headers) {
      const lower = h.toLowerCase().replace(/\s+/g, "_");
      const match = fields.find((f) => f === lower);
      if (match) initialMap[h] = match;
    }
    setMapping(initialMap);
  }

  const fields = FIELD_SCHEMAS[importType].fields;
  const requiredMissing = fields
    .filter((f) => f.required)
    .filter((f) => !Object.values(mapping).includes(f.key))
    .map((f) => f.label);

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 font-serif text-xl text-primary">1. Upload Spreadsheet</h2>
        <p className="mb-4 text-sm text-muted-foreground">CSV and Excel files supported.</p>
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          <Upload className="h-4 w-4" /> Upload Spreadsheet
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
        {parsed && <p className="mt-3 text-sm text-foreground"><FileSpreadsheet className="mr-1 inline h-4 w-4" /> {parsed.fileName} — {parsed.rows.length} rows, {parsed.headers.length} columns</p>}
      </div>

      {/* Import type */}
      {parsed && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-serif text-xl text-primary">2. Import Type</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(Object.keys(IMPORT_TYPE_LABELS) as (keyof typeof FIELD_SCHEMAS)[]).map((k) => (
              <button key={k} onClick={() => { setImportType(k); setMapping({}); }}
                className={`rounded-lg border px-3 py-2 text-sm ${importType === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary"}`}>
                {IMPORT_TYPE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {parsed && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-serif text-xl text-primary">3. Data Preview <span className="text-sm text-muted-foreground">(first 20 rows)</span></h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-secondary/50"><tr>{parsed.headers.map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {parsed.rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {parsed.headers.map((h) => <td key={h} className="px-2 py-1">{String(r[h] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mapping */}
      {parsed && fields.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-serif text-xl text-primary">4. Column Mapping</h2>
          <p className="mb-4 text-sm text-muted-foreground">Map each spreadsheet column to a system field. Leave blank to skip.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {parsed.headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="w-1/2 truncate font-mono text-xs">{h}</span>
                <span className="text-muted-foreground">→</span>
                <select value={mapping[h] ?? ""} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })} className="flex-1 rounded border px-2 py-1 text-sm">
                  <option value="">— Skip —</option>
                  {fields.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                </select>
              </div>
            ))}
          </div>
          {requiredMissing.length > 0 && (
            <p className="mt-4 rounded border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900">
              Required fields not mapped: {requiredMissing.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Confirm */}
      {parsed && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-serif text-xl text-primary">5. Import Confirmation</h2>
          <p className="text-sm text-muted-foreground">{parsed.rows.length} rows ready · Destination: <strong>{IMPORT_TYPE_LABELS[importType]}</strong></p>
          <button
            disabled={importMut.isPending || requiredMissing.length > 0}
            onClick={() => importMut.mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {importMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Import Data
          </button>
          {importMut.error && <p className="mt-3 text-sm text-destructive">{(importMut.error as Error).message}</p>}
          {result && (
            <div className="mt-4 space-y-2 rounded border border-border bg-secondary/30 p-3 text-sm">
              <p><strong className="text-emerald-700">{result.imported}</strong> imported · <strong className="text-amber-700">{result.skipped}</strong> skipped</p>
              {result.warnings.length > 0 && <details><summary className="cursor-pointer text-amber-700">{result.warnings.length} warnings</summary><ul className="ml-4 list-disc">{result.warnings.map((w, i) => <li key={i}>Row {w.row}: {w.message}</li>)}</ul></details>}
              {result.errors.length > 0 && <details open><summary className="cursor-pointer text-destructive">{result.errors.length} errors</summary><ul className="ml-4 list-disc">{result.errors.slice(0, 20).map((w, i) => <li key={i}>Row {w.row}: {w.message}</li>)}</ul></details>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectLiveSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConnectedSources);
  const previewFn = useServerFn(previewLiveSpreadsheet);
  const connectFn = useServerFn(connectLiveSpreadsheet);
  const syncFn = useServerFn(syncConnectedSource);
  const updateFn = useServerFn(updateConnectedSource);
  const deleteFn = useServerFn(deleteConnectedSource);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["connected-sources"],
    queryFn: () => listFn(),
  });

  // wizard state
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [importType, setImportType] = useState<keyof typeof FIELD_SCHEMAS>("pricing");
  const [sheetName, setSheetName] = useState<string>("");
  const [range, setRange] = useState<string>("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewFn>> | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [syncFrequency, setSyncFrequency] = useState<"manual" | "hourly" | "daily" | "weekly">("daily");

  const previewMut = useMutation({
    mutationFn: async () => previewFn({ data: { url, sheet_name: sheetName || null, range: range || null } }),
    onSuccess: (r) => {
      setPreview(r);
      if (!sheetName && r.sheet_name) setSheetName(r.sheet_name);
      // auto-map matching headers
      const fields = FIELD_SCHEMAS[importType].fields.map((f) => f.key);
      const m: Record<string, string> = {};
      for (const h of r.headers) {
        const lower = h.toLowerCase().replace(/\s+/g, "_");
        const match = fields.find((f) => f === lower);
        if (match) m[h] = match;
      }
      setMapping(m);
    },
  });

  const connectMut = useMutation({
    mutationFn: async () =>
      connectFn({
        data: {
          url,
          source_name: name || preview?.sheet_name || "Connected sheet",
          import_type: importType,
          sheet_name: sheetName || null,
          range: range || null,
          column_mapping: mapping,
          sync_frequency: syncFrequency,
          sync_enabled: true,
        },
      }),
    onSuccess: () => {
      setUrl("");
      setName("");
      setSheetName("");
      setRange("");
      setPreview(null);
      setMapping({});
      qc.invalidateQueries({ queryKey: ["connected-sources"] });
    },
  });

  const syncMut = useMutation({
    mutationFn: async (source_id: string) => syncFn({ data: { source_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connected-sources"] });
      qc.invalidateQueries({ queryKey: ["spreadsheet-imports"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (source_id: string) => deleteFn({ data: { source_id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connected-sources"] }),
  });

  const updateMut = useMutation({
    mutationFn: async (vars: { source_id: string; sync_frequency?: "manual" | "hourly" | "daily" | "weekly"; sync_enabled?: boolean }) =>
      updateFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connected-sources"] }),
  });

  const fields = FIELD_SCHEMAS[importType].fields;
  const requiredMissing = preview
    ? fields.filter((f) => f.required).filter((f) => !Object.values(mapping).includes(f.key)).map((f) => f.label)
    : [];

  return (
    <div className="mt-10 space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 font-serif text-xl text-primary">Connect Live Spreadsheet</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Paste a Google Sheets or Microsoft Excel (OneDrive / SharePoint) link. The sheet must be accessible to the connected workspace
          account. Saved connections sync automatically on the schedule you pick.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Spreadsheet URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... or https://...sharepoint.com/..."
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Connection name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master pricing sheet"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sheet / tab name (optional)</label>
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="defaults to first sheet"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Range (optional, A1)</label>
            <input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="e.g. A1:F500"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Import as</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(IMPORT_TYPE_LABELS) as (keyof typeof FIELD_SCHEMAS)[]).map((k) => (
              <button
                key={k}
                onClick={() => { setImportType(k); setMapping({}); }}
                className={`rounded-lg border px-3 py-1.5 text-xs ${importType === k ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-secondary"}`}
              >
                {IMPORT_TYPE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            disabled={!url || previewMut.isPending}
            onClick={() => previewMut.mutate()}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Fetch preview
          </button>
          {previewMut.error && (
            <span className="inline-flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {(previewMut.error as Error).message}
            </span>
          )}
        </div>

        {preview && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
              <p className="text-foreground">
                <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-600" />
                Found <strong>{preview.total_rows}</strong> rows · {preview.headers.length} columns
                {preview.available_sheets.length > 1 && (
                  <> · sheets: {preview.available_sheets.join(", ")}</>
                )}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Column mapping</p>
              <div className="grid gap-2 md:grid-cols-2">
                {preview.headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="w-1/2 truncate font-mono text-xs">{h}</span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      className="flex-1 rounded border px-2 py-1 text-sm"
                    >
                      <option value="">— Skip —</option>
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {requiredMissing.length > 0 && (
                <p className="mt-3 rounded border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900">
                  Required fields not mapped: {requiredMissing.join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Sync schedule</label>
                <select
                  value={syncFrequency}
                  onChange={(e) => setSyncFrequency(e.target.value as typeof syncFrequency)}
                  className="rounded border px-3 py-2 text-sm"
                >
                  <option value="manual">Manual only</option>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                </select>
              </div>
              <button
                disabled={requiredMissing.length > 0 || connectMut.isPending}
                onClick={() => connectMut.mutate()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {connectMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save connection &amp; sync now
              </button>
              {connectMut.error && (
                <span className="text-sm text-destructive">{(connectMut.error as Error).message}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 font-serif text-xl text-primary">Connected Spreadsheets</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No live connections yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Sheet</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Schedule</th>
                  <th className="px-3 py-2">Enabled</th>
                  <th className="px-3 py-2">Last sync</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{s.source_name}</td>
                    <td className="px-3 py-2 capitalize">{s.provider.replace("_", " ")}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.external_sheet_name ?? "—"}{s.sheet_range ? `!${s.sheet_range}` : ""}</td>
                    <td className="px-3 py-2">{IMPORT_TYPE_LABELS[s.import_type as keyof typeof IMPORT_TYPE_LABELS] ?? s.import_type ?? "—"}</td>
                    <td className="px-3 py-2">
                      <select
                        value={s.sync_frequency ?? "manual"}
                        onChange={(e) => updateMut.mutate({ source_id: s.id, sync_frequency: e.target.value as "manual" | "hourly" | "daily" | "weekly" })}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="manual">Manual</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={s.sync_enabled ?? false}
                        onChange={(e) => updateMut.mutate({ source_id: s.id, sync_enabled: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {s.last_synced_at ? (
                        <>
                          {new Date(s.last_synced_at).toLocaleString()}
                          <br />
                          <span className={s.last_sync_status === "failed" ? "text-destructive" : s.last_sync_status === "partial" ? "text-amber-600" : "text-emerald-600"}>
                            {s.last_sync_status ?? ""}
                          </span>
                        </>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          title="Sync now"
                          disabled={syncMut.isPending}
                          onClick={() => syncMut.mutate(s.id)}
                          className="rounded p-1.5 hover:bg-secondary disabled:opacity-50"
                        >
                          {syncMut.isPending && syncMut.variables === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </button>
                        <button
                          title="Delete connection"
                          onClick={() => { if (confirm(`Delete connection "${s.source_name}"?`)) deleteMut.mutate(s.id); }}
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {syncMut.error && <p className="mt-3 text-sm text-destructive">{(syncMut.error as Error).message}</p>}
      </div>
    </div>
  );
}

function ImportHistory() {
  const list = useServerFn(listImports);
  const { data = [] } = useQuery({ queryKey: ["spreadsheet-imports"], queryFn: () => list() });
  return (
    <div className="mt-10 rounded-xl border border-border bg-card p-6">
      <h2 className="mb-3 font-serif text-xl text-primary">Import History</h2>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No imports yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">File</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Imported</th><th className="px-3 py-2">Skipped</th><th className="px-3 py-2">When</th></tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{r.source_file_name ?? "—"}</td>
                  <td className="px-3 py-2">{IMPORT_TYPE_LABELS[r.import_type] ?? r.import_type}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.rows_imported}</td>
                  <td className="px-3 py-2">{r.rows_skipped}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
