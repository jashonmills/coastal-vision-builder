
CREATE TABLE public.job_pull_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  quote_item_id uuid NULL REFERENCES public.quote_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NULL,
  quantity_required integer NOT NULL DEFAULT 1,
  quantity_pulled integer NOT NULL DEFAULT 0 CHECK (quantity_pulled >= 0),
  pulled_at timestamptz NULL,
  pulled_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, quote_item_id)
);
CREATE INDEX idx_job_pull_lines_job ON public.job_pull_lines(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_pull_lines TO authenticated;
GRANT ALL ON public.job_pull_lines TO service_role;

ALTER TABLE public.job_pull_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage pull lines" ON public.job_pull_lines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "assigned staff select pull lines" ON public.job_pull_lines
  FOR SELECT TO authenticated
  USING (public.is_staff_on_job(job_id));

CREATE POLICY "assigned staff update pull lines" ON public.job_pull_lines
  FOR UPDATE TO authenticated
  USING (public.is_staff_on_job(job_id))
  WITH CHECK (public.is_staff_on_job(job_id));

CREATE POLICY "assigned staff insert pull lines" ON public.job_pull_lines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_on_job(job_id));

CREATE TRIGGER update_job_pull_lines_updated_at
  BEFORE UPDATE ON public.job_pull_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
