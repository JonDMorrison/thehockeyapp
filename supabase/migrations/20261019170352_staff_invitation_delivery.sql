-- Extend the existing guarded delivery allowlist; all rate/idempotency controls stay intact.
CREATE OR REPLACE FUNCTION public.claim_email_delivery(p_key text,p_actor uuid,p_recipient_hash text,p_type text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.email_delivery_attempts; BEGIN
 IF p_key !~ '^hockey-[0-9a-f]{64}$' OR p_recipient_hash !~ '^[0-9a-f]{64}$' OR p_type NOT IN ('staff_invitation','coach_welcome','parent_invitation','association_invitation','weekly_coach_digest','player_weekly_progress') THEN RAISE EXCEPTION 'Invalid delivery metadata'; END IF;
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
