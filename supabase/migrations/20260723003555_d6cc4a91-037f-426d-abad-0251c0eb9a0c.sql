
-- Allow guest-owned saved plans and capture the customer email for backfill.
ALTER TABLE public.saved_recommendations ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.saved_recommendations ADD COLUMN IF NOT EXISTS customer_email text;
CREATE INDEX IF NOT EXISTS idx_saved_rec_customer_email_lower
  ON public.saved_recommendations (lower(customer_email));

-- Extend the new-user handler to backfill guest saved plans and quote requests by email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  IF NEW.email IS NOT NULL THEN
    UPDATE public.saved_recommendations
       SET user_id = NEW.id
     WHERE user_id IS NULL
       AND lower(customer_email) = lower(NEW.email);

    UPDATE public.quote_requests
       SET user_id = NEW.id
     WHERE user_id IS NULL
       AND lower(customer_email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;
