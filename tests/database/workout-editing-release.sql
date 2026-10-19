DO $$
DECLARE
  v_user uuid:=current_setting('test.user_id')::uuid; v_team uuid; v_player uuid; v_card uuid:=gen_random_uuid(); v_task uuid; v_personal uuid;
  v_tasks jsonb:='[{"label":"Keep this drill","task_type":"shooting","target_type":"reps","target_value":10,"shots_expected":50,"shot_type":"wrist","is_required":true,"coach_notes":"Hands out front","video_url":"https://youtu.be/dQw4w9WgXcQ"}]';
  v_days jsonb; v_bad jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  v_team:=(public.create_team_with_owner('Disposable Atomic Workout QA')->>'team_id')::uuid;
  v_player:=(public.create_managed_player('WorkoutAtomicQA',2014)->>'player_id')::uuid;
  PERFORM public.save_team_practice_card(v_card,v_team,current_date+1,'rep','Original card','Original notes',v_tasks,true);
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card AND coach_notes='Hands out front' AND shots_expected=50;
  v_bad:=jsonb_set(v_tasks,'{0,task_type}','"invalid_type"');
  BEGIN
    PERFORM public.save_team_practice_card(v_card,v_team,current_date+1,'rep','Broken save','Lost notes',v_bad,true);
    RAISE EXCEPTION 'Invalid team task unexpectedly saved';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.practice_cards WHERE id=v_card AND title='Original card' AND notes='Original notes')
     OR NOT EXISTS(SELECT 1 FROM public.practice_tasks WHERE id=v_task AND coach_notes='Hands out front') THEN RAISE EXCEPTION 'Team save lost original work'; END IF;
  PERFORM public.save_team_practice_card(v_card,v_team,current_date+1,'rep','Original card','Original notes',v_tasks,true);
  IF (SELECT count(*) FROM public.practice_cards WHERE team_id=v_team)<>1 THEN RAISE EXCEPTION 'Team retry duplicated cards'; END IF;
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card;
  INSERT INTO public.task_completions(practice_task_id,player_id,completed,shots_logged) VALUES(v_task,v_player,false,0);
  BEGIN
    PERFORM public.replace_team_practice_card(v_team,current_date+1,true,'rep','Unsafe overwrite',v_tasks);
    RAISE EXCEPTION 'Started team task unexpectedly replaced';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.practice_tasks WHERE id=v_task) THEN RAISE EXCEPTION 'Team progress identity changed'; END IF;

  v_days:=jsonb_build_array(jsonb_build_object('date',current_date+1,'title','Original solo workout','tasks',v_tasks));
  PERFORM public.replace_personal_training_program(v_player,'Original solo program','rep',3,ARRAY['shooting'],v_days);
  SELECT id INTO STRICT v_personal FROM public.personal_practice_cards WHERE player_id=v_player AND date=current_date+1;
  SELECT id INTO STRICT v_task FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_personal;
  -- Fail the second day after the first day has been replaced: the entire save must roll back.
  v_bad:=v_days||jsonb_build_array(jsonb_build_object('date',current_date+2,'title','Invalid second day','tasks',jsonb_set(v_tasks,'{0,task_type}','"invalid_type"')));
  BEGIN
    PERFORM public.replace_personal_training_program(v_player,'Unsafe partial program','elite',7,ARRAY['conditioning'],v_bad);
    RAISE EXCEPTION 'Invalid solo second day unexpectedly saved';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.personal_practice_tasks WHERE id=v_task)
     OR NOT EXISTS(SELECT 1 FROM public.personal_training_plans WHERE player_id=v_player AND name='Original solo program' AND tier='rep')
     OR (SELECT count(*) FROM public.personal_practice_cards WHERE player_id=v_player)<>1 THEN RAISE EXCEPTION 'Solo partial save changed existing work'; END IF;
  PERFORM public.save_personal_workouts(v_player,'rep',v_days);
  IF (SELECT count(*) FROM public.personal_practice_cards WHERE player_id=v_player)<>1 THEN RAISE EXCEPTION 'Solo retry duplicated cards'; END IF;
  SELECT id INTO STRICT v_task FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_personal;
  INSERT INTO public.personal_task_completions(player_id,personal_practice_task_id,completed) VALUES(v_player,v_task,false);
  BEGIN
    PERFORM public.save_personal_workouts(v_player,'rep',v_days);
    RAISE EXCEPTION 'Partially started solo workout unexpectedly replaced';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM public.personal_task_completions WHERE personal_practice_task_id=v_task) THEN RAISE EXCEPTION 'Solo task progress was deleted'; END IF;
  BEGIN
    PERFORM public.save_personal_workouts(v_player,'rep',jsonb_set(v_days,'{0,tasks}','[]'));
    RAISE EXCEPTION 'Started solo rest day unexpectedly cleared';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  BEGIN
    PERFORM public.save_personal_workouts(v_player,'rep',v_days);
    RAISE EXCEPTION 'Unrelated family unexpectedly wrote solo work';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.save_team_practice_card(gen_random_uuid(),v_team,current_date+2,'rep','Unauthorized','',v_tasks,true);
    RAISE EXCEPTION 'Unrelated account unexpectedly wrote team work';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.save_personal_workouts(uuid,text,jsonb)','EXECUTE')
     OR has_function_privilege('anon','public.save_team_practice_card(uuid,uuid,date,text,text,text,jsonb,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous workout saves enabled'; END IF;
END $$;
