## Goal
Show admin invite status visually on `/admin/admins` so you can see at a glance who has accepted their invite.

## Changes

**1. `src/lib/admins.functions.ts` — `listAdmins`**
Return two new fields per admin derived from the auth user:
- `active: boolean` — true when `email_confirmed_at` is set (invite accepted / account confirmed)
- `last_sign_in_at: string | null` — for tooltip / future use

**2. `src/routes/admin.admins.tsx` — list row UI**
- Shield icon color is conditional:
  - Active → green (`text-green-600`)
  - Pending → muted/amber (`text-amber-500`)
- Add a status pill to the right of the row, just before the Remove button:
  - Active → green pill "Active"
  - Pending → amber pill "Pending invite"
- Keep the existing "You" pill and Remove button as-is. "You" is always Active.
- Tooltip on the shield shows "Invite accepted" or "Awaiting sign-in".

## Out of scope
- No schema changes (status is derived from `auth.users.email_confirmed_at`).
- No resend-invite button (you said skip resend earlier).
- No change to invite/remove flows.