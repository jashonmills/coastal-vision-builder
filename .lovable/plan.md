## 1. Nav cleanup

In `src/components/SiteLayout.tsx`:
- Remove the `/recommender` entry from `navLinks` (the link sitting between Gallery and About).
- Change the desktop pill button label `Find My Tent Size` → `Event Recommender` (keeps the same `to="/recommender"`).
- Remove the same `/recommender` entry from the mobile slide-down menu list (it's the same `navLinks` array, so it falls out automatically).

## 2. AI-powered recommender (Gemini via Lovable AI Gateway)

### Server function — `src/lib/recommender.functions.ts`
- `createServerFn({ method: "POST" })` named `generateRecommendation`.
- Input (validated with Zod): the full `RecommenderInput` plus contact name (optional).
- Handler steps:
  1. Read the entire `inventory_items` table with `supabaseAdmin` (server only).
  2. Build a system prompt: "You are a senior event planner for Pacific North Events & Tents. You MUST recommend items from EVERY available category (Canopy, Canopy Options, Tables, Chairs, Specialty Items, Delivery). Push as much product as reasonably fits the event. Output only items present in the provided inventory."
  3. Call `https://ai.gateway.lovable.dev/v1/chat/completions` with model `google/gemini-3-flash-preview`, tool-calling to force structured JSON:
     ```
     {
       headline: string,
       summary: string,             // 2–3 sentence overview
       picks: [{
         category: string,
         item_id: string,           // must match an inventory id
         item_name: string,
         quantity: number,
         reason: string
       }],
       weather_notes: string[],
       blueprint_prompt: string     // detailed prompt for the image generator
     }
     ```
  4. Take the returned `blueprint_prompt`, call `/v1/images/generations` with `google/gemini-3.1-flash-image-preview`, prompt prefixed with: "Top-down architectural blueprint, white lines on navy background, labeled tent footprint, tables, chairs, dance floor, bar, stage — clean, minimal, technical drawing style. {prompt}". Return the resulting data URL.
  5. Return `{ recommendation, blueprintImage, picks }` to the client.
- 429/402 handled with a clean error message that the UI surfaces.

### Wiring
- Confirm `LOVABLE_API_KEY` exists (use `ai_gateway--create` if missing).
- Add `attachSupabaseAuth` to `src/start.ts` `functionMiddleware` if not already there (read-only inventory query doesn't require auth — but the file is canonical).

### UI — `src/routes/recommender.tsx`
- Keep the existing 5-step form.
- On final submit, instead of running the local `recommend()`, call the new server fn via `useServerFn` + `useMutation` (TanStack Query).
- Loading state: "Designing your event setup…" spinner.
- New `Result` block:
  - Hero: headline + AI summary.
  - **Blueprint** (full-width card): the generated image, with a small "AI-generated estimate" caption.
  - **Recommended Setup** grouped by category, each row showing item name, quantity badge, and the AI's reason. Categories rendered in fixed order (Canopy → Options → Tables → Chairs → Specialty → Delivery) so every section is visibly represented.
  - **Weather & Setup Notes** list.
  - "Send This Recommendation for a Quote" button — passes a summarized payload via `prefill` search param to `/contact`.
- Local `src/lib/recommender.ts` rules stay as a fallback if the AI call fails (catch → show fallback result + toast).

## 3. Mobile / tablet bottom navigation

Pattern modeled on FPK's `MobileBottomNav` (fixed bottom bar, icon + label per tab, primary CTA in the middle), adapted to this marketing site.

New file `src/components/MobileBottomNav.tsx`:
- Fixed `bottom-0 left-0 right-0`, `lg:hidden` so it only shows on mobile + tablet.
- Background `bg-background/95 backdrop-blur border-t border-border`, safe-area padding.
- 5 slots, equal width, icon + label:
  1. **Home** → `/` (Home icon)
  2. **Rentals** → `/tent-rentals` (Tent icon — `Tent` from lucide)
  3. **Quote** (center, prominent primary-colored pill) → `/contact` (Send icon)
  4. **Recommender** → `/recommender` (Sparkles icon)
  5. **Menu** → opens the existing hamburger drawer (Menu icon)
- Active route highlighted via `useRouterState` + `location.pathname`.

In `SiteLayout.tsx`:
- Render `<MobileBottomNav />` after `<main>`.
- Add `pb-20 lg:pb-0` to the outer container so content isn't hidden behind the bar.
- The existing hamburger button stays; Menu tab triggers the same `setOpen(true)` state (lift state or expose via context — simplest: keep hamburger and have Menu tab control the same `useState` since `MobileBottomNav` lives inside `SiteLayout`).

## 4. Database & secrets

- No schema changes — `inventory_items` already exists.
- Verify `LOVABLE_API_KEY` is set; create if missing.

## Files touched

- `src/components/SiteLayout.tsx` — nav cleanup, CTA rename, mount bottom nav, padding.
- `src/components/MobileBottomNav.tsx` — new.
- `src/lib/recommender.functions.ts` — new (server fn).
- `src/routes/recommender.tsx` — swap local logic for server fn, render blueprint + AI picks.
- `src/start.ts` — ensure `attachSupabaseAuth` registered (only if missing).

## Out of scope

- No changes to inventory data, contact page, or other routes.
- Blueprint is an AI-rendered illustrative image, not a CAD-accurate floor plan.
