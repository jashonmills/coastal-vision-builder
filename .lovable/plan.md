
## Goal

Pre-populate the admin **Inventory** with every item from the uploaded *Pacific North Events & Tents* pricing sheet. Quantities are left at `0` — you'll fill them in later. Pricing, cleaning fees, and category structure come straight from the doc.

## Categories (created if missing)

1. Canopies & Tents
2. Canopy Add-Ons
3. Tables
4. Chairs
5. Specialty Items
6. Delivery Zones (pricing-only, no physical inventory)

## Inventory items to seed

All prices are the **3-day rental** rate from the doc. `total_owned_quantity = 0` for every item (you'll backfill). Beach cleaning fees stored on the item where listed; `beach_compatible`, `requires_cleaning`, `setup_required`, `requires_anchoring`, `wind_sensitive` flagged appropriately.

**Canopies & Tents** (setup included, wind-sensitive, requires anchoring, beach-compatible)
- 10×10 Canopy — $250 (beach clean $150)
- 10×20 Canopy — $400 (beach clean $200)
- 20×20 Canopy — $650 (beach clean $250)
- 20×40 Canopy — $1,200 (beach clean $400)
- 40 ft Hexagon Canopy — $2,000 (beach clean $400)

**Canopy Add-Ons**
- Canopy Gutter 10' — $35
- Canopy Gutter 20' — $50
- Canopy Gutter 40' — $100
- Canopy Wall 20' w/ Door — $60
- Canopy Wall 20' w/ Window — $60
- Canopy Wall 20' Solid — $60
- Canopy Wall 10' Solid — $35
- Canopy Light Fixture — $50
- Café Lights (50 ft) — $50
- Water Barrel — $50 (admin note documenting 4/4/4/6 requirement per tent size)

**Tables** (beach cleaning fee $10/each on beach-compatible)
- 6' × 30" Rectangular — $13 (setup $6)
- 8' × 30" Rectangular — $15 (setup $6)
- 60" Round — $15 (setup $6)
- 36" Round (36"/42" height) — $12 (setup $6)
- 30" Round (36"/42" height) — $12 (setup $6)
- Wooden Specialty Table — $25 (**not beach-compatible**)

**Chairs** (beach clean $3, optional setup $3)
- Folding Chair – White — $3
- Folding Chair – Black — $3
- Folding Specialty Chair – Wood — $5 (**not beach-compatible**)

**Specialty Items**
- Portable Bar — $100
- Fill & Chill Table w/ Skirt — $50
- PA System – Bluetooth w/ Mic — $80
- Patio Heater with Propane — $150
- Galvanized Tub — $10
- Chafing Dish — $10 (admin note: sternos not included)
- Dance Floor 3×4 Square — $50 (admin note: full floor = 24 squares)
- Outdoor Light Post (200 ft of lights) — $400
- Wood Round — $3
- Stage 6×8 — $200 (admin note: 4 total available)
- Propane Grill — $175

**Delivery Zones** (stored in `pricing_items`, not inventory — roundtrip fee)
Seaside $100, Gearhart $100, Warrenton $125, Astoria $150, Cannon Beach $150, Knappa $175, Ilwaco/Naselle $175, Manzanita/Nehalem $200, Long Beach $200, Ocean Park $225, Wheeler $225, Rockaway $250, Garibaldi $275, Bay City $300, Tillamook $325. Plus a note row: "Beyond listed locations — call for pricing."

## Technical notes

- Insert via `supabase--insert` — no schema changes needed; all required columns already exist (`default_rental_price_cents`, `beach_cleaning_fee_cents`, `setup_required`, `requires_cleaning`, `beach_compatible`, `requires_anchoring`, `wind_sensitive`, `admin_notes`, `total_owned_quantity`).
- Slugs auto-generated from names; SKUs left null.
- Idempotent: uses `ON CONFLICT (slug) DO NOTHING` so re-running won't duplicate.
- Categories upserted by slug first, then items reference them.
- No UI changes — items appear immediately in `/admin/inventory`.

## Out of scope (ask if you want these next)

- Actual quantities owned (you said you'll add)
- Photos per item
- Pricing tiers beyond the 3-day base
- Linking canopies → required water-barrel counts as an auto-add rule
