
REVOKE ALL ON FUNCTION public.reserve_inventory(uuid,uuid,integer,date,date,text,timestamptz,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_quote_reservations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_availability(uuid,date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory(uuid,uuid,integer,date,date,text,timestamptz,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_quote_reservations(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_availability(uuid,date,date) TO service_role, authenticated;
