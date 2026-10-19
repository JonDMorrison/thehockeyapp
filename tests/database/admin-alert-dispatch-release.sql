CREATE SCHEMA vault;
CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
INSERT INTO vault.decrypted_secrets VALUES('hockey_admin_alert_dispatch','test-private-dispatch-token');
CREATE SCHEMA net;
CREATE TABLE public.qa_dispatched_alerts(url text,headers jsonb,body jsonb);
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb) RETURNS bigint LANGUAGE plpgsql AS $$BEGIN INSERT INTO public.qa_dispatched_alerts VALUES(url,headers,body);RETURN 1;END$$;
CREATE TABLE public.qa_admin_events(id uuid,severity text,emailed_at timestamptz);
\ir ../../supabase/migrations/20261019080252_private_admin_alert_dispatch.sql
CREATE TRIGGER qa_urgent_dispatch AFTER INSERT ON public.qa_admin_events FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_admin_event();
INSERT INTO public.qa_admin_events VALUES('00000000-0000-4000-8000-000000000001','info',null),('00000000-0000-4000-8000-000000000002','urgent',now());
DO $$BEGIN IF EXISTS(SELECT 1 FROM public.qa_dispatched_alerts)THEN RAISE EXCEPTION 'Nonurgent/already sent events were dispatched';END IF;END$$;
INSERT INTO public.qa_admin_events VALUES('00000000-0000-4000-8000-000000000003','urgent',null);
DO $$DECLARE v record;BEGIN
 SELECT * INTO STRICT v FROM public.qa_dispatched_alerts;
 IF v.headers->>'x-admin-alert-secret'<>'test-private-dispatch-token' OR v.headers?'Authorization' OR v.body->>'event_id'<>'00000000-0000-4000-8000-000000000003' THEN RAISE EXCEPTION 'Alert dispatch used incorrect credentials/payload';END IF;
 IF has_function_privilege('authenticated','public.notify_urgent_admin_event()','EXECUTE') OR has_function_privilege('anon','public.notify_urgent_admin_event()','EXECUTE') THEN RAISE EXCEPTION 'Public alert execution privilege remains';END IF;
END$$;
