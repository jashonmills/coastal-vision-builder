## Add Rental Contract page

**New route:** `src/routes/rental-contract.tsx` — clean, single-page HTML view of the contract with sections:

- Payment
- Additional Charges
- Care of Equipment
- Insurance
- Site Preparation
- Permits & Licenses
- Severability / Responsibility of Use & Disclaimer of Warranties
- Equipment Failure
- Use of Equipment
- Time of Return / Late Returns
- Subsurface Conditions
- Hold Harmless Agreement
- Deposit
- Payment Terms
- Pricing
- Cancellation Policy
- Delivery / Pick-up
- Customer Pick-up / Returns
- Returns – Final Inspection
- Prior to Pick-up or Return
- Tents
- Sidewalls
- Equipment Responsibility
- Emergency Line
- Promotional

Content adapted from the uploaded PDF, with "Damarkom Rentals" replaced by "Pacific North Events & Tents" to match the project's brand. Sticky table-of-contents sidebar on desktop, accordion-friendly headings on mobile, print-friendly styles, and a note clarifying this is a sample preview (final contract issued with each booking).

`head()` metadata: title "Rental Contract — Pacific North Events & Tents", descriptive meta description, og tags.

**Nav update:** `src/components/SiteLayout.tsx` — add "Rental Contract" item to the About dropdown alongside About Us and Contact. Add matching i18n string in locales used by the dropdown.

No backend, business logic, or other route changes.
