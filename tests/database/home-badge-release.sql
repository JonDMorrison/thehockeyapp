CREATE TABLE public.challenges(id uuid primary key default gen_random_uuid(),scope text,name text,metric_type text,target_value integer,is_active boolean default true);
CREATE TABLE public.player_privacy_settings(player_id uuid primary key,national_challenges_opt_in boolean);
CREATE TABLE public.player_team_preferences(player_id uuid primary key,active_team_id uuid);
CREATE TABLE public.team_settings(team_id uuid primary key,challenges_enabled boolean);
CREATE TABLE public.player_challenge_progress(player_id uuid,challenge_id uuid,current_value integer,updated_at timestamptz,completed boolean default false,completed_at timestamptz,unique(player_id,challenge_id));
CREATE TABLE public.player_badges(id uuid primary key default gen_random_uuid(),player_id uuid,challenge_id uuid,awarded_at timestamptz default now(),unique(player_id,challenge_id));
INSERT INTO challenges(scope,name,metric_type,target_value) VALUES('global','First Practice','sessions_completed',1),('global','Mindset Master','prep_tasks_completed',25),('global','First 100 Shots','total_shots',100);
\ir ../../supabase/migrations/20261019085514_home_workout_badge_credit.sql
DO $$DECLARE p uuid;c uuid;t uuid;r jsonb;BEGIN
 PERFORM set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
 p:=(public.create_managed_player('BadgeAuditKid',2014)->>'player_id')::uuid;
 PERFORM public.save_personal_workouts(p,'rep',jsonb_build_array(jsonb_build_object('date',current_date,'title','Badge home practice','tasks','[{"label":"Home prep","task_type":"prep"}]'::jsonb)));
 SELECT id INTO c FROM personal_practice_cards WHERE player_id=p;
 SELECT id INTO t FROM personal_practice_tasks WHERE personal_practice_card_id=c;
 PERFORM public.set_personal_task_completion(p,t,true);
 INSERT INTO player_privacy_settings(player_id,national_challenges_opt_in) VALUES(p,false) ON CONFLICT(player_id) DO UPDATE SET national_challenges_opt_in=false;
 r:=public.evaluate_player_challenges(p); IF r->>'reason'<>'not_opted_in' THEN RAISE EXCEPTION 'Badge opt-out ignored';END IF;
 UPDATE player_privacy_settings SET national_challenges_opt_in=true WHERE player_id=p;
 PERFORM public.evaluate_player_challenges(p);
 IF NOT EXISTS(SELECT 1 FROM player_badges pb JOIN challenges ch ON ch.id=pb.challenge_id WHERE pb.player_id=p AND ch.name='First Practice') THEN RAISE EXCEPTION 'Completed home practice did not earn First Practice';END IF;
 r:=public.evaluate_player_challenges(p);IF(r->>'badges_awarded')::integer<>0 THEN RAISE EXCEPTION 'Repeated badge evaluation awarded again';END IF;
 IF (SELECT current_value FROM player_challenge_progress pp JOIN challenges ch ON ch.id=pp.challenge_id WHERE pp.player_id=p AND ch.name='First Practice')<>1 THEN RAISE EXCEPTION 'Home practice double counted';END IF;
 IF (SELECT current_value FROM player_challenge_progress pp JOIN challenges ch ON ch.id=pp.challenge_id WHERE pp.player_id=p AND ch.name='Mindset Master')<>1 THEN RAISE EXCEPTION 'Home prep missing';END IF;
 IF EXISTS(SELECT 1 FROM player_badges pb JOIN challenges ch ON ch.id=pb.challenge_id WHERE pb.player_id=p AND ch.metric_type='total_shots') THEN RAISE EXCEPTION 'Planned shots counted as actual';END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN PERFORM public.evaluate_player_challenges(p);RAISE EXCEPTION 'Unrelated family evaluated badges';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END$$;
