# Spreadsheet Import + Rental Calendar Scheduler

Building the foundation for both features in one pass. Live OAuth sync (Google Sheets / Microsoft Excel) is scaffolded as "Coming Soon" — only CSV/XLSX upload is fully wired this round. The scheduler ships with full CRUD, calendar views, and auto-creation of events from quote requests.

---

## Phase 1 — Database (one migration)

### Spreadsheet tables
- **`spreadsheet_sources`** — `source_type` (csv_upload/xlsx_upload/google_sheets/microsoft_excel), `source_name`, `provider`, `file_url`, `external_spreadsheet_id`, `external_sheet_name`, `sync_enabled`, `sync_frequency`, `last_synced_at`, `last_sync_status`, `created_by`
- **`spreadsheet_imports`** — `spreadsheet_source_id`, `import_type` (pricing/inventory/customers/quote_requests/rental_events/equipment_checklist/other), `status`, row counts, `warnings` (jsonb), `errors` (jsonb), `column_mapping` (jsonb), `imported_by`, `completed_at`
- **`spreadsheet_sync_logs`** — source_id, status, row counts, errors, `started_at`, `completed_at`

### Scheduler table
- **`rental_calendar_events`** — `title`, `event_type`, `start_time`, `end_time`, `all_day`, `status`, `customer_id`, `quote_id`, `quote_request_id`, `rental_event_id`, `saved_recommendation_id`, `location`, `notes`, `assigned_to`, `color`, future-sync fields (`external_calendar_provider`, `external_calendar_event_id`, `sync_to_external_calendar`), `created_by`, `deleted_at`

### Storage bucket
- **`spreadsheet-uploads`** (private) for CSV/XLSX files

### Security
- RLS: admin-only on all five tables (`has_role(auth.uid(), 'admin')`)
- Standard GRANTs for `authenticated` + `service_role`

---

## Phase 2 — Spreadsheet Import UI

Route: **`/admin/data-import`** (label "Data Import")

- Section 1: **Upload** — drag/drop CSV or XLSX (uses `xlsx` npm package for parsing in browser)
- Section 2: **Connect Live Spreadsheet** — Google Sheets + Microsoft Excel cards, both labeled "Coming Soon" with disabled CTA
- Section 3: **Import Type** selector (radio cards)
- Section 4: **Data Preview** — first 20 rows, detected types
- Section 5: **Column Mapping** — dropdowns mapping spreadsheet columns → system fields (per import type)
- Section 6: **Validation** — required-column check, duplicate detection, type validation, negative quantities
- Section 7: **Import Confirmation** — counts + "Import Data" button (writes to `pricing_items` or `inventory_items`, logs to `spreadsheet_imports`)
- Section 8: **Import History** table

Server fn `importSpreadsheetRows` (admin-gated) handles the actual DB insert with conflict handling (protects operational quantity fields).

---

## Phase 3 — Scheduler UI

Route: **`/admin/scheduler`** (label "Scheduler")

- Install `react-big-calendar` + `date-fns` for month/week/day/agenda views
- Top controls: Today / Prev / Next / view toggle / filter by status & event type / search
- Color-coded events per spec (gold/blue/navy/green/teal/orange/red/gray)
- **Event detail modal** with View Quote Request / View Quote / Mark Complete / Edit / Delete actions
- **Manual create/edit** modal
- **Mobile list view** with today's tasks, upcoming deliveries/pickups
- Server fns: `listCalendarEvents`, `upsertCalendarEvent`, `deleteCalendarEvent`

---

## Phase 4 — Quote Request → Calendar wiring

- When `quote_requests` row is inserted (existing flow), also insert two `rental_calendar_events`:
  1. `quote_request` event on `created_at` ("New Quote Request: {type} · {guests} guests")
  2. `quote_request` event on `event_date` if present ("Potential Event: ...")
- When admin creates a quote → flip linked calendar event to `quote_sent`
- When quote marked booked → auto-create `rental_reserved`, `delivery`, `pickup`, `check_out`, `check_in` events (scaffold helper, default ±1 day offsets, admin can edit)

---

## Phase 5 — Admin navigation

Update `/admin` shell sidebar/tabs to include:
- Dashboard, Quote Requests, Quotes, Pricing, Inventory, **Data Import**, **Scheduler**

Update admin dashboard with: new quote requests count, upcoming events this week, today's tasks, items needing check-in/cleaning.

---

## Out of scope (this round)

- Live Google Sheets / Microsoft Excel OAuth sync (scaffolded only)
- Two-way spreadsheet sync
- Full inventory availability locking from calendar
- External calendar (Google/Outlook) push sync
- Stripe payment on quotes
- Per-technician assignment workflows

---

## Tech notes

- New npm deps: `xlsx` (spreadsheet parsing), `react-big-calendar`, `date-fns` (already present likely)
- All server fns admin-gated via `requireSupabaseAuth` + `has_role` check
- File uploads go through `supabaseAdmin` storage from a server fn after admin verification
- Estimated 1 migration + ~12–15 new files (routes, components, server fns, lib helpers)
