## Goals
1. Give every signed-in user (including admins) a dedicated Profile page where they can edit their info.
2. Make sign-in / account obvious on mobile — both a top-right header icon and a bottom-nav tab.

## 1. Profile schema additions
Migration on `public.profiles`:
- add `phone text`
- add `company text`
- add admin-only columns: `internal_title text`, `admin_notes text`

RLS updates:
- Users can `SELECT`/`UPDATE` their own row (already exists) for `display_name`, `phone`, `company`.
- `internal_title` and `admin_notes` writable/readable only when caller `has_role(auth.uid(),'admin')`. Enforced via a security-definer server function (not column-level RLS) — the page hides the fields for non-admins and the save server fn rejects admin-only fields unless the caller is admin.

## 2. Profile page
New route `src/routes/_authenticated/profile.tsx` (moves under the managed auth gate) plus a redirect from existing `/account` Profile link.
- Form fields: Display name, Phone, Company.
- Admin-only section (visible only when `has_role = admin`): Internal title, Admin notes, plus an "Admin" badge and quick link to `/admin`.
- Saves via two `createServerFn`s:
  - `updateMyProfile` — user-editable fields.
  - `updateMyAdminProfile` — admin-only fields, guarded by `has_role` check.
- Zod validation on both client and server (lengths, trimming).

Link to `/profile` from:
- Account page header.
- Desktop header user dropdown (new small menu when signed in: Profile / My Quotes / Sign out).
- Mobile bento drawer signed-in block.

## 3. Mobile sign-in visibility
- **Top-right header icon** (`MobileTopBar` area in `SiteLayout`): person icon → `/login` when signed-out, `/profile` when signed-in. Admins get a small shield dot overlay.
- **Bottom nav tab** (`MobileBottomNav`): replace the least-used current tab with an "Account" tab that routes to `/login` or `/account` based on auth state. Active state highlights when on `/account*` or `/profile`.

## 4. Out of scope
- No changes to auth providers, email templates, or the 3-plan cap.
- No avatar upload (user didn't select it).
- No changes to admin tools beyond the profile fields.

## Technical notes
- Profile route lives under `_authenticated/` so the managed gate handles redirects — no custom `beforeLoad`.
- Server fns use `requireSupabaseAuth`; admin fn additionally calls `context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })`.
- Mobile bottom-nav refactor keeps existing icon set; only swaps one slot and adds auth-aware label.
