
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  job_id UUID NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'job'
    CHECK (category IN ('job','warehouse','maintenance','travel','admin','other')),
  task_label TEXT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

CREATE INDEX time_entries_staff_clock_in_idx ON public.time_entries (staff_id, clock_in DESC);
CREATE INDEX time_entries_job_idx ON public.time_entries (job_id);
-- Guarantees no two OPEN entries per staff member
CREATE UNIQUE INDEX time_entries_one_open_per_staff
  ON public.time_entries (staff_id) WHERE clock_out IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read own time entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (staff_id = public.current_staff_id());

CREATE POLICY "staff insert own time entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (staff_id = public.current_staff_id());

CREATE POLICY "staff update own time entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (staff_id = public.current_staff_id())
  WITH CHECK (staff_id = public.current_staff_id());

CREATE POLICY "admins manage all time entries" ON public.time_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
