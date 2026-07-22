
CREATE TABLE public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quote_id uuid NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  hold_type text NOT NULL CHECK (hold_type IN ('soft','firm')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','expired')),
  expires_at timestamptz NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reservations TO authenticated;
GRANT ALL ON public.inventory_reservations TO service_role;

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reservations"
  ON public.inventory_reservations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_inv_res_item_dates
  ON public.inventory_reservations (inventory_item_id, start_date, end_date);
CREATE INDEX idx_inv_res_quote
  ON public.inventory_reservations (quote_id);
CREATE INDEX idx_inv_res_status_expires
  ON public.inventory_reservations (status, expires_at);

CREATE TRIGGER update_inventory_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Availability function
CREATE OR REPLACE FUNCTION public.inventory_availability(
  p_item uuid,
  p_start date,
  p_end date
) RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (i.total_owned_quantity
      - i.maintenance_quantity
      - i.damaged_missing_quantity
      - COALESCE((
          SELECT SUM(r.quantity)::int
          FROM public.inventory_reservations r
          WHERE r.inventory_item_id = p_item
            AND r.status = 'active'
            AND (r.expires_at IS NULL OR r.expires_at > now())
            AND r.start_date <= p_end
            AND r.end_date >= p_start
        ), 0)
    )::int
  FROM public.inventory_items i
  WHERE i.id = p_item
$$;

-- Reserve inventory (atomic, race-safe)
CREATE OR REPLACE FUNCTION public.reserve_inventory(
  p_item uuid,
  p_quote uuid,
  p_qty integer,
  p_start date,
  p_end date,
  p_hold_type text,
  p_expires timestamptz,
  p_allow_overbook boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_offline int;
  v_reserved int;
  v_available int;
  v_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF p_end < p_start THEN
    RAISE EXCEPTION 'end_date must be >= start_date';
  END IF;
  IF p_hold_type NOT IN ('soft','firm') THEN
    RAISE EXCEPTION 'hold_type must be soft or firm';
  END IF;

  -- Serialize concurrent callers on this item
  SELECT total_owned_quantity, (maintenance_quantity + damaged_missing_quantity)
    INTO v_total, v_offline
  FROM public.inventory_items
  WHERE id = p_item
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item % not found', p_item;
  END IF;

  SELECT COALESCE(SUM(r.quantity),0)::int INTO v_reserved
  FROM public.inventory_reservations r
  WHERE r.inventory_item_id = p_item
    AND r.status = 'active'
    AND (r.expires_at IS NULL OR r.expires_at > now())
    AND r.start_date <= p_end
    AND r.end_date >= p_start;

  v_available := v_total - v_offline - v_reserved;

  IF NOT p_allow_overbook AND v_available < p_qty THEN
    RAISE EXCEPTION 'Insufficient availability: % available, % requested', v_available, p_qty;
  END IF;

  INSERT INTO public.inventory_reservations
    (inventory_item_id, quote_id, quantity, start_date, end_date, hold_type, status, expires_at, created_by)
  VALUES
    (p_item, p_quote, p_qty, p_start, p_end, p_hold_type, 'active', p_expires, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Release all active reservations for a quote
CREATE OR REPLACE FUNCTION public.release_quote_reservations(p_quote uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.inventory_reservations
    SET status = 'released', updated_at = now()
    WHERE quote_id = p_quote AND status = 'active';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
