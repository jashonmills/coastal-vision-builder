ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS cleaning_auto boolean NOT NULL DEFAULT true;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS is_auto boolean NOT NULL DEFAULT false;

INSERT INTO public.site_content (key, value)
VALUES ('lodging_tax_rate_bps', '1000'::jsonb)
ON CONFLICT (key) DO NOTHING;