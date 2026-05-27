
-- 1) Rename existing pricing table
ALTER TABLE public.inventory_items RENAME TO pricing_items;

-- 2) Drop placeholder tables from previous round
DROP TABLE IF EXISTS public.inventory_reservations CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_master_items CASCADE;

-- 3) Categories
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inventory_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO authenticated;
GRANT ALL ON public.inventory_categories TO service_role;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.inventory_categories FOR SELECT USING (true);
CREATE POLICY "admin insert categories" ON public.inventory_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update categories" ON public.inventory_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete categories" ON public.inventory_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_inv_cat_updated BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) New master inventory_items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL DEFAULT 'physical_rental'
    CHECK (item_type IN ('physical_rental','accessory','consumable','service_fee','cleaning_fee','delivery_fee','labor_fee','package','other')),
  description TEXT,
  short_description TEXT,
  unit_label TEXT NOT NULL DEFAULT 'each',
  default_quantity_unit TEXT NOT NULL DEFAULT 'each',
  total_owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_owned_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  checked_out_quantity INTEGER NOT NULL DEFAULT 0 CHECK (checked_out_quantity >= 0),
  cleaning_quantity INTEGER NOT NULL DEFAULT 0 CHECK (cleaning_quantity >= 0),
  maintenance_quantity INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_quantity >= 0),
  damaged_missing_quantity INTEGER NOT NULL DEFAULT 0 CHECK (damaged_missing_quantity >= 0),
  replacement_cost_cents INTEGER NOT NULL DEFAULT 0,
  default_rental_price_cents INTEGER,
  cleaning_fee_cents INTEGER,
  beach_cleaning_fee_cents INTEGER,
  setup_required BOOLEAN NOT NULL DEFAULT false,
  requires_cleaning BOOLEAN NOT NULL DEFAULT false,
  requires_anchoring BOOLEAN NOT NULL DEFAULT false,
  beach_compatible BOOLEAN NOT NULL DEFAULT false,
  wind_sensitive BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  visible_to_planner BOOLEAN NOT NULL DEFAULT true,
  visible_to_chat BOOLEAN NOT NULL DEFAULT true,
  admin_notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_items_category ON public.inventory_items(category_id);
CREATE INDEX idx_inv_items_type ON public.inventory_items(item_type);
CREATE INDEX idx_inv_items_active ON public.inventory_items(active);

GRANT SELECT ON public.inventory_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read visible items" ON public.inventory_items FOR SELECT
  USING (active = true AND deleted_at IS NULL AND (visible_to_planner = true OR visible_to_chat = true));
CREATE POLICY "admin read all items" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert items" ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update items" ON public.inventory_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete items" ON public.inventory_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_inv_items_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Recreate inventory_transactions with full spec
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'add_stock','remove_stock','adjust_count',
    'reserve','release_reservation',
    'check_out','check_in',
    'move_to_cleaning','mark_cleaned_available',
    'move_to_maintenance','return_from_maintenance',
    'mark_damaged','mark_missing','recover_missing',
    'retire_item','admin_correction'
  )),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  from_status TEXT,
  to_status TEXT,
  related_event_id UUID,
  related_quote_id UUID,
  related_recommendation_id UUID,
  related_order_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_tx_item ON public.inventory_transactions(inventory_item_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view tx" ON public.inventory_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert tx" ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update tx" ON public.inventory_transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete tx" ON public.inventory_transactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6) Saved recommendations: new top-level cols
ALTER TABLE public.saved_recommendations
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 7) Seed categories
INSERT INTO public.inventory_categories (name, slug, sort_order) VALUES
  ('Tents / Canopies', 'tents-canopies', 10),
  ('Canopy Accessories', 'canopy-accessories', 20),
  ('Tables', 'tables', 30),
  ('Chairs', 'chairs', 40),
  ('Dance Floors', 'dance-floors', 50),
  ('Staging', 'staging', 60),
  ('Audio / PA', 'audio-pa', 70),
  ('Bars / Food Service', 'bars-food-service', 80),
  ('Anchoring / Weights', 'anchoring-weights', 90),
  ('Delivery / Service', 'delivery-service', 100),
  ('Cleaning Fees', 'cleaning-fees', 110),
  ('Miscellaneous', 'miscellaneous', 120);

