## Admin section audit & fix

### Phase 1 — Diagnose & fix Edit Quote saving

The Edit Quote page already wires `updateQuote` / `upsertQuoteItem` / `deleteQuoteItem` to RLS-correct admin policies, so functions exist. Most likely user-visible "dead button" causes:

1. **Per-line green Save icon is `disabled={!dirty}`** — until a field changes, it's grayed at 30% opacity and looks broken/unclickable. No tooltip explains why.
2. **No success toast** on line save, fees save, or notes save — so even when saves succeed, nothing acknowledges them.
3. **No error surfacing** — mutations have no `onError`, so a server failure silently does nothing. This is the most likely "dead button" report.
4. The "0 items" quote (`Q-2026-0001`, total $0) has no rows to render line saves on — adding via "Add" row is the only available edit, and `AddLine` does surface errors but the "Add" pill is small.

Fixes:
- Add `onError` + `onSuccess` toasts to `ItemRow.save`, `Totals.save`, `NotesEditor.save`, `deleteQuoteItem` call.
- Replace the disabled-when-clean save icon with one that explicitly shows "Saved" vs "Save changes" state, and keep it clickable on hover with a tooltip.
- Promote the green per-row save to a labeled button ("Save" with icon) so it doesn't read as decoration.
- After every mutation, invalidate `["admin-quote", id]`, `["admin-quotes"]`, `["quote-availability", id]`, and refetch booking status.
- Reproduce end-to-end via Playwright on `/admin/quotes/<id>/edit`: add a custom line, save it, change qty, save, edit fees, save notes — verify each persists.

### Phase 2 — Audit every admin page

For each page, click every action, watch the network, fix anything that errors, no-ops, or has missing wiring. Findings get fixed inline; I'll list them in the closing summary.

| Page | What I'll verify |
|---|---|
| `/admin` (index) | First-admin claim button, site content slot saves, gallery image upload + caption save, opening video upload |
| `/admin/dashboard` | KPI counts populate, links route correctly, notification bell items mark-read works |
| `/admin/quote-requests` | List loads, status filters work, "Create Quote" inline button works, archive/restore toggle persists |
| `/admin/quote-requests/$id` | Hold/Confirm/Release venue actions, Create-Quote flow, status transitions |
| `/admin/quotes` | Edit link routes correctly (works), status pill renders |
| `/admin/quotes/$id/edit` | All Phase 1 fixes verified |
| `/admin/quotes/$id/preview` | Renders printable view, totals correct |
| `/admin/quotes/$id/job-sheet` | Pull list renders, return marking saves |
| `/admin/inventory` | List + filters, "Create item" form submits, links to detail |
| `/admin/inventory/$id` | Field edits save, soft-delete works |
| `/admin/scheduler` | Calendar fetches events, venue filter, day-detail panel |
| `/admin/staff` | Add, edit, deactivate staff |
| `/admin/admins` | Invite admin (email send), remove admin |
| `/admin/data-import` | Spreadsheet preview, connect, sync trigger |

### Phase 3 — Verification & report

- Browser-drive (Playwright) the quote edit flow end-to-end and screenshot before/after.
- Spot-check the other pages with smaller scripted clicks where they have network side-effects (admins invite, inventory create, staff add).
- Report a final checklist: ✅ working / 🔧 fixed / ⚠️ needs follow-up (e.g. if email-send for admin invite depends on SMTP that isn't configured).

### Out of scope

- No schema changes unless an audit uncovers a missing column/policy.
- No new admin features — only wiring existing ones.
