# Admin System Audit & Fix

(a) Fix everything I find in one pass (could be a large diff across 8–10 files), 

## Goal

Walk every admin route, exercise each primary action (add/edit/delete/save), fix what's broken, populate empty pages. Starting with the reported "Add Staff button does nothing" bug.

## Scope — routes to audit

1. `/admin` (admin.index.tsx) — entry hub + pricing/content tabs
2. `/admin/dashboard` — KPIs + lists
3. `/admin/quote-requests` (+ `$id`) — list, view, convert to quote
4. `/admin/quotes` (+ `$id/edit`, `$id/preview`, `$id/job-sheet`) — create, edit lines, send, mark booked
5. `/admin/inventory` (+ `$id`) — add item, edit, adjust quantity, archive
6. `/admin/scheduler` — calendar events CRUD, assign staff
7. `/admin/staff` — add/edit/delete staff  ← reported broken
8. `/admin/data-import` — spreadsheet upload + mapping
9. `/admin/pricing` — currently a redirect to `/admin`; confirm intent

## Audit procedure (per page)

For each route I will:

1. Read the route file + its server functions.
2. Verify every interactive control is wired (onClick, onSubmit, disabled state).
3. Check the matching server fn exists, is registered, validates input correctly (Zod), and writes to a table whose RLS/GRANTs allow the action.
4. Smoke test in the browser (open page as admin, click each primary button, confirm DB write or visible feedback).
5. Capture broken/missing pieces in a fix list, then fix.

## Known issues found so far

### A. Add Staff button silently fails

- Form is reachable, `upsertStaff` server fn looks correct, RLS allows admin INSERT.
- Most likely cause: `StaffSchema` validates `email: z.string().email()...optional()` — if any future field passes `""` it rejects. Current form only sends `name/role/active`, so validation should pass. Need to verify by clicking it with the browser tool and reading server logs.
- Fix candidates: (1) tolerate empty strings in Zod by coercing `""` → `null` before parse, (2) surface validation errors with a toast on mutation error (already wired — so an error should appear; if no toast fires, the click handler isn't running on mobile — check `<button>` inside flex-wrap row on 384px viewport — it may be overflowing or covered).

### B. Other likely gaps (to verify and fix)

- `/admin/pricing` is just a redirect — confirm the pricing editor inside `/admin` tabs actually loads and saves, otherwise restore a real page.
- Inventory "Add item" modal — verify it submits and refreshes list.
- Scheduler — verify event create/edit modal + staff assignment dropdown is populated from `staff` table.
- Quote edit page — verify line-item add, totals recalc, save.
- Data import — verify file upload → mapping → commit pipeline end to end.

## Fix plan

1. **Staff page**: add error-toast around `save.mutate`, coerce empty-string optional fields to `null` in schema, widen click target, browser-test Add Staff on mobile viewport. Verify with a test insert.
2. **Each remaining admin page**: walk through, list concrete defects, fix in order: server-fn/data-layer bugs → UI wiring → empty/placeholder content.
3. **Smoke pass**: re-open each page as admin, exercise primary CTA, confirm DB row appears via `read_query`.
4. **Report**: short summary per page (OK / fixed X / still pending Y).

## Out of scope

- Visual redesign of admin pages (only fix layout where it breaks an action).
- New admin features beyond what already has a route or button.

## Question before I start

Do you want me to:

- (a) Fix everything I find in one pass (could be a large diff across 8–10 files), or
- (b) Go page-by-page and check in with you after each one?