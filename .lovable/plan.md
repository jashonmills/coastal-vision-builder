## Fix BeaconQuoteModal mobile overflow

The modal container uses `flex items-center justify-center` with a fixed-height card that exceeds the viewport on mobile, so the form's top and bottom (including the Send button) are clipped and the modal itself doesn't scroll.

### Change (single file: `src/components/BeaconQuoteModal.tsx`)

1. **Outer wrapper** — allow vertical scrolling and top-align on mobile:
   - From: `fixed inset-0 z-[100] flex items-center justify-center ... p-4`
   - To: `fixed inset-0 z-[100] overflow-y-auto overscroll-contain flex items-start sm:items-center justify-center p-0 sm:p-4`

2. **Card** — cap height and let inner body scroll, full-bleed on mobile:
   - From: `w-full max-w-lg overflow-hidden rounded-2xl ...`
   - To: `w-full max-w-lg rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border my-0 sm:my-8 flex flex-col max-h-[100dvh] sm:max-h-[calc(100dvh-4rem)]`

3. **Header** — make it sticky so the close (X) is always reachable:
   - Add `sticky top-0 z-10 flex-none` to both the success header and the form header.

4. **Form body** — make the scroll region:
   - Wrap form content with `flex-1 overflow-y-auto` (form keeps `space-y-3 px-6 py-5` but becomes the scroll container).

5. **Safe area padding** — append `pb-[env(safe-area-inset-bottom)]` to the form's bottom padding so the Send button clears the Android nav bar.

No logic, copy, or field changes — purely layout/scroll fixes scoped to this modal.
