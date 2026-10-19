CREATE OR REPLACE FUNCTION public.dispatch_calendar_sync()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_config jsonb; v_job bigint;
BEGIN
 SELECT decrypted_secret::jsonb INTO v_config FROM vault.decrypted_secrets WHERE name='hockey_calendar_sync_dispatch' LIMIT 1;
 IF v_config IS NULL OR coalesce(v_config->>'secret','')='' OR coalesce(v_config->>'apikey','')='' OR coalesce(v_config->>'url','') !~ '^https://[a-z0-9]+\.supabase\.co$' THEN
  RAISE WARNING 'Calendar dispatch is not configured';RETURN NULL;
 END IF;
 RETURN net.http_post(url:=(v_config->>'url')||'/functions/v1/sync-schedule',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(v_config->>'apikey'),'apikey',v_config->>'apikey','x-hockey-calendar-secret',v_config->>'secret'),body:=jsonb_build_object('action','sync_all'),timeout_milliseconds:=130000);
END$$;
REVOKE ALL ON FUNCTION public.dispatch_calendar_sync() FROM PUBLIC,anon,authenticated;
DO $$DECLARE v_job bigint;BEGIN
 IF to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL THEN
  v_job:=cron.schedule('hockey-calendar-sync','*/15 * * * *','SELECT public.dispatch_calendar_sync();');
  -- Activate only after matching Vault/function secrets have been configured and verified.
  PERFORM cron.alter_job(job_id:=v_job,active:=false);
 END IF;
END$$;
