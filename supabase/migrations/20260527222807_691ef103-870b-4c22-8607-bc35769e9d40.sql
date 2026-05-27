
ALTER TABLE public.saved_recommendations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'plan_created',
  ADD COLUMN IF NOT EXISTS quote_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS booked_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_request_note text,
  ADD COLUMN IF NOT EXISTS quote_request_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_confirmation_sent_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_recommendations_status_check'
  ) THEN
    ALTER TABLE public.saved_recommendations
      ADD CONSTRAINT saved_recommendations_status_check
      CHECK (status IN ('plan_created','quote_requested','quote_sent','booked','archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS saved_recommendations_user_active_idx
  ON public.saved_recommendations (user_id)
  WHERE deleted_at IS NULL;
