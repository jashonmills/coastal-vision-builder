
-- Sequence + helper for quote numbers like Q-2026-0001
CREATE SEQUENCE IF NOT EXISTS public.quote_number_seq;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.quote_number_seq');
  RETURN 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
END;
$$;

-- ============ quote_requests ============
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  customer_id uuid,
  saved_recommendation_id uuid,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  preferred_contact_method text NOT NULL DEFAULT 'email',
  event_type text,
  event_date date,
  event_location text,
  guest_count integer,
  planner_input jsonb,
  recommendation jsonb,
  pdf_url text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  customer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_quote_requests_created ON public.quote_requests(created_at DESC);
CREATE INDEX idx_quote_requests_saved_rec ON public.quote_requests(saved_recommendation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO authenticated;
GRANT INSERT ON public.quote_requests TO anon;
GRANT ALL ON public.quote_requests TO service_role;

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a quote request (form is public-facing)
CREATE POLICY "anyone insert quote request" ON public.quote_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admin select quote requests" ON public.quote_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin update quote requests" ON public.quote_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete quote requests" ON public.quote_requests
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_quote_requests_updated
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ quotes ============
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  saved_recommendation_id uuid,
  quote_number text NOT NULL UNIQUE DEFAULT public.generate_quote_number(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  event_type text,
  event_date date,
  event_location text,
  guest_count integer,
  status text NOT NULL DEFAULT 'draft',
  subtotal_cents integer NOT NULL DEFAULT 0,
  delivery_fee_cents integer NOT NULL DEFAULT 0,
  cleaning_fee_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  customer_notes text,
  internal_notes text,
  terms text,
  sent_at timestamptz,
  approved_at timestamptz,
  booked_at timestamptz,
  -- reserved for future Stripe phase
  deposit_amount_cents integer,
  amount_paid_cents integer,
  payment_status text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created ON public.quotes(created_at DESC);
CREATE INDEX idx_quotes_request ON public.quotes(quote_request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select quotes" ON public.quotes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin insert quotes" ON public.quotes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin update quotes" ON public.quotes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin delete quotes" ON public.quotes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_quotes_updated
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ quote_items ============
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  pricing_item_id uuid,
  inventory_item_id uuid,
  category text,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,
  needs_pricing_review boolean NOT NULL DEFAULT false,
  reason text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select quote_items" ON public.quote_items
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin insert quote_items" ON public.quote_items
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin update quote_items" ON public.quote_items
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin delete quote_items" ON public.quote_items
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_quote_items_updated
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ pricing_inventory_mappings ============
CREATE TABLE public.pricing_inventory_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_item_id uuid REFERENCES public.pricing_items(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  recommendation_keyword text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mapping_keyword ON public.pricing_inventory_mappings(recommendation_keyword);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_inventory_mappings TO authenticated;
GRANT ALL ON public.pricing_inventory_mappings TO service_role;

ALTER TABLE public.pricing_inventory_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select mappings" ON public.pricing_inventory_mappings
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin insert mappings" ON public.pricing_inventory_mappings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin update mappings" ON public.pricing_inventory_mappings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin delete mappings" ON public.pricing_inventory_mappings
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_mappings_updated
  BEFORE UPDATE ON public.pricing_inventory_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
