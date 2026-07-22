DO $$
DECLARE
  q RECORD;
  li RECORD;
BEGIN
  FOR q IN
    SELECT id, event_date
      FROM public.quotes
     WHERE status = 'booked'
       AND event_date IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.inventory_reservations r WHERE r.quote_id = quotes.id)
  LOOP
    FOR li IN
      SELECT COALESCE(qi.inventory_item_id, m.inventory_item_id) AS inv_id,
             SUM(qi.quantity)::int AS qty
        FROM public.quote_items qi
        LEFT JOIN public.pricing_inventory_mappings m
          ON m.pricing_item_id = qi.pricing_item_id AND m.active = TRUE
       WHERE qi.quote_id = q.id
         AND COALESCE(qi.inventory_item_id, m.inventory_item_id) IS NOT NULL
         AND LOWER(COALESCE(qi.category,'')) NOT IN ('delivery','venue','service','fee','labor','cleaning fee')
       GROUP BY COALESCE(qi.inventory_item_id, m.inventory_item_id)
    LOOP
      IF li.qty > 0 THEN
        PERFORM public.reserve_inventory(
          p_item := li.inv_id,
          p_quote := q.id,
          p_qty := li.qty,
          p_start := (q.event_date - 1)::date,
          p_end := (q.event_date + 1)::date,
          p_hold_type := 'firm',
          p_expires := NULL,
          p_allow_overbook := TRUE
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;