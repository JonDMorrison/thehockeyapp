DO $$
DECLARE v_user uuid:=current_setting('test.user_id')::uuid; v_player uuid; v_card uuid; v_task uuid; v_tasks jsonb:='[{"label":"Solo completion drill","task_type":"mobility"}]'; v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  v_player:=(public.create_managed_player('SoloCompletionQA',2014)->>'player_id')::uuid;
  PERFORM public.save_personal_workouts(v_player,'rep',jsonb_build_array(jsonb_build_object('date',current_date,'title','Atomic solo completion','tasks',v_tasks)));
  SELECT id INTO STRICT v_card FROM public.personal_practice_cards WHERE player_id=v_player;
  SELECT id INTO STRICT v_task FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_card;
  v_result:=public.set_personal_task_completion(v_player,v_task,true);
  IF v_result->>'session_status'<>'complete' THEN RAISE EXCEPTION 'Last task did not complete session'; END IF;
  PERFORM public.set_personal_task_completion(v_player,v_task,true);
  IF (SELECT count(*) FROM public.personal_task_completions WHERE player_id=v_player)<>1 THEN RAISE EXCEPTION 'Repeated completion duplicated records'; END IF;
  PERFORM public.set_personal_task_completion(v_player,v_task,false);
  IF EXISTS(SELECT 1 FROM public.personal_task_completions WHERE player_id=v_player)
     OR NOT EXISTS(SELECT 1 FROM public.personal_session_completions WHERE player_id=v_player AND status='none' AND completed_at IS NULL) THEN RAISE EXCEPTION 'Undo left a completed session'; END IF;
  PERFORM set_config('test.atomic_player',v_player::text,true);
  PERFORM set_config('test.atomic_task',v_task::text,true);
END $$;
CREATE FUNCTION pg_temp.reject_atomic_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.player_id=current_setting('test.atomic_player')::uuid THEN RAISE EXCEPTION 'Expected session write failure' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER qa_reject_atomic_session BEFORE INSERT OR UPDATE ON public.personal_session_completions FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_atomic_session();
DO $$ BEGIN
  BEGIN
    PERFORM public.set_personal_task_completion(current_setting('test.atomic_player')::uuid,current_setting('test.atomic_task')::uuid,true);
    RAISE EXCEPTION 'Failed session write unexpectedly reported completion';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.personal_task_completions WHERE player_id=current_setting('test.atomic_player')::uuid) THEN RAISE EXCEPTION 'Session failure left a partial task write'; END IF;
END $$;
DROP TRIGGER qa_reject_atomic_session ON public.personal_session_completions;
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  BEGIN
    PERFORM public.set_personal_task_completion(current_setting('test.atomic_player')::uuid,current_setting('test.atomic_task')::uuid,true);
    RAISE EXCEPTION 'Unrelated family completed private task';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.set_personal_task_completion(uuid,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous solo completion enabled'; END IF;
END $$;
