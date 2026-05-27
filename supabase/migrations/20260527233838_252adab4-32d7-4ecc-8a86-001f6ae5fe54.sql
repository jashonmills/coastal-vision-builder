
-- spreadsheet_sources
CREATE TABLE public.spreadsheet_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_name text NOT NULL,
  provider text NOT NULL DEFAULT 'upload',
  file_url text,
  external_spreadsheet_id text,
  external_sheet_name text,
  sync_enabled boolean NOT NULL DEFAULT false,
  sync_frequency text NOT NULL DEFAULT 'manual',
  last_synced_at timestamptz,
  last_sync_status text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheet_sources TO authenticated;
GRANT ALL ON public.spreadsheet_sources TO service_role;
ALTER TABLE public.spreadsheet_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all sources" ON public.spreadsheet_sources FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- spreadsheet_imports
CREATE TABLE public.spreadsheet_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_source_id uuid REFERENCES public.spreadsheet_sources(id) ON DELETE SET NULL,
  import_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rows_detected integer NOT NULL DEFAULT 0,
  rows_imported integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_file_name text,
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheet_imports TO authenticated;
GRANT ALL ON public.spreadsheet_imports TO service_role;
ALTER TABLE public.spreadsheet_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all imports" ON public.spreadsheet_imports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- spreadsheet_sync_logs
CREATE TABLE public.spreadsheet_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_source_id uuid REFERENCES public.spreadsheet_sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  rows_checked integer NOT NULL DEFAULT 0,
  rows_updated integer NOT NULL DEFAULT 0,
  rows_created integer NOT NULL DEFAULT 0,
  rows_skipped integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spreadsheet_sync_logs TO authenticated;
GRANT ALL ON public.spreadsheet_sync_logs TO service_role;
ALTER TABLE public.spreadsheet_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all sync logs" ON public.spreadsheet_sync_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- rental_calendar_events
CREATE TABLE public.rental_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  customer_id uuid,
  quote_id uuid,
  quote_request_id uuid,
  rental_event_id uuid,
  saved_recommendation_id uuid,
  location text,
  notes text,
  assigned_to uuid,
  color text,
  external_calendar_provider text,
  external_calendar_event_id text,
  sync_to_external_calendar boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX idx_calendar_events_start ON public.rental_calendar_events(start_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_type ON public.rental_calendar_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_qr ON public.rental_calendar_events(quote_request_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_calendar_events TO authenticated;
GRANT ALL ON public.rental_calendar_events TO service_role;
ALTER TABLE public.rental_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all calendar events" ON public.rental_calendar_events FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_sources_updated BEFORE UPDATE ON public.spreadsheet_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_calendar_updated BEFORE UPDATE ON public.rental_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- private storage bucket for spreadsheet uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('spreadsheet-uploads', 'spreadsheet-uploads', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin read spreadsheet uploads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'spreadsheet-uploads' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert spreadsheet uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'spreadsheet-uploads' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update spreadsheet uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'spreadsheet-uploads' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete spreadsheet uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'spreadsheet-uploads' AND has_role(auth.uid(), 'admin'));
