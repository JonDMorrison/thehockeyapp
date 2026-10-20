-- Deterministic midnight/DST boundaries; no application records are changed.
DO $$
DECLARE zone text; instant timestamptz; expected date;
BEGIN
 FOR zone,instant,expected IN SELECT * FROM (VALUES
 ('America/Vancouver','2026-10-20 06:59:59+00'::timestamptz,'2026-10-19'::date),
 ('America/Vancouver','2026-10-20 07:00:00+00'::timestamptz,'2026-10-20'::date),
 ('Asia/Tokyo','2026-10-20 14:59:59+00'::timestamptz,'2026-10-20'::date),
 ('Asia/Tokyo','2026-10-20 15:00:00+00'::timestamptz,'2026-10-21'::date),
 ('America/New_York','2026-11-01 05:30:00+00'::timestamptz,'2026-11-01'::date),
 ('America/New_York','2026-11-01 06:30:00+00'::timestamptz,'2026-11-01'::date),
 ('America/Vancouver','2026-03-08 09:59:59+00'::timestamptz,'2026-03-08'::date),
 ('America/Vancouver','2026-03-08 10:00:00+00'::timestamptz,'2026-03-08'::date)
 ) cases(zone,instant,expected)
 LOOP
  PERFORM set_config('TimeZone',zone,true);
  IF (instant AT TIME ZONE current_setting('TimeZone'))::date IS DISTINCT FROM expected THEN
   RAISE EXCEPTION 'Wrong local date for % at %',zone,instant;
  END IF;
 END LOOP;
END $$;
