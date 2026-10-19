CREATE TABLE public.qa_dispatched_calendars(url text,headers jsonb,body jsonb,timeout_ms integer);
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE plpgsql AS $$BEGIN INSERT INTO public.qa_dispatched_calendars VALUES(url,headers,body,timeout_milliseconds);RETURN 123;END$$;
INSERT INTO vault.decrypted_secrets VALUES('hockey_calendar_sync_dispatch','{"url":"https://test.supabase.co","apikey":"test-public","secret":"test-calendar-private"}');
\ir ../../supabase/migrations/20261019093738_private_calendar_schedule.sql
DO $$DECLARE r record;BEGIN
 IF public.dispatch_calendar_sync()<>123 THEN RAISE EXCEPTION 'Calendar dispatch failed';END IF;
 SELECT * INTO STRICT r FROM public.qa_dispatched_calendars;
 IF r.url<>'https://test.supabase.co/functions/v1/sync-schedule' OR r.headers->>'Authorization'<>'Bearer test-public' OR r.headers->>'x-hockey-calendar-secret'<>'test-calendar-private' OR r.body->>'action'<>'sync_all' OR r.timeout_ms<>130000 THEN RAISE EXCEPTION 'Calendar dispatch has incorrect target, credentials or payload';END IF;
 IF has_function_privilege('anon','public.dispatch_calendar_sync()','EXECUTE') OR has_function_privilege('authenticated','public.dispatch_calendar_sync()','EXECUTE') THEN RAISE EXCEPTION 'Calendar dispatch is publicly executable';END IF;
 DELETE FROM vault.decrypted_secrets WHERE name='hockey_calendar_sync_dispatch';
 IF public.dispatch_calendar_sync() IS NOT NULL OR (SELECT count(*) FROM public.qa_dispatched_calendars)<>1 THEN RAISE EXCEPTION 'Missing config dispatched a request';END IF;
END$$;
