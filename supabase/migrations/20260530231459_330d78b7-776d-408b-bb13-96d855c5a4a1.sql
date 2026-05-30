
-- Staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  role text,
  color text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all staff" ON public.staff
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quote returns (post-event reconciliation)
CREATE TABLE public.quote_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  quote_item_id uuid,
  inventory_item_id uuid NOT NULL,
  returned_quantity integer NOT NULL DEFAULT 0,
  damaged_quantity integer NOT NULL DEFAULT 0,
  missing_quantity integer NOT NULL DEFAULT 0,
  condition_notes text,
  returned_by uuid,
  returned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_returns TO authenticated;
GRANT ALL ON public.quote_returns TO service_role;

ALTER TABLE public.quote_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all returns" ON public.quote_returns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_tx_related_quote ON public.inventory_transactions(related_quote_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_quote ON public.rental_calendar_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_cal_events_start ON public.rental_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_returns_quote ON public.quote_returns(quote_id);
