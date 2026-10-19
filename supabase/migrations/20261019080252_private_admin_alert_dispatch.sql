-- Public API credentials must not authorize privileged alert dispatch.
CREATE OR REPLACE FUNCTION public.notify_urgent_admin_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_secret text;
BEGIN
  IF NEW.severity='urgent' AND NEW.emailed_at IS NULL THEN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name='hockey_admin_alert_dispatch' LIMIT 1;
    IF v_secret IS NULL THEN
      RAISE WARNING 'Urgent admin alert dispatch is not configured';
      RETURN NEW;
    END IF;
    PERFORM net.http_post(
      url:='https://xonpnkzkvqxarbxpinhm.supabase.co/functions/v1/send-admin-activity-email',
      headers:=jsonb_build_object('Content-Type','application/json','x-admin-alert-secret',v_secret),
      body:=jsonb_build_object('event_id',NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_urgent_admin_event() FROM PUBLIC,anon,authenticated;
