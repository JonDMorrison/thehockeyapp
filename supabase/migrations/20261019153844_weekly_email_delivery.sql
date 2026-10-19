ALTER TABLE public.email_preferences
 ADD COLUMN coach_digest_confirmed_at timestamptz,
 ADD COLUMN player_progress_confirmed_at timestamptz;
ALTER TABLE public.email_preferences ALTER COLUMN weekly_coach_digest SET DEFAULT false;
ALTER TABLE public.email_preferences ALTER COLUMN player_weekly_progress SET DEFAULT false;

CREATE FUNCTION public.weekly_email_metrics(p_player_id uuid,p_week_start date,p_week_end date,p_team_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_week_start IS NULL OR p_week_end IS NULL OR p_week_end-p_week_start<>7 OR p_week_end>current_date OR NOT EXISTS(SELECT 1 FROM public.players WHERE id=p_player_id) THEN RAISE EXCEPTION 'Invalid weekly recap window'; END IF;
 RETURN jsonb_build_object(
  'sessions',(SELECT count(*) FROM session_completions s JOIN practice_cards c ON c.id=s.practice_card_id WHERE s.player_id=p_player_id AND s.status='complete' AND c.date>=p_week_start AND c.date<p_week_end AND (p_team_id IS NULL OR c.team_id=p_team_id))+
    CASE WHEN p_team_id IS NULL THEN (SELECT count(*) FROM personal_session_completions s JOIN personal_practice_cards c ON c.id=s.personal_practice_card_id WHERE s.player_id=p_player_id AND c.player_id=p_player_id AND s.status='complete' AND c.date>=p_week_start AND c.date<p_week_end) ELSE 0 END,
  'shots',coalesce((SELECT sum(x.shots_logged) FROM task_completions x JOIN practice_tasks t ON t.id=x.practice_task_id JOIN practice_cards c ON c.id=t.practice_card_id WHERE x.player_id=p_player_id AND c.date>=p_week_start AND c.date<p_week_end AND (p_team_id IS NULL OR c.team_id=p_team_id)),0)+
    coalesce((SELECT sum(d.shots) FROM shooting_challenge_days d JOIN shooting_challenges c ON c.id=d.challenge_id WHERE d.player_id=p_player_id AND d.shot_date>=p_week_start AND d.shot_date<p_week_end AND (p_team_id IS NULL OR c.team_id=p_team_id)),0),
  'targetShots',CASE WHEN p_team_id IS NULL THEN coalesce((SELECT sum(t.shots_expected) FROM personal_task_completions x JOIN personal_practice_tasks t ON t.id=x.personal_practice_task_id JOIN personal_practice_cards c ON c.id=t.personal_practice_card_id WHERE x.player_id=p_player_id AND c.player_id=p_player_id AND x.completed AND c.date>=p_week_start AND c.date<p_week_end),0) ELSE 0 END
 );
END $$;
REVOKE ALL ON FUNCTION public.weekly_email_metrics(uuid,date,date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_email_metrics(uuid,date,date,uuid) TO service_role;

CREATE FUNCTION public.dispatch_weekly_email_page(p_kind text,p_offset integer DEFAULT 0)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cfg jsonb; request_id bigint; BEGIN
 IF p_kind NOT IN ('coach','parent') OR p_offset<0 OR p_offset>100000 OR p_offset%50<>0 THEN RAISE EXCEPTION 'Invalid email page'; END IF;
 SELECT decrypted_secret::jsonb INTO cfg FROM vault.decrypted_secrets WHERE name='hockey_weekly_email_dispatch' LIMIT 1;
 IF cfg IS NULL OR NOT(cfg ? 'url' AND cfg ? 'secret') THEN RAISE EXCEPTION 'Weekly email dispatch not configured'; END IF;
 SELECT net.http_post(url:=cfg->>'url'||'/functions/v1/'||CASE WHEN p_kind='coach' THEN 'weekly-digest-cron' ELSE 'player-weekly-progress-cron' END,
 headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',cfg->>'secret'),body:=jsonb_build_object('offset',p_offset),timeout_milliseconds:=130000) INTO request_id;
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_weekly_email_page(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_weekly_email_page(text,integer) TO service_role;
DO $$ DECLARE j bigint; BEGIN
 j:=cron.schedule('hockey-weekly-coach-email','0 17 * * 1,2',$job$SELECT public.dispatch_weekly_email_page('coach',0);$job$); PERFORM cron.alter_job(j,active:=false);
 j:=cron.schedule('hockey-weekly-parent-email','15 17 * * 1,2',$job$SELECT public.dispatch_weekly_email_page('parent',0);$job$); PERFORM cron.alter_job(j,active:=false);
END $$;

-- Fail closed after the provider idempotency window rather than risk a duplicate after a lost response.
CREATE OR REPLACE FUNCTION public.claim_email_delivery(p_key text,p_actor uuid,p_recipient_hash text,p_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.email_delivery_attempts; BEGIN
 IF p_key !~ '^hockey-[0-9a-f]{64}$' OR p_recipient_hash !~ '^[0-9a-f]{64}$' OR p_type NOT IN ('coach_welcome','parent_invitation','association_invitation','weekly_coach_digest','player_weekly_progress') THEN RAISE EXCEPTION 'Invalid delivery metadata'; END IF;
 -- Serialize concurrent actor requests before counting; separately serialize same-event retries.
 IF p_actor IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,104)); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_key,105));
 SELECT * INTO existing FROM public.email_delivery_attempts WHERE idempotency_key=p_key FOR UPDATE;
 IF FOUND THEN
  IF existing.actor_id IS DISTINCT FROM p_actor OR existing.recipient_hash<>p_recipient_hash OR existing.email_type<>p_type THEN RAISE EXCEPTION 'Delivery context mismatch'; END IF;
  IF existing.status='sent' THEN RETURN jsonb_build_object('status','sent','id',existing.provider_message_id); END IF;
  IF existing.created_at<now()-interval '23 hours' THEN RETURN jsonb_build_object('status','expired'); END IF;
  IF existing.attempts>=5 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
  IF existing.status='sending' AND existing.updated_at>now()-interval '30 seconds' THEN RETURN jsonb_build_object('status','in_progress'); END IF;
  UPDATE public.email_delivery_attempts SET status='sending',attempts=attempts+1,updated_at=now() WHERE idempotency_key=p_key;
 ELSE
  IF p_actor IS NOT NULL AND (SELECT count(*) FROM public.email_delivery_attempts WHERE actor_id=p_actor AND created_at>now()-interval '1 hour')>=30 THEN RETURN jsonb_build_object('status','rate_limited'); END IF;
  INSERT INTO public.email_delivery_attempts(idempotency_key,actor_id,recipient_hash,email_type) VALUES(p_key,p_actor,p_recipient_hash,p_type);
 END IF;
 RETURN jsonb_build_object('status','ready');
END $$;
REVOKE ALL ON FUNCTION public.claim_email_delivery(text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_delivery(text,uuid,text,text) TO service_role;
