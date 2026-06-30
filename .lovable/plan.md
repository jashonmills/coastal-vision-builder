Remove the "PA System - Bluetooth w/ Mic" ($80) entry from the Specialty Items inventory so it no longer appears on the public Inventory & Pricing page. The Sony ULTA system stays as the only PA offering.

Change:
- Delete the row from `pricing_items` where name = 'PA System - Bluetooth w/ Mic' (id `daa8fc6e-d237-4151-97da-cb3b4a1b34c8`).

No code or schema changes needed — the Inventory page reads live from this table.