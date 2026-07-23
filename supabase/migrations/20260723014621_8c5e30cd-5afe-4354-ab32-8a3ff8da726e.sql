
-- 1. Jobs table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.quotes(id) ON DELETE CASCADE,
  customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  title text,
  event_date date,
  start_time timestamptz NULL,
  end_time timestamptz NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN (
    'booked','prep','loaded','en_route','on_site','event','teardown',
    'picked_up','returned','reconciled','closed','cancelled'
  )),
  site_address text,
  site_contact_name text,
  site_contact_phone text,
  gate_code text,
  parking_notes text,
  access_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_event_date ON public.jobs(event_date);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_quote ON public.jobs(quote_id);
CREATE INDEX idx_jobs_customer ON public.jobs(customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_jobs_updated
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SECURITY DEFINER helper: is caller crewed on this job's quote?
CREATE OR REPLACE FUNCTION public.is_staff_on_job(_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.rental_calendar_events e ON e.quote_id = j.quote_id
    JOIN public.event_staff es ON es.event_id = e.id
    WHERE j.id = _job_id
      AND es.staff_id = public.current_staff_id()
  );
$$;

CREATE POLICY "admin all jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff read own jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_staff_on_job(id));

-- 2. event_staff acknowledgment fields
ALTER TABLE public.event_staff
  ADD COLUMN ack_status text NOT NULL DEFAULT 'assigned'
    CHECK (ack_status IN ('assigned','accepted','declined')),
  ADD COLUMN acknowledged_at timestamptz NULL,
  ADD COLUMN decline_reason text NULL;

-- Staff can update their own assignment (used for ack); admin policy already covers admins.
CREATE POLICY "staff update own assignment ack" ON public.event_staff
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_id())
  WITH CHECK (staff_id = public.current_staff_id());

-- 3. Backfill: one job per booked / pending_confirmation quote
INSERT INTO public.jobs (quote_id, customer_id, title, event_date, site_address, status)
SELECT q.id,
       q.customer_id,
       COALESCE(q.customer_name, '') ||
         CASE WHEN q.event_date IS NOT NULL THEN ' — ' || to_char(q.event_date, 'YYYY-MM-DD') ELSE '' END,
       q.event_date,
       q.event_location,
       'booked'
  FROM public.quotes q
  LEFT JOIN public.jobs j ON j.quote_id = q.id
 WHERE q.status IN ('booked','pending_confirmation')
   AND j.id IS NULL;
