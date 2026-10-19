-- Run inside a rollback-only transaction after setting test.user_id to a dedicated QA account.
DO $$
DECLARE
  v_user uuid:=current_setting('test.user_id')::uuid;
  v_team uuid; v_plan uuid:=gen_random_uuid(); v_player uuid; v_task uuid; v_card uuid;
  v_days jsonb; v_bad jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  v_team:=(public.create_team_with_owner('Disposable Atomic Publication QA')->>'team_id')::uuid;
  v_player:=(public.create_managed_player('AtomicQA',2014)->>'player_id')::uuid;
  PERFORM public.add_my_player_to_team(v_team,v_player);
  v_days:=jsonb_build_array(jsonb_build_object('date',current_date+1,'title','Original workout','notes','Keep this note','tasks',jsonb_build_array(
    jsonb_build_object('label','Original shots','task_type','shooting','target_type','minutes','target_value',10,'shot_type','wrist','shots_expected',100,'is_required',true))));
  PERFORM public.save_team_week_plan(v_plan,v_team,'Original program',current_date+1,'elite',true,v_days,true);
  SELECT id INTO STRICT v_card FROM public.practice_cards WHERE team_id=v_team AND date=current_date+1;
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card AND label='Original shots' AND shots_expected=130 AND target_value=15;
  IF (SELECT notes FROM public.practice_cards WHERE id=v_card)<>'Keep this note' THEN RAISE EXCEPTION 'Notes were lost'; END IF;
  -- An insertion error after deletion must restore the previous complete draft AND publication.
  v_bad:=jsonb_set(v_days,'{0,tasks,0,task_type}','"invalid_type"');
  BEGIN
    PERFORM public.save_team_week_plan(v_plan,v_team,'Broken replacement',current_date+1,'rep',false,v_bad,true);
    RAISE EXCEPTION 'Invalid replacement unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.practice_tasks WHERE id=v_task AND label='Original shots')
     OR NOT EXISTS(SELECT 1 FROM public.team_week_plans WHERE id=v_plan AND name='Original program') THEN
    RAISE EXCEPTION 'Failed publication destroyed previous saved work';
  END IF;
  -- A successful retry reuses the program and scheduled card rather than making duplicates.
  PERFORM public.save_team_week_plan(v_plan,v_team,'Original program',current_date+1,'elite',true,v_days,true);
  IF (SELECT count(*) FROM public.practice_cards WHERE team_id=v_team)<>1
     OR (SELECT count(*) FROM public.team_week_plans WHERE team_id=v_team)<>1 THEN RAISE EXCEPTION 'Retry duplicated data'; END IF;
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card;
  INSERT INTO public.task_completions(practice_task_id,player_id,completed,completed_at,shots_logged)
    VALUES(v_task,v_player,true,now(),100);
  BEGIN
    PERFORM public.save_team_week_plan(v_plan,v_team,'Destroy completed work',current_date+1,'rep',false,v_days,true);
    RAISE EXCEPTION 'Started workout unexpectedly replaced';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.task_completions WHERE practice_task_id=v_task AND completed AND shots_logged=100) THEN
    RAISE EXCEPTION 'Player progress was lost';
  END IF;
  -- A different account cannot save or publish into the coach's team.
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  BEGIN
    PERFORM public.save_team_week_plan(gen_random_uuid(),v_team,'Unauthorized',current_date+1,'rep',false,v_days,true);
    RAISE EXCEPTION 'Unrelated account unexpectedly authorized';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('anon','public.save_team_week_plan(uuid,uuid,text,date,text,boolean,jsonb,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous publication is enabled';
  END IF;
END $$;
