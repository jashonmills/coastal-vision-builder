
-- 1) quotes: add customer_user_id
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_customer_user ON public.quotes(customer_user_id);

-- Backfill from saved recommendation owner where linked
UPDATE public.quotes q
SET customer_user_id = sr.user_id
FROM public.saved_recommendations sr
WHERE q.customer_user_id IS NULL
  AND q.saved_recommendation_id = sr.id
  AND sr.user_id IS NOT NULL;

-- Backfill remaining rows by matching email to auth.users
UPDATE public.quotes q
SET customer_user_id = u.id
FROM auth.users u
WHERE q.customer_user_id IS NULL
  AND lower(q.customer_email) = lower(u.email);

-- 2) contract_submissions: add customer_user_id + quote_id
ALTER TABLE public.contract_submissions
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'signed';

CREATE INDEX IF NOT EXISTS idx_contract_submissions_user ON public.contract_submissions(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_contract_submissions_quote ON public.contract_submissions(quote_id);

UPDATE public.contract_submissions cs
SET customer_user_id = u.id
FROM auth.users u
WHERE cs.customer_user_id IS NULL
  AND lower(cs.customer_email) = lower(u.email);

-- 3) RLS: allow customers to read their own quotes
DROP POLICY IF EXISTS "own quotes select" ON public.quotes;
CREATE POLICY "own quotes select" ON public.quotes
  FOR SELECT
  TO authenticated
  USING (
    customer_user_id = auth.uid()
    OR lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 4) RLS: quote_items readable when the parent quote is readable
DROP POLICY IF EXISTS "own quote_items select" ON public.quote_items;
CREATE POLICY "own quote_items select" ON public.quote_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
        AND (
          q.customer_user_id = auth.uid()
          OR lower(q.customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );

-- 5) RLS: contract_submissions readable by owning customer
DROP POLICY IF EXISTS "own contracts select" ON public.contract_submissions;
CREATE POLICY "own contracts select" ON public.contract_submissions
  FOR SELECT
  TO authenticated
  USING (
    customer_user_id = auth.uid()
    OR lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
