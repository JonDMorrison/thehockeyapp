-- Run in a transaction on an isolated database or a dedicated QA actor.
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','public.claim_email_delivery(text,uuid,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.claim_email_delivery(text,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Public delivery dispatcher exposed'; END IF;
 IF has_table_privilege('authenticated','public.email_delivery_attempts','SELECT') OR has_table_privilege('anon','public.email_delivery_attempts','SELECT') THEN RAISE EXCEPTION 'Private delivery metadata exposed'; END IF;
 IF NOT has_function_privilege('service_role','public.claim_email_delivery(text,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Service dispatcher missing permission'; END IF;
END $$;
SELECT set_config('qa.actor', :'actor', true);
DO $$ DECLARE actor uuid:=current_setting('qa.actor')::uuid; result jsonb; i integer; k text:='hockey-'||repeat('a',64); BEGIN
 result:=public.claim_email_delivery(k,actor,repeat('b',64),'parent_invitation');
 IF result->>'status'<>'ready' THEN RAISE EXCEPTION 'First attempt not reserved'; END IF;
 result:=public.claim_email_delivery(k,actor,repeat('b',64),'parent_invitation');
 IF result->>'status'<>'in_progress' THEN RAISE EXCEPTION 'Concurrent duplicate not blocked'; END IF;
 UPDATE public.email_delivery_attempts SET status='failed' WHERE idempotency_key=k;
 result:=public.claim_email_delivery(k,actor,repeat('b',64),'parent_invitation');
 IF result->>'status'<>'ready' THEN RAISE EXCEPTION 'Failed send not retryable'; END IF;
 UPDATE public.email_delivery_attempts SET status='sent',provider_message_id='qa-message' WHERE idempotency_key=k;
 result:=public.claim_email_delivery(k,actor,repeat('b',64),'parent_invitation');
 IF result->>'status'<>'sent' OR result->>'id'<>'qa-message' THEN RAISE EXCEPTION 'Sent duplicate not retained'; END IF;
 FOR i IN 1..29 LOOP
  result:=public.claim_email_delivery('hockey-'||lpad(to_hex(i),64,'0'),actor,repeat('b',64),'parent_invitation');
  IF result->>'status'<>'ready' THEN RAISE EXCEPTION 'Valid send blocked prematurely'; END IF;
 END LOOP;
 result:=public.claim_email_delivery('hockey-'||repeat('c',64),actor,repeat('b',64),'parent_invitation');
 IF result->>'status'<>'rate_limited' THEN RAISE EXCEPTION 'Hourly limit bypassed'; END IF;
END $$;
ROLLBACK;
