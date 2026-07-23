
ALTER TABLE public.job_pull_lines
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid NULL REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_returned_ok int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_cleaning   int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_damaged    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_missing    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_notes       text NULL,
  ADD COLUMN IF NOT EXISTS checked_in_at       timestamptz NULL,
  ADD COLUMN IF NOT EXISTS checked_in_by       uuid NULL,
  ADD COLUMN IF NOT EXISTS checked_out_applied boolean NOT NULL DEFAULT false;

ALTER TABLE public.job_pull_lines
  DROP CONSTRAINT IF EXISTS job_pull_lines_returned_nonneg_check;
ALTER TABLE public.job_pull_lines
  ADD CONSTRAINT job_pull_lines_returned_nonneg_check
  CHECK (
    quantity_returned_ok >= 0
    AND quantity_cleaning   >= 0
    AND quantity_damaged    >= 0
    AND quantity_missing    >= 0
  );

CREATE INDEX IF NOT EXISTS idx_job_pull_lines_inventory_item
  ON public.job_pull_lines(inventory_item_id);
