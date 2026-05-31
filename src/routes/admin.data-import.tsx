import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, FileSpreadsheet, ArrowLeft, RefreshCw, Trash2, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
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
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="mb-6">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to admin</Link>
        </div>
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
  return (
    <div className="mt-10 rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 font-serif text-xl text-primary">Connect Live Spreadsheet</h2>
      <p className="mb-4 text-sm text-muted-foreground">Pull updates automatically from a connected spreadsheet.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { name: "Google Sheets", desc: "Sync from a Google Sheets URL" },
          { name: "Microsoft Excel / OneDrive", desc: "Sync from Excel on OneDrive" },
        ].map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-lg border border-dashed border-border p-4">
            <div>
              <p className="font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <button disabled className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">Coming Soon</button>
          </div>
        ))}
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
