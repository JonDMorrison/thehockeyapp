CREATE TABLE public.team_goals(id uuid primary key default gen_random_uuid(),team_id uuid references teams(id),goal_type text,target_value integer,current_value integer default 0,status text default 'active',start_date date,end_date date,completed_at timestamptz,updated_at timestamptz);
CREATE TABLE public.team_goal_contributions(goal_id uuid references team_goals(id),player_id uuid references players(id),contribution_value integer,unique(goal_id,player_id));
\ir ../../supabase/migrations/20261019084300_team_goal_scope.sql
DO $$DECLARE a uuid;b uuid;p uuid;p2 uuid;ca uuid:=gen_random_uuid();cb uuid:=gen_random_uuid();ta uuid;tb uuid;g uuid;gs uuid;gp uuid;r jsonb;BEGIN
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 a:=(public.create_team_with_owner('Goal A')->>'team_id')::uuid;b:=(public.create_team_with_owner('Goal B')->>'team_id')::uuid;p:=(public.create_managed_player('Goal Kid',2014)->>'player_id')::uuid;
 PERFORM public.add_my_player_to_team(a,p);PERFORM public.add_my_player_to_team(b,p);
 PERFORM public.save_team_practice_card(ca,a,current_date,'rep','Own goal work','', '[{"label":"Own shots","task_type":"shooting"}]',true);PERFORM public.save_team_practice_card(cb,b,current_date,'rep','Unrelated goal work','', '[{"label":"Other shots","task_type":"shooting"}]',true);
 SELECT id INTO ta FROM practice_tasks WHERE practice_card_id=ca;SELECT id INTO tb FROM practice_tasks WHERE practice_card_id=cb;
 INSERT INTO task_completions(practice_task_id,player_id,completed,shots_logged) VALUES(tb,p,true,50);
 INSERT INTO session_completions(practice_card_id,player_id,status) VALUES(cb,p,'complete');
 INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'shots',50,current_date,current_date+6) RETURNING id INTO g;
 r:=public.calculate_goal_progress(g);IF (r->>'current_value')::integer<>0 THEN RAISE EXCEPTION 'Unrelated team work counted toward goal: %',r;END IF;
 INSERT INTO task_completions(practice_task_id,player_id,completed,shots_logged) VALUES(ta,p,true,50);r:=public.calculate_goal_progress(g);IF NOT(r->>'completed')::boolean THEN RAISE EXCEPTION 'Own team work not counted';END IF;
 UPDATE task_completions SET shots_logged=10 WHERE practice_task_id=ta AND player_id=p;PERFORM public.calculate_goal_progress(g);IF NOT EXISTS(SELECT 1 FROM team_goals WHERE id=g AND current_value=10 AND status='active' AND completed_at IS NULL) THEN RAISE EXCEPTION 'Corrected goal kept stale completion';END IF;
 INSERT INTO session_completions(practice_card_id,player_id,status) VALUES(ca,p,'complete');
 INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'sessions',1,current_date,current_date+6) RETURNING id INTO gs; r:=public.calculate_goal_progress(gs);IF(r->>'current_value')::integer<>1 THEN RAISE EXCEPTION 'Unrelated team session counted';END IF;
 p2:=(public.create_managed_player('Former Goal Kid',2014)->>'player_id')::uuid;PERFORM public.add_my_player_to_team(a,p2);INSERT INTO session_completions(practice_card_id,player_id,status) VALUES(ca,p2,'complete');UPDATE team_memberships SET status='inactive' WHERE team_id=a AND player_id=p2;
 INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'participation',100,current_date,current_date+6) RETURNING id INTO gp;r:=public.calculate_goal_progress(gp);IF(r->>'current_value')::integer<>100 THEN RAISE EXCEPTION 'Former player inflated participation: %',r;END IF;
 BEGIN INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'shots',0,current_date,current_date+1);RAISE EXCEPTION 'Zero goal accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'participation',101,current_date,current_date+1);RAISE EXCEPTION 'Invalid percentage accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN INSERT INTO team_goals(team_id,goal_type,target_value,start_date,end_date) VALUES(a,'shots',100,current_date+1,current_date);RAISE EXCEPTION 'Backwards goal dates accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);BEGIN PERFORM public.calculate_goal_progress(g);RAISE EXCEPTION 'Unrelated actor refreshed a goal';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
