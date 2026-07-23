## Problem

`src/routes/accept-invite.tsx` decides post-signup destination by checking only the `admin` role. Staff members (rows in `public.staff` with `user_id = auth.uid()`) aren't recognized, so they fall through to the default `/account` (customer dashboard) instead of their staff dashboard.

## Fix

Update the post-password-save redirect in `src/routes/accept-invite.tsx` to:

1. If user has `admin` role → `/admin` (unchanged).
2. Else, check `public.staff` for an active row with `user_id = uid` (single-row select via the browser Supabase client — RLS already allows a staff member to read their own row). If found → `/my-schedule`.
3. Else → `/account` (unchanged).

That is the only code change. No schema, no server function, no other flow touched.

## Verification

- Typecheck.
- Manually: an invited staff user, on completing password setup, lands on `/my-schedule`; an invited admin still lands on `/admin`; a regular customer invite (if ever used) still lands on `/account`.