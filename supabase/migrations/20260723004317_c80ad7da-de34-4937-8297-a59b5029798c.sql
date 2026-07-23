
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz NULL;
