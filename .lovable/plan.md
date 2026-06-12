## Problem
The admin invite calls `supabaseAdmin.auth.admin.inviteUserByEmail(email)` with no `redirectTo`, and the app has no page that handles the invite link. When the invitee clicks the email, Supabase verifies the token, creates a session, and lands them on the homepage — they're silently signed in but never prompted to set a password.

## Fix

### 1. New public route `/accept-invite`
- Handles both invite tokens and password-recovery tokens (same form, same code path).
- Reads the URL hash (`type=invite` / `type=recovery`) on mount; waits for Supabase to establish the session via `onAuthStateChange`.
- Shows a "Set your password" form (password + confirm). Submits via `supabase.auth.updateUser({ password })`.
- On success, redirects to `/account` (or `/admin` if the user has the admin role).
- On error (expired/invalid token), shows a clear message and a "Request a new invite" link back to `/login`.

### 2. Pass `redirectTo` when inviting
- `inviteAdmin` server fn: pass `redirectTo: \`${SITE_URL}/accept-invite\`` to `inviteUserByEmail`. SITE_URL derived from `process.env.SITE_URL` if set, else from request origin via `getRequestHeader('origin')`, with a sane fallback to the production URL.

### 3. Also add `/reset-password` alias
- Same component as `/accept-invite` (re-export) so any existing recovery emails using `/reset-password` work too. This satisfies the documented requirement that password reset apps include a `/reset-password` page.

### 4. Out of scope
- No changes to the invite email template (Lovable default keeps working).
- No changes to the existing `/login` page, roles table, or Profile work shipped earlier.
- No email-domain or template scaffolding work.

## Files
- New: `src/routes/accept-invite.tsx` (the form + token handler).
- New: `src/routes/reset-password.tsx` (thin wrapper rendering the same component).
- Edit: `src/lib/admins.functions.ts` — add `redirectTo` to `inviteUserByEmail`.
