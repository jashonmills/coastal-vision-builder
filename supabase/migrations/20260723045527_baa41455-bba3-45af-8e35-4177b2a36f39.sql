
-- Extend pull lines with damage photo attachments (private, from crew check-in)
ALTER TABLE public.job_pull_lines
  ADD COLUMN IF NOT EXISTS damage_photo_paths text[] NOT NULL DEFAULT '{}';

-- Storage policies for private "job-photos" bucket.
-- Path layout: <job_id>/<staff_id>/<uuid>.<ext>
-- The bucket itself is created via the storage_create_bucket tool.
CREATE POLICY "Job photos: staff-on-job upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND public.is_staff_on_job(((storage.foldername(name))[1])::uuid)
    AND (storage.foldername(name))[2] = public.current_staff_id()::text
  );

CREATE POLICY "Job photos: staff-on-job read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND public.is_staff_on_job(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Job photos: admins read all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Job photos: uploader delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[2] = public.current_staff_id()::text
  );
