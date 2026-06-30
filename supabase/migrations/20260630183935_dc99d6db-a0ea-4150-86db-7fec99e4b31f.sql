ALTER TABLE public.quote_requests 
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'rental',
  ADD COLUMN IF NOT EXISTS venue text;

CREATE INDEX IF NOT EXISTS idx_quote_requests_request_type ON public.quote_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_quote_requests_venue ON public.quote_requests(venue);