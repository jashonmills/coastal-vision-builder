
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inventory_items TO anon, authenticated;
GRANT ALL ON public.inventory_items TO service_role;

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view inventory"
  ON public.inventory_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_inventory_items_category ON public.inventory_items(category, sort_order);
