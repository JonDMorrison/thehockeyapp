\ir ../../supabase/migrations/20261019080740_family_training_history.sql
DO $$DECLARE v_team uuid;v_player uuid;v_card uuid;v_old uuid;v_future uuid;v_task uuid;v_solo jsonb;v_history jsonb;BEGIN
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 v_team:=(public.create_team_with_owner('Family history SQL')->>'team_id')::uuid;
 v_player:=(public.create_managed_player('History SQL Kid',2014)->>'player_id')::uuid;
 PERFORM public.add_my_player_to_team(v_team,v_player);
 v_card:=gen_random_uuid();v_future:=gen_random_uuid();v_old:=gen_random_uuid();
 PERFORM public.save_team_practice_card(v_card,v_team,current_date,'rep','Recorded history','', '[{"label":"History shots","task_type":"shooting","shots_expected":125}]',true);
 PERFORM public.save_team_practice_card(v_future,v_team,current_date+1,'rep','Future not history','', '[{"label":"Future drill","task_type":"mobility"}]',true);
 INSERT INTO practice_cards(id,team_id,date,tier,title,created_by_user_id,published_at,program_source) VALUES(v_old,v_team,current_date-40,'rep','Older history',auth.uid(),now(),'team');
 SELECT id INTO v_task FROM practice_tasks WHERE practice_card_id=v_card;
 INSERT INTO task_completions(practice_task_id,player_id,completed,shots_logged) VALUES(v_task,v_player,true,125);
 INSERT INTO session_completions(practice_card_id,player_id,status) VALUES(v_card,v_player,'complete');
 v_solo:=public.save_personal_workouts(v_player,'rep',jsonb_build_array(jsonb_build_object('date',current_date,'title','Home history','tasks','[{"label":"Home drill","task_type":"mobility"}]'::jsonb)));
 v_history:=public.get_player_training_history(v_player);
 IF jsonb_array_length(v_history->'items')<>2 OR NOT (v_history->>'has_more')::boolean THEN RAISE EXCEPTION 'Home/team history or pagination missing: %',v_history;END IF;
 IF jsonb_array_length(public.get_player_training_history(v_player,(v_history->>'next_before')::date)->'items')<>1 THEN RAISE EXCEPTION 'Older history window failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_history->'items') e WHERE e->>'id'=v_card::text AND e->>'shots_logged'='125' AND e->>'status'='complete') THEN RAISE EXCEPTION 'Recorded totals missing';END IF;
 UPDATE team_memberships SET status='inactive' WHERE team_id=v_team AND player_id=v_player;
 v_history:=public.get_player_training_history(v_player);
 IF jsonb_array_length(v_history->'items')<>2 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_history->'items') e WHERE e->>'id'=v_card::text AND (e->>'is_archived')::boolean) THEN RAISE EXCEPTION 'Leaving lost family history';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_history->'items') e WHERE e->>'id'=v_future::text) THEN RAISE EXCEPTION 'Future team work exposed';END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 BEGIN PERFORM public.get_player_training_history(v_player);RAISE EXCEPTION 'Unrelated family read history';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
