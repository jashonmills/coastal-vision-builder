import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { syncSourceInternal } from "@/lib/spreadsheet.functions";

// pg_cron hits this hourly. Requires a shared secret in the
// `Authorization: Bearer <secret>` or `x-webhook-secret: <secret>` header,
// matched (constant-time) against SPREADSHEET_SYNC_SECRET.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export const Route = createFileRoute("/api/public/hooks/spreadsheet-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SPREADSHEET_SYNC_SECRET;
        if (!expected) {
          console.error("[spreadsheet-sync] SPREADSHEET_SYNC_SECRET is not configured");
          return new Response(null, { status: 401 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        const headerSecret = request.headers.get("x-webhook-secret")?.trim() ?? "";
        const presented = bearer || headerSecret;
        if (!presented || !timingSafeEqual(presented, expected)) {
          return new Response(null, { status: 401 });
        }

        const { data: sources, error } = await supabaseAdmin
          .from("spreadsheet_sources")
          .select("id, sync_frequency, last_synced_at, created_by")
          .eq("sync_enabled", true)
          .in("provider", ["google_sheets", "microsoft_excel"]);
        if (error) {
          console.error("[spreadsheet-sync] failed to load sources", error);
          return new Response(JSON.stringify({ error: "internal_error" }), {
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

        let syncedOk = 0;
        let failed = 0;
        for (const s of due) {
          try {
            await syncSourceInternal(supabaseAdmin, s.created_by ?? "", s.id);
            syncedOk++;
          } catch (e) {
            failed++;
            console.error("[spreadsheet-sync] source sync failed", { source_id: s.id, error: e });
          }
        }

        return new Response(
          JSON.stringify({
            checked: sources?.length ?? 0,
            due: due.length,
            synced: syncedOk,
            failed,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
