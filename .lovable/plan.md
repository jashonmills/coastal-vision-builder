## Consistent admin navigation

Right now `AdminTabs` (the row with Dashboard / Quote Requests / Inventory / Scheduler / Staff / Admins / Pricing & Content) renders on Admin, Dashboard, Quote Requests, Quotes, Staff, and Admins — but is **missing** from several pages, so you can land there and get stuck.

### Pages missing the tab bar

| Page | Fix |
|---|---|
| `/admin/inventory` | Add `<AdminTabs active="inventory" />` at top |
| `/admin/inventory/$id` | Add `<AdminTabs active="inventory" />` + keep existing "Back to inventory" link |
| `/admin/scheduler` | Add `<AdminTabs active="scheduler" />` |
| `/admin/data-import` | Add `<AdminTabs active="admin" />` (it lives under Pricing & Content) |
| `/admin/quote-requests/$id` | Add `<AdminTabs active="requests" />` + ensure "Back to requests" link |
| `/admin/quotes/$id/edit` | Add `<AdminTabs active="quotes" />` (already has "All quotes" back link) |
| `/admin/quotes/$id/preview` | Add `<AdminTabs active="quotes" />` + "Back to quote" link |
| `/admin/quotes/$id/job-sheet` | Add `<AdminTabs active="quotes" />` + "Back to quote" link |

### Implementation

- Import `AdminTabs` from `./admin.quote-requests` in each page above.
- Render it directly under the page heading, matching the existing pattern used in `admin.index.tsx`, `admin.dashboard.tsx`, etc.
- Where a parent context exists (`$id` pages), also render a small `← Back to <list>` link above the tabs so users have both a one-click route back to the list and the global tab bar.
- No layout-route refactor; just add the component per page. Keeps the diff small and avoids re-architecting the route tree.

### Out of scope

- No visual redesign of the tab bar itself.
- No changes to mobile bottom nav.
- No new routes.
