import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncSourceInternal } from "@/lib/spreadsheet.functions";

// pg_cron hits this hourly. We pick any sources whose sync_enabled=true
// and whose last_synced_at is older than their configured frequency.
export const Route = createFileRoute("/api/public/hooks/spreadsheet-sync")({
  server: {
    handlers: {
      POST: async () => {
        const { data: sources, error } = await supabaseAdmin
          .from("spreadsheet_sources")
          .select("id, sync_frequency, last_synced_at, created_by")
          .eq("sync_enabled", true)
          .in("provider", ["google_sheets", "microsoft_excel"]);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const now = Date.now();
        const dueMs: Record<string, number> = {
          hourly: 60 * 60 * 1000,
          daily: 24 * 60 * 60 * 1000,
          weekly: 7 * 24 * 60 * 60 * 1000,
          manual: Number.POSITIVE_INFINITY,
        };
        const due = (sources ?? []).filter((s) => {
          const interval = dueMs[s.sync_frequency ?? "manual"] ?? Number.POSITIVE_INFINITY;
          if (!Number.isFinite(interval)) return false;
          if (!s.last_synced_at) return true;
          return now - new Date(s.last_synced_at).getTime() >= interval;
        });

        const results: Array<{ id: string; ok: boolean; error?: string; imported?: number }> = [];
        for (const s of due) {
          try {
            const r = await syncSourceInternal(supabaseAdmin, s.created_by ?? "", s.id);
            results.push({ id: s.id, ok: true, imported: r.imported });
          } catch (e) {
            results.push({ id: s.id, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }

        return new Response(JSON.stringify({ checked: sources?.length ?? 0, synced: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
