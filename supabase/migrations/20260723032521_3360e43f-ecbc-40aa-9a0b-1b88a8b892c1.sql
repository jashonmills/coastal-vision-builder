
-- expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  job_id uuid NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('fuel','supplies','tolls','meals','equipment','other')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  note text NULL,
  receipt_path text NULL,
  incurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_staff_date_idx ON public.expenses (staff_id, incurred_on DESC);
CREATE INDEX expenses_job_idx ON public.expenses (job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (staff_id = public.current_staff_id())
  WITH CHECK (staff_id = public.current_staff_id());

CREATE POLICY "Admins manage all expenses"
  ON public.expenses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- staff_notes
CREATE TABLE public.staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  job_id uuid NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_notes_staff_idx ON public.staff_notes (staff_id, created_at DESC);
CREATE INDEX staff_notes_job_idx ON public.staff_notes (job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_notes TO authenticated;
GRANT ALL ON public.staff_notes TO service_role;

ALTER TABLE public.staff_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors manage own notes"
  ON public.staff_notes FOR ALL
  TO authenticated
  USING (staff_id = public.current_staff_id())
  WITH CHECK (staff_id = public.current_staff_id());

CREATE POLICY "Admins manage all notes"
  ON public.staff_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assigned staff can read notes attached to their jobs.
CREATE POLICY "Assigned staff read job notes"
  ON public.staff_notes FOR SELECT
  TO authenticated
  USING (
    job_id IS NOT NULL
    AND public.is_staff_on_job(job_id)
  );

-- Storage policies for private "receipts" bucket.
-- Path layout: <staff_id>/<...>
CREATE POLICY "Staff upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = public.current_staff_id()::text
  );

CREATE POLICY "Staff read own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = public.current_staff_id()::text
  );

CREATE POLICY "Staff update own receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = public.current_staff_id()::text
  );

CREATE POLICY "Staff delete own receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = public.current_staff_id()::text
  );

CREATE POLICY "Admins read all receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.has_role(auth.uid(), 'admin')
  );
