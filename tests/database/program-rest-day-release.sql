-- Clearing a day is subject to the same atomicity and history protections as replacing one.
DO $$
DECLARE
  v_team uuid; v_plan uuid:=gen_random_uuid(); v_player uuid; v_card uuid; v_task uuid;
  v_days jsonb; v_rest jsonb; v_bad jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
  v_team:=(public.create_team_with_owner('Disposable Rest Day Release QA')->>'team_id')::uuid;
  v_days:=jsonb_build_array(
    jsonb_build_object('date',current_date+1,'title','First day','tasks',jsonb_build_array(jsonb_build_object('label','Warm-up','task_type','mobility','target_type','none','shot_type','none'))),
    jsonb_build_object('date',current_date+2,'title','Second day','tasks',jsonb_build_array(jsonb_build_object('label','Warm-up','task_type','mobility','target_type','none','shot_type','none'))));
  PERFORM public.save_team_week_plan(v_plan,v_team,'Week before rest',current_date+1,'rep',false,v_days,true);
  v_rest:=jsonb_set(v_days,'{0,tasks}','[]'::jsonb);
  v_bad:=jsonb_set(v_rest,'{1,tasks,0,task_type}','"invalid_type"');
  BEGIN
    PERFORM public.save_team_week_plan(v_plan,v_team,'Broken rest edit',current_date+1,'rep',false,v_bad,true);
    RAISE EXCEPTION 'Invalid rest edit unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT count(*) FROM public.practice_cards WHERE team_id=v_team)<>2 THEN
    RAISE EXCEPTION 'Failed rest edit lost a previously published workout';
  END IF;
  PERFORM public.save_team_week_plan(v_plan,v_team,'Week with rest',current_date+1,'rep',false,v_rest,true);
  IF EXISTS(SELECT 1 FROM public.practice_cards WHERE team_id=v_team AND date=current_date+1)
     OR (SELECT count(*) FROM public.practice_cards WHERE team_id=v_team AND date=current_date+2)<>1 THEN
    RAISE EXCEPTION 'Rest day did not remove only its previous workout';
  END IF;
  PERFORM public.save_team_week_plan(v_plan,v_team,'Week with rest',current_date+1,'rep',false,v_rest,true);
  IF (SELECT count(*) FROM public.practice_cards WHERE team_id=v_team)<>1 THEN RAISE EXCEPTION 'Rest retry duplicated a day'; END IF;
  PERFORM public.save_team_week_plan(v_plan,v_team,'Training again',current_date+1,'rep',false,v_days,true);
  SELECT id INTO STRICT v_card FROM public.practice_cards WHERE team_id=v_team AND date=current_date+1;
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card;
  UPDATE public.practice_cards SET locked=true WHERE id=v_card;
  BEGIN
    PERFORM public.save_team_week_plan(v_plan,v_team,'Clear locked work',current_date+1,'rep',false,v_rest,true);
    RAISE EXCEPTION 'Locked rest edit unexpectedly succeeded';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.practice_tasks WHERE id=v_task) THEN RAISE EXCEPTION 'Locked work was lost'; END IF;
  UPDATE public.practice_cards SET locked=false WHERE id=v_card;
  v_player:=(public.create_managed_player('RestDayKid',2014)->>'player_id')::uuid;
  PERFORM public.add_my_player_to_team(v_team,v_player);
  INSERT INTO public.task_completions(practice_task_id,player_id,completed,completed_at) VALUES(v_task,v_player,true,now());
  BEGIN
    PERFORM public.save_team_week_plan(v_plan,v_team,'Clear started work',current_date+1,'rep',false,v_rest,true);
    RAISE EXCEPTION 'Started rest edit unexpectedly succeeded';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.task_completions WHERE practice_task_id=v_task AND completed) THEN
    RAISE EXCEPTION 'Rest edit erased player progress';
  END IF;
END $$;
