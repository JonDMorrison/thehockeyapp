\ir ../../supabase/migrations/20261019073334_training_record_scope.sql
DO $$ DECLARE v_user uuid:=current_setting('test.user_id')::uuid;v_team uuid;v_other_team uuid;v_player uuid;v_other_player uuid;v_card uuid:=gen_random_uuid();v_other_card uuid:=gen_random_uuid();v_task uuid;v_other_task uuid;v_solo uuid;v_solo_task uuid;v_tasks jsonb:='[{"label":"Scope guard drill","task_type":"mobility"}]';BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  v_team:=(public.create_team_with_owner('Disposable Valid Scope QA')->>'team_id')::uuid;
  v_other_team:=(public.create_team_with_owner('Disposable Other Scope QA')->>'team_id')::uuid;
  v_player:=(public.create_managed_player('ScopeGuardKid',2014)->>'player_id')::uuid;
  v_other_player:=(public.create_managed_player('OtherScopeKid',2014)->>'player_id')::uuid;
  PERFORM public.add_my_player_to_team(v_team,v_player);
  PERFORM public.save_team_practice_card(v_card,v_team,current_date,'rep','Valid scope','',v_tasks,true);
  PERFORM public.save_team_practice_card(v_other_card,v_other_team,current_date,'rep','Other scope','',v_tasks,true);
  SELECT id INTO STRICT v_task FROM public.practice_tasks WHERE practice_card_id=v_card;
  SELECT id INTO STRICT v_other_task FROM public.practice_tasks WHERE practice_card_id=v_other_card;
  BEGIN INSERT INTO public.task_completions(player_id,practice_task_id,completed) VALUES(v_player,v_other_task,true); RAISE EXCEPTION 'Foreign team task scope allowed'; EXCEPTION WHEN check_violation THEN NULL;END;
  BEGIN INSERT INTO public.session_completions(player_id,practice_card_id,status) VALUES(v_player,v_other_card,'complete'); RAISE EXCEPTION 'Foreign team session scope allowed'; EXCEPTION WHEN check_violation THEN NULL;END;
  BEGIN INSERT INTO public.session_photos(player_id,practice_card_id,uploaded_by_user_id) VALUES(v_player,v_other_card,v_user); RAISE EXCEPTION 'Foreign team photo scope allowed'; EXCEPTION WHEN check_violation THEN NULL;END;
  INSERT INTO public.task_completions(player_id,practice_task_id,completed) VALUES(v_player,v_task,true);
  INSERT INTO public.session_completions(player_id,practice_card_id,status) VALUES(v_player,v_card,'complete');
  PERFORM public.save_personal_workouts(v_other_player,'rep',jsonb_build_array(jsonb_build_object('date',current_date,'title','Other personal scope','tasks',v_tasks)));
  SELECT id INTO STRICT v_solo FROM public.personal_practice_cards WHERE player_id=v_other_player;
  SELECT id INTO STRICT v_solo_task FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_solo;
  BEGIN INSERT INTO public.personal_task_completions(player_id,personal_practice_task_id,completed) VALUES(v_player,v_solo_task,true); RAISE EXCEPTION 'Foreign personal task scope allowed'; EXCEPTION WHEN check_violation THEN NULL;END;
  BEGIN INSERT INTO public.personal_session_completions(player_id,personal_practice_card_id,status) VALUES(v_player,v_solo,'complete'); RAISE EXCEPTION 'Foreign personal session scope allowed'; EXCEPTION WHEN check_violation THEN NULL;END;
  PERFORM public.set_personal_task_completion(v_other_player,v_solo_task,true);
  PERFORM public.set_personal_task_completion(v_other_player,v_solo_task,true);
  IF (SELECT count(*) FROM public.personal_task_completions WHERE player_id=v_other_player)<>1 THEN RAISE EXCEPTION 'Personal completion retry duplicated a record'; END IF;
END $$;
