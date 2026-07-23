## Make the Scheduler month/week grid clickable

**Problem:** The tip says "Click a day to add an event," but the day cells in `src/routes/admin.scheduler.tsx` aren't interactive — only the "New Event" button works.

**Change (frontend only, `src/routes/admin.scheduler.tsx`):**

1. **Month grid (`MonthView`)** — make each dated cell clickable:
   - Wrap the cell's empty space in a click handler that opens the event editor prefilled for that day (`setEditing({ event_type: "internal_note", status: "scheduled", start_time: <that day at 09:00 local>, all_day: false })`).
   - Keep existing event chips working: their `onClick` already calls `onSelect`; add `e.stopPropagation()` so clicking a chip doesn't also trigger the day's "new event" handler.
   - Add hover affordance (`hover:bg-secondary/40 cursor-pointer`) and an `aria-label="Add event on <date>"` for accessibility. Empty padding cells stay non-interactive.

2. **Week view (`WeekView`)** — same treatment on each day column so week view is consistent.

3. **Plumbing:** pass an `onAddOnDate: (date: Date) => void` prop from the parent into `MonthView`/`WeekView`; the parent wires it to `setEditing({...})` with the chosen date.

No backend or schema changes; `upsertCalendarEvent` already handles new events created from the editor.
