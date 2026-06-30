Every Delivery row in `pricing_items` is duplicated (two rows per location with identical price and sort_order). Delete the duplicate row in each pair, keeping one canonical entry per location.

For the two name-variant pairs (with/without spaces around the slash), keep the spaced version for readability:
- Keep "Ilwaco / Naselle", delete "Ilwaco/Naselle"
- Keep "Manzanita / Nehalem", delete "Manzanita/Nehalem"

For the other duplicates, delete the second row by id, keeping the first.

Rows to delete (15 total):
- b4d41870 Seaside, 266a97a1 Gearhart, 126d4368 Warrenton, 093e777b Astoria, e6775c23 Cannon Beach, e1ff8ce0 Knappa, 5b16bb93 Ilwaco/Naselle, a9181b7a Manzanita/Nehalem, f3f34501 Long Beach, 717084fa Ocean Park, cf5ce3d2 Wheeler, 9847b297 Rockaway, 98cabc5e Garibaldi, b4cdceed Bay City, 77471e7c Tillamook

No code changes — Inventory page reads live from this table.