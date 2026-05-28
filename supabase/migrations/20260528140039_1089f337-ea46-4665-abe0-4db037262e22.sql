
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notifications_created ON public.admin_notifications (created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications (read_at) WHERE read_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin select notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin update notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin delete notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
