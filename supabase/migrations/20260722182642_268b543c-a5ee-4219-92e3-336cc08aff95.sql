
CREATE TABLE public.contract_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_type text NOT NULL CHECK (contract_type IN ('rental-contract','beacon-contract','catering-contract','credit-card-authorization')),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  event_date date,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  typed_signature text NOT NULL,
  signature_image_path text,
  pdf_path text,
  ip_address text,
  user_agent text
);

GRANT INSERT ON public.contract_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_submissions TO authenticated;
GRANT ALL ON public.contract_submissions TO service_role;

ALTER TABLE public.contract_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a contract"
  ON public.contract_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view contracts"
  ON public.contract_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contracts"
  ON public.contract_submissions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contracts"
  ON public.contract_submissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX contract_submissions_created_at_idx ON public.contract_submissions (created_at DESC);
CREATE INDEX contract_submissions_contract_type_idx ON public.contract_submissions (contract_type);

-- Storage policies for the contract-submissions bucket
CREATE POLICY "Admins can read contract files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contract-submissions' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contract files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'contract-submissions' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'contract-submissions' AND public.has_role(auth.uid(), 'admin'));
