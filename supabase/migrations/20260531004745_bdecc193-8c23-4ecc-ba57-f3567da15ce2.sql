ALTER TABLE public.spreadsheet_sources
  ADD COLUMN IF NOT EXISTS import_type text,
  ADD COLUMN IF NOT EXISTS column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sheet_range text;