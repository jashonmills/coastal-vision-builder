
-- Helper: is caller an active staff member?
CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = _user_id AND active = true
  );
$$;

-- Allow any active staff member to read all jobs (company calendar).
DROP POLICY IF EXISTS "staff read all jobs" ON public.jobs;
CREATE POLICY "staff read all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.is_active_staff(auth.uid()));
