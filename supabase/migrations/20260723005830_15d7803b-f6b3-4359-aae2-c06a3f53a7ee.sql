
-- 1. Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  company text,
  notes text,
  lifecycle_stage text NOT NULL DEFAULT 'lead'
    CHECK (lifecycle_stage IN ('lead','quoted','booked','repeat','archived')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_lower_idx ON public.customers (lower(email));
CREATE INDEX customers_user_id_idx ON public.customers (user_id);
CREATE INDEX customers_lifecycle_idx ON public.customers (lifecycle_stage);
CREATE INDEX customers_last_activity_idx ON public.customers (last_activity_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "customer reads own record"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add customer_id links
ALTER TABLE public.quotes
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX quotes_customer_id_idx ON public.quotes (customer_id);

ALTER TABLE public.contract_submissions
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX contract_submissions_customer_id_idx ON public.contract_submissions (customer_id);

-- Ensure FK on existing quote_requests.customer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quote_requests_customer_id_fkey'
  ) THEN
    ALTER TABLE public.quote_requests
      ADD CONSTRAINT quote_requests_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS quote_requests_customer_id_idx ON public.quote_requests (customer_id);

-- 3. Backfill (idempotent — skip if customers already has rows)
DO $$
DECLARE
  existing_count int;
BEGIN
  SELECT count(*) INTO existing_count FROM public.customers;
  IF existing_count > 0 THEN
    RAISE NOTICE 'customers table already populated, skipping backfill';
    RETURN;
  END IF;

  -- Aggregate distinct emails from all three sources
  WITH src AS (
    SELECT lower(customer_email) AS email_lc, customer_email AS email_raw,
           customer_name AS name, customer_phone AS phone,
           user_id AS uid, status, created_at AS ts, 'request' AS kind
      FROM public.quote_requests
      WHERE customer_email IS NOT NULL AND customer_email <> ''
    UNION ALL
    SELECT lower(customer_email), customer_email,
           customer_name, customer_phone,
           customer_user_id, status, created_at, 'quote'
      FROM public.quotes
      WHERE customer_email IS NOT NULL AND customer_email <> ''
    UNION ALL
    SELECT lower(customer_email), customer_email,
           customer_name, customer_phone,
           customer_user_id, NULL, created_at, 'contract'
      FROM public.contract_submissions
      WHERE customer_email IS NOT NULL AND customer_email <> ''
  ),
  agg AS (
    SELECT
      email_lc,
      (array_agg(email_raw ORDER BY ts DESC))[1] AS email,
      (array_agg(name ORDER BY (name IS NULL), ts DESC))[1] AS name,
      (array_agg(phone ORDER BY (phone IS NULL), ts DESC))[1] AS phone,
      (array_agg(uid ORDER BY (uid IS NULL), ts DESC))[1] AS user_id,
      min(ts) AS first_ts,
      max(ts) AS last_ts,
      bool_or(kind = 'quote' AND status IN ('booked','pending_confirmation')) AS has_booked,
      bool_or(kind = 'quote') AS has_quote
    FROM src
    GROUP BY email_lc
  )
  INSERT INTO public.customers (email, name, phone, user_id, first_seen_at, last_activity_at, lifecycle_stage)
  SELECT email, name, phone, user_id, first_ts, last_ts,
         CASE WHEN has_booked THEN 'booked'
              WHEN has_quote THEN 'quoted'
              ELSE 'lead' END
    FROM agg;

  -- Link source rows
  UPDATE public.quote_requests qr
    SET customer_id = c.id
    FROM public.customers c
    WHERE lower(qr.customer_email) = lower(c.email)
      AND qr.customer_id IS NULL;

  UPDATE public.quotes q
    SET customer_id = c.id
    FROM public.customers c
    WHERE lower(q.customer_email) = lower(c.email)
      AND q.customer_id IS NULL;

  UPDATE public.contract_submissions cs
    SET customer_id = c.id
    FROM public.customers c
    WHERE lower(cs.customer_email) = lower(c.email)
      AND cs.customer_id IS NULL;
END$$;
