
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.quote_number_seq');
  RETURN 'Q-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
END;
$$;
