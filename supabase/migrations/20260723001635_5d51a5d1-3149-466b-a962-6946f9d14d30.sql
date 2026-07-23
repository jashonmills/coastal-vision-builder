
-- Allowed staff role capabilities
-- driver, assembler, bartender, server, chef, coordinator, other

-- 1a. Add roles[] to staff + backfill from legacy single role text
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_roles_allowed;
ALTER TABLE public.staff
  ADD CONSTRAINT staff_roles_allowed
  CHECK (roles <@ ARRAY['driver','assembler','bartender','server','chef','coordinator','other']::text[]);

UPDATE public.staff
   SET roles = ARRAY[lower(trim(role))]
 WHERE (roles IS NULL OR array_length(roles, 1) IS NULL)
   AND role IS NOT NULL
   AND lower(trim(role)) IN ('driver','assembler','bartender','server','chef','coordinator','other');

-- 1b. Ensure staff.user_id has a real FK to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_user_id_fkey' AND conrelid = 'public.staff'::regclass
  ) THEN
    ALTER TABLE public.staff
      ADD CONSTRAINT staff_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS staff_user_id_unique
  ON public.staff(user_id) WHERE user_id IS NOT NULL;

-- 1c. event_staff join table
CREATE TABLE IF NOT EXISTS public.event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.rental_calendar_events(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  role text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_staff_unique UNIQUE (event_id, staff_id),
  CONSTRAINT event_staff_role_allowed CHECK (
    role IS NULL OR role = ANY (ARRAY['driver','assembler','bartender','server','chef','coordinator','other'])
  )
);

CREATE INDEX IF NOT EXISTS idx_event_staff_event ON public.event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_staff ON public.event_staff(staff_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT ALL ON public.event_staff TO service_role;

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: current caller's active staff id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.staff
   WHERE user_id = auth.uid() AND active = true
   LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;

-- 1d. Policies
DROP POLICY IF EXISTS "admin all event_staff" ON public.event_staff;
CREATE POLICY "admin all event_staff" ON public.event_staff
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "staff read own assignments" ON public.event_staff;
CREATE POLICY "staff read own assignments" ON public.event_staff
  FOR SELECT TO authenticated
  USING (staff_id = public.current_staff_id());

-- Staff: add self-read policy (keep existing admin-all policy)
DROP POLICY IF EXISTS "staff read own row" ON public.staff;
CREATE POLICY "staff read own row" ON public.staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- rental_calendar_events: let staff read events they're assigned to
DROP POLICY IF EXISTS "staff read assigned events" ON public.rental_calendar_events;
CREATE POLICY "staff read assigned events" ON public.rental_calendar_events
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT es.event_id FROM public.event_staff es
      WHERE es.staff_id = public.current_staff_id()
    )
  );
