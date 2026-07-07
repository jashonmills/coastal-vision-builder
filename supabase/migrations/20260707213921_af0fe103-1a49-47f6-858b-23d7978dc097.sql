-- 1. inventory_items: remove public read exposure. All app reads go through admin/server code.
DROP POLICY IF EXISTS "public read visible items" ON public.inventory_items;
REVOKE SELECT ON public.inventory_items FROM anon;

-- 2. quote_requests: replace permissive INSERT policy with strict WITH CHECK.
DROP POLICY IF EXISTS "anyone insert quote request" ON public.quote_requests;

CREATE POLICY "public submit quote request"
ON public.quote_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Cannot link to another user's account
  (user_id IS NULL OR user_id = auth.uid())
  AND (customer_id IS NULL OR customer_id = auth.uid())
  -- Cannot set internal workflow fields
  AND (status IS NULL OR status = 'new')
  AND admin_notes IS NULL
);

-- 3. Lock down internal email-queue SECURITY DEFINER functions and pin search_path.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('enqueue_email','delete_email','read_email_batch','move_to_dlq')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn.sig);
  END LOOP;
END$$;

-- 4. handle_new_user is a trigger function — revoke direct execute from clients.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END$$;