-- Seed items (quantities default 0; admin will configure later)
INSERT INTO public.inventory_items
  (name, slug, item_type, category_id, requires_cleaning, requires_anchoring, beach_compatible, wind_sensitive, visible_to_planner, visible_to_chat, admin_notes)
SELECT v.name, v.slug, v.item_type, c.id, v.requires_cleaning, v.requires_anchoring, v.beach_compatible, v.wind_sensitive, v.visible_to_planner, v.visible_to_chat, v.admin_notes
FROM (VALUES
  ('20x40 Frame Tent',                '20x40-frame-tent',           'physical_rental', 'tents-canopies',     true,  true,  true,  true,  true, true, NULL),
  ('Canopy Wall 20'' w/ Window',      'canopy-wall-20-window',      'accessory',       'canopy-accessories', true,  false, true,  true,  true, true, NULL),
  ('Water Barrels',                   'water-barrels',              'accessory',       'anchoring-weights',  false, false, true,  false, true, true, 'Used for tent anchoring on hard surfaces or sand.'),
  ('60" Round Table',                 '60-round-table',             'physical_rental', 'tables',             true,  false, true,  false, true, true, NULL),
  ('30" Round Cocktail Table',        '30-round-cocktail-table',    'physical_rental', 'tables',             true,  false, true,  false, true, true, '36" or 42" height options.'),
  ('8'' x 30" Rectangular Table',     '8-rectangular-table',        'physical_rental', 'tables',             true,  false, true,  false, true, true, NULL),
  ('Folding Chair - White',           'folding-chair-white',        'physical_rental', 'chairs',             true,  false, true,  false, true, true, NULL),
  ('Dance Floor Section',             'dance-floor-section',        'physical_rental', 'dance-floors',       true,  false, true,  false, true, true, NULL),
  ('Stage 6x8',                       'stage-6x8',                  'physical_rental', 'staging',            true,  false, false, false, true, true, NULL),
  ('PA System - Bluetooth w/ Mic',    'pa-system-bluetooth-mic',    'physical_rental', 'audio-pa',           false, false, true,  true,  true, true, 'Protect from rain, sand, and moisture.'),
  ('Portable Bar',                    'portable-bar',               'physical_rental', 'bars-food-service',  true,  false, true,  false, true, true, NULL),
  ('Chafing Dish',                    'chafing-dish',               'accessory',       'bars-food-service',  true,  false, true,  false, true, true, NULL),
  ('Seaside Delivery',                'seaside-delivery',           'delivery_fee',    'delivery-service',   false, false, true,  false, true, true, NULL),
  ('Cleaning Fee - Beach',            'cleaning-fee-beach',         'cleaning_fee',    'cleaning-fees',      false, false, true,  false, true, false, NULL),
  ('Canopy Cleaning Fee - Beach',     'canopy-cleaning-fee-beach',  'cleaning_fee',    'cleaning-fees',      false, false, true,  false, true, false, NULL)
) AS v(name, slug, item_type, cat_slug, requires_cleaning, requires_anchoring, beach_compatible, wind_sensitive, visible_to_planner, visible_to_chat, admin_notes)
JOIN public.inventory_categories c ON c.slug = v.cat_slug;

-- Mark beach cleaning fee applicability via a per-item update for tables/chairs/tent
UPDATE public.inventory_items SET beach_cleaning_fee_cents = 0
WHERE slug IN ('20x40-frame-tent','60-round-table','30-round-cocktail-table','8-rectangular-table','folding-chair-white');
