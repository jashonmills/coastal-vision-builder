
-- Inventory master catalog (admin-managed rental items)
CREATE TABLE public.inventory_master_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  unit_type TEXT NOT NULL DEFAULT 'each',
  total_quantity INTEGER NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  checked_out_quantity INTEGER NOT NULL DEFAULT 0 CHECK (checked_out_quantity >= 0),
  cleaning_quantity INTEGER NOT NULL DEFAULT 0 CHECK (cleaning_quantity >= 0),
  maintenance_quantity INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_quantity >= 0),
  replacement_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (replacement_cost_cents >= 0),
  rental_price_cents INTEGER CHECK (rental_price_cents IS NULL OR rental_price_cents >= 0),
  requires_cleaning BOOLEAN NOT NULL DEFAULT false,
  beach_cleaning_fee_applicable BOOLEAN NOT NULL DEFAULT false,
  requires_anchoring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_master_category ON public.inventory_master_items(category);
CREATE INDEX idx_inv_master_active ON public.inventory_master_items(active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_master_items TO authenticated;
GRANT ALL ON public.inventory_master_items TO service_role;

ALTER TABLE public.inventory_master_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view inventory master" ON public.inventory_master_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert inventory master" ON public.inventory_master_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update inventory master" ON public.inventory_master_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete inventory master" ON public.inventory_master_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_inv_master_updated
  BEFORE UPDATE ON public.inventory_master_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reservations against specific items / dates
CREATE TABLE public.inventory_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_master_items(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.saved_recommendations(id) ON DELETE SET NULL,
  event_id UUID,
  quote_id UUID,
  quantity_reserved INTEGER NOT NULL CHECK (quantity_reserved > 0),
  event_date DATE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_quote'
    CHECK (status IN ('pending_quote','reserved','checked_out','returned','cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_res_item ON public.inventory_reservations(inventory_item_id);
CREATE INDEX idx_inv_res_dates ON public.inventory_reservations(start_date, end_date);
CREATE INDEX idx_inv_res_status ON public.inventory_reservations(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reservations TO authenticated;
GRANT ALL ON public.inventory_reservations TO service_role;

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view reservations" ON public.inventory_reservations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert reservations" ON public.inventory_reservations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update reservations" ON public.inventory_reservations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete reservations" ON public.inventory_reservations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_inv_res_updated
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transaction log
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_master_items(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.saved_recommendations(id) ON DELETE SET NULL,
  event_id UUID,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN (
      'add_stock','remove_stock','reserve','check_out','check_in',
      'move_to_cleaning','move_to_maintenance','mark_damaged','mark_missing','adjust_count'
    )),
  quantity INTEGER NOT NULL,
  status TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_tx_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX idx_inv_tx_type ON public.inventory_transactions(transaction_type);
CREATE INDEX idx_inv_tx_created ON public.inventory_transactions(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins view tx" ON public.inventory_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins insert tx" ON public.inventory_transactions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update tx" ON public.inventory_transactions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete tx" ON public.inventory_transactions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
