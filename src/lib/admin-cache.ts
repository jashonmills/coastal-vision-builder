import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all cross-page admin caches whose data can be affected by a
 * quote/booking/inventory/scheduler mutation. Call after book/unbook/send,
 * check-out/check-in, venue confirm/hold, and quote-item edits.
 */
export function invalidateOpsQueries(qc: QueryClient, opts?: { quoteId?: string }) {
  qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  qc.invalidateQueries({ queryKey: ["admin-quotes"] });
  qc.invalidateQueries({ queryKey: ["admin-quote-requests"] });
  qc.invalidateQueries({ queryKey: ["admin-inventory-items"] });
  qc.invalidateQueries({ queryKey: ["calendar-events"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
  qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  if (opts?.quoteId) {
    qc.invalidateQueries({ queryKey: ["admin-quote", opts.quoteId] });
    qc.invalidateQueries({ queryKey: ["quote-availability", opts.quoteId] });
    qc.invalidateQueries({ queryKey: ["quote-booking-status", opts.quoteId] });
    qc.invalidateQueries({ queryKey: ["job-sheet", opts.quoteId] });
  }
}
