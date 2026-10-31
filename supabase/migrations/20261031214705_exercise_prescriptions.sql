-- Additive workout prescriptions. Existing assignments retain one set and no rest.
ALTER TABLE public.team_week_plan_tasks
 ADD COLUMN sets_count integer NOT NULL DEFAULT 1 CHECK (sets_count BETWEEN 1 AND 20),
 ADD COLUMN rest_seconds integer NOT NULL DEFAULT 0 CHECK (rest_seconds BETWEEN 0 AND 600),
 ADD COLUMN equipment text NOT NULL DEFAULT '' CHECK (char_length(equipment)<=200),
 ADD COLUMN instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions)<=1000),
 ADD CONSTRAINT team_week_plan_tasks_timed_sets CHECK (sets_count=1 OR (target_type IN ('minutes','seconds') AND target_value IS NOT NULL AND target_value>0));

ALTER TABLE public.practice_tasks
 ADD COLUMN sets_count integer NOT NULL DEFAULT 1 CHECK (sets_count BETWEEN 1 AND 20),
 ADD COLUMN rest_seconds integer NOT NULL DEFAULT 0 CHECK (rest_seconds BETWEEN 0 AND 600),
 ADD COLUMN equipment text NOT NULL DEFAULT '' CHECK (char_length(equipment)<=200),
 ADD COLUMN instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions)<=1000),
 ADD CONSTRAINT practice_tasks_timed_sets CHECK (sets_count=1 OR (target_type IN ('minutes','seconds') AND target_value IS NOT NULL AND target_value>0));

ALTER TABLE public.personal_practice_tasks
 ADD COLUMN sets_count integer NOT NULL DEFAULT 1 CHECK (sets_count BETWEEN 1 AND 20),
 ADD COLUMN rest_seconds integer NOT NULL DEFAULT 0 CHECK (rest_seconds BETWEEN 0 AND 600),
 ADD COLUMN equipment text NOT NULL DEFAULT '' CHECK (char_length(equipment)<=200),
 ADD COLUMN instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions)<=1000),
 ADD CONSTRAINT personal_practice_tasks_timed_sets CHECK (sets_count=1 OR (target_type IN ('minutes','seconds') AND target_value IS NOT NULL AND target_value>0));

CREATE OR REPLACE FUNCTION public.save_team_week_plan(p_id uuid, p_team_id uuid, p_name text, p_start_date date, p_tier text, p_use_tier_scaling boolean, p_days jsonb, p_publish boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_day jsonb; v_task jsonb; v_date date; v_day_id uuid; v_card_id uuid;
  v_target integer; v_shots integer; v_scaled numeric; v_order integer;
  v_factor numeric := CASE p_tier WHEN 'rec' THEN 0.7 WHEN 'elite' THEN 1.3 ELSE 1 END;
BEGIN
  IF v_user IS NULL OR NOT public.is_team_adult(p_team_id, v_user) THEN
    RAISE EXCEPTION 'Team staff access required' USING ERRCODE='42501';
  END IF;
  IF p_id IS NULL OR p_start_date IS NULL OR p_publish IS NULL OR p_use_tier_scaling IS NULL
     OR p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 1 AND 100
     OR p_tier IS NULL OR p_tier NOT IN ('rec','rep','elite') THEN
    RAISE EXCEPTION 'Program settings are invalid' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_days) IS DISTINCT FROM 'array' OR jsonb_array_length(p_days) NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Choose between one and seven program days' USING ERRCODE='22023';
  END IF;
  -- Serialize team program saves, including concurrent first publication.
  PERFORM 1 FROM public.teams WHERE id=p_team_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.team_week_plans WHERE id=p_id AND team_id<>p_team_id) THEN
    RAISE EXCEPTION 'This program belongs to another team' USING ERRCODE='42501';
  END IF;
  IF (SELECT count(DISTINCT value->>'date') FROM jsonb_array_elements(p_days)) <> jsonb_array_length(p_days) THEN
    RAISE EXCEPTION 'Each program day needs a unique date' USING ERRCODE='22023';
  END IF;
  FOR v_day IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    v_date := (v_day->>'date')::date;
    IF v_date IS NULL OR v_date<p_start_date OR v_date>p_start_date+6
       OR jsonb_typeof(v_day->'tasks') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Program day is invalid' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(v_day->'tasks')>50 THEN
      RAISE EXCEPTION 'A day can contain at most 50 activities' USING ERRCODE='22023';
    END IF;
    IF p_publish THEN
      SELECT id INTO v_card_id FROM public.practice_cards
        WHERE team_id=p_team_id AND date=v_date AND mode='normal' AND program_source='team' FOR UPDATE;
      IF v_date<current_date AND (jsonb_array_length(v_day->'tasks')>0 OR v_card_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Past workouts cannot be replaced' USING ERRCODE='22023';
      END IF;
      IF v_card_id IS NOT NULL THEN
        -- Lock task rows before inspecting progress, so concurrent completions cannot be deleted unnoticed.
        PERFORM 1 FROM public.practice_tasks WHERE practice_card_id=v_card_id FOR UPDATE;
        IF EXISTS (SELECT 1 FROM public.practice_cards WHERE id=v_card_id AND locked)
           OR EXISTS (SELECT 1 FROM public.task_completions c JOIN public.practice_tasks t ON t.id=c.practice_task_id
             WHERE t.practice_card_id=v_card_id)
           OR EXISTS (SELECT 1 FROM public.session_completions WHERE practice_card_id=v_card_id)
           OR EXISTS (SELECT 1 FROM public.session_photos WHERE practice_card_id=v_card_id) THEN
          RAISE EXCEPTION 'A locked or started workout on % cannot be replaced. Choose another date to keep player progress.',v_date USING ERRCODE='22023';
        END IF;
      END IF;
    END IF;
    FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks') LOOP
      IF v_task->>'label' IS NULL OR char_length(trim(v_task->>'label')) NOT BETWEEN 1 AND 160
         OR coalesce((v_task->>'target_value')::integer,0)<0 OR coalesce((v_task->>'shots_expected')::integer,0)<0 THEN
        RAISE EXCEPTION 'Each activity needs a name and non-negative targets' USING ERRCODE='22023';
      END IF;
    END LOOP;
  END LOOP;
  IF p_publish AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_days) d WHERE jsonb_array_length(d->'tasks')>0) THEN
    RAISE EXCEPTION 'Add at least one activity before publishing' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.team_week_plans(id,team_id,name,start_date,tier,use_tier_scaling,status,created_by_user_id)
    VALUES(p_id,p_team_id,trim(p_name),p_start_date,p_tier,p_use_tier_scaling,CASE WHEN p_publish THEN 'published' ELSE 'draft' END,v_user)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,start_date=excluded.start_date,tier=excluded.tier,
      use_tier_scaling=excluded.use_tier_scaling,
      status=CASE WHEN p_publish THEN 'published' ELSE public.team_week_plans.status END,updated_at=now();
  DELETE FROM public.team_week_plan_days WHERE team_week_plan_id=p_id;
  FOR v_day IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    v_date := (v_day->>'date')::date;
    INSERT INTO public.team_week_plan_days(team_week_plan_id,date,title,notes)
      VALUES(p_id,v_date,nullif(v_day->>'title',''),nullif(v_day->>'notes','')) RETURNING id INTO v_day_id;
    v_card_id:=NULL; v_order:=0;
    IF p_publish AND jsonb_array_length(v_day->'tasks')>0 THEN
      INSERT INTO public.practice_cards(team_id,date,mode,tier,title,notes,created_by_user_id,published_at,program_source)
        VALUES(p_team_id,v_date,'normal',p_tier,nullif(v_day->>'title',''),nullif(v_day->>'notes',''),v_user,now(),'team')
        ON CONFLICT(team_id,date,mode) WHERE program_source='team' DO UPDATE SET
          tier=excluded.tier,title=excluded.title,notes=excluded.notes,published_at=now(),updated_at=now()
        RETURNING id INTO v_card_id;
      DELETE FROM public.practice_tasks WHERE practice_card_id=v_card_id;
    ELSIF p_publish THEN
      DELETE FROM public.practice_tasks WHERE practice_card_id IN (SELECT id FROM public.practice_cards WHERE team_id=p_team_id AND date=v_date AND mode='normal' AND program_source='team');
      DELETE FROM public.practice_cards WHERE team_id=p_team_id AND date=v_date AND mode='normal' AND program_source='team';
    END IF;
    FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks') LOOP
      v_target:=nullif(v_task->>'target_value','')::integer; v_shots:=nullif(v_task->>'shots_expected','')::integer;
      INSERT INTO public.team_week_plan_tasks(team_week_plan_day_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url,sets_count,rest_seconds,equipment,instructions)
        VALUES(v_day_id,v_order,coalesce(v_task->>'task_type','other'),trim(v_task->>'label'),coalesce(v_task->>'target_type','none'),
          v_target,coalesce(v_task->>'shot_type','none'),v_shots,coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''),coalesce((v_task->>'sets_count')::integer,1),coalesce((v_task->>'rest_seconds')::integer,0),coalesce(v_task->>'equipment',''),coalesce(v_task->>'instructions',''));
      IF v_card_id IS NOT NULL THEN
        IF p_use_tier_scaling THEN
          v_scaled:=v_target*v_factor;
          v_target:=CASE WHEN v_scaled<=10 THEN round(v_scaled) WHEN v_scaled<=60 THEN round(v_scaled/5)*5 ELSE round(v_scaled/10)*10 END;
          v_scaled:=v_shots*v_factor;
          v_shots:=CASE WHEN v_scaled<=10 THEN round(v_scaled) WHEN v_scaled<=60 THEN round(v_scaled/5)*5 ELSE round(v_scaled/10)*10 END;
        END IF;
        INSERT INTO public.practice_tasks(practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url,sets_count,rest_seconds,equipment,instructions,program_source)
          VALUES(v_card_id,v_order,coalesce(v_task->>'task_type','other'),trim(v_task->>'label'),coalesce(v_task->>'target_type','none'),
            v_target,coalesce(v_task->>'shot_type','none'),v_shots,coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''),coalesce((v_task->>'sets_count')::integer,1),coalesce((v_task->>'rest_seconds')::integer,0),coalesce(v_task->>'equipment',''),coalesce(v_task->>'instructions',''),'team');
      END IF;
      v_order:=v_order+1;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('success',true,'plan_id',p_id,'published',p_publish);
END $function$;


CREATE OR REPLACE FUNCTION public.save_team_practice_card(p_id uuid, p_team_id uuid, p_date date, p_tier text, p_title text, p_notes text, p_tasks jsonb, p_publish boolean, p_mode text DEFAULT 'normal'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid:=auth.uid(); v_existing public.practice_cards; v_task jsonb; v_order integer:=0;
BEGIN
  IF v_user IS NULL OR NOT public.is_team_adult(p_team_id,v_user) THEN
    RAISE EXCEPTION 'Team staff access required' USING ERRCODE='42501';
  END IF;
  IF p_id IS NULL OR p_date IS NULL OR p_date<current_date OR p_publish IS NULL
     OR p_tier IS NULL OR p_tier NOT IN ('rec','rep','elite')
     OR p_mode IS NULL OR p_mode NOT IN ('normal','game_day')
     OR char_length(coalesce(p_title,''))>160
     OR jsonb_typeof(p_tasks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_tasks)>50 THEN
    RAISE EXCEPTION 'Choose a valid date, intensity, and up to 50 activities' USING ERRCODE='22023';
  END IF;
  IF p_publish AND jsonb_array_length(p_tasks)=0 THEN
    RAISE EXCEPTION 'Add at least one activity before publishing' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.teams WHERE id=p_team_id FOR UPDATE;
  SELECT * INTO v_existing FROM public.practice_cards WHERE id=p_id FOR UPDATE;
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.published_at IS NOT NULL AND jsonb_array_length(p_tasks)=0 THEN
      RAISE EXCEPTION 'A published workout needs at least one activity' USING ERRCODE='22023';
    END IF;
    IF v_existing.team_id<>p_team_id OR v_existing.program_source IS DISTINCT FROM 'team'
       OR v_existing.date<>p_date OR v_existing.mode<>p_mode THEN
      RAISE EXCEPTION 'This workout does not match the selected team and date' USING ERRCODE='42501';
    END IF;
    PERFORM 1 FROM public.practice_tasks WHERE practice_card_id=p_id FOR UPDATE;
    IF v_existing.locked
       OR EXISTS(SELECT 1 FROM public.task_completions c JOIN public.practice_tasks t ON t.id=c.practice_task_id WHERE t.practice_card_id=p_id)
       OR EXISTS(SELECT 1 FROM public.session_completions WHERE practice_card_id=p_id)
       OR EXISTS(SELECT 1 FROM public.session_photos WHERE practice_card_id=p_id) THEN
      RAISE EXCEPTION 'This workout is locked or has player progress. Choose another date to keep that work.' USING ERRCODE='22023';
    END IF;
  ELSIF EXISTS(SELECT 1 FROM public.practice_cards WHERE team_id=p_team_id AND date=p_date AND mode=p_mode AND program_source='team') THEN
    RAISE EXCEPTION 'A workout already exists on this date. Open it to make changes.' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.practice_cards(id,team_id,date,mode,tier,title,notes,created_by_user_id,published_at,program_source)
    VALUES(p_id,p_team_id,p_date,p_mode,p_tier,nullif(trim(p_title),''),nullif(trim(p_notes),''),v_user,CASE WHEN p_publish THEN now() END,'team')
    ON CONFLICT(id) DO UPDATE SET tier=excluded.tier,title=excluded.title,notes=excluded.notes,
      published_at=CASE WHEN p_publish THEN coalesce(public.practice_cards.published_at,now()) ELSE public.practice_cards.published_at END,updated_at=now();
  DELETE FROM public.practice_tasks WHERE practice_card_id=p_id;
  FOR v_task IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
    IF v_task->>'label' IS NULL OR char_length(trim(v_task->>'label')) NOT BETWEEN 1 AND 160
       OR coalesce(nullif(v_task->>'task_type',''),'other') NOT IN ('shooting','conditioning','mobility','recovery','prep','other','video')
       OR coalesce((v_task->>'target_value')::integer,0)<0 OR coalesce((v_task->>'shots_expected')::integer,0)<0 THEN
      RAISE EXCEPTION 'Each activity needs a name and non-negative targets' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.practice_tasks(practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,coach_notes,video_url,sets_count,rest_seconds,equipment,instructions,program_source)
      VALUES(p_id,v_order,coalesce(nullif(v_task->>'task_type',''),'other'),trim(v_task->>'label'),coalesce(nullif(v_task->>'target_type',''),'none'),
        nullif(v_task->>'target_value','')::integer,coalesce(nullif(v_task->>'shot_type',''),'none'),nullif(v_task->>'shots_expected','')::integer,
        coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'coach_notes',''),nullif(v_task->>'video_url',''),coalesce((v_task->>'sets_count')::integer,1),coalesce((v_task->>'rest_seconds')::integer,0),coalesce(v_task->>'equipment',''),coalesce(v_task->>'instructions',''),'team');
    v_order:=v_order+1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'card_id',p_id,'task_count',v_order,'published',p_publish OR v_existing.published_at IS NOT NULL);
END $function$;


CREATE OR REPLACE FUNCTION public.save_personal_workouts(p_player_id uuid, p_tier text, p_days jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_user uuid:=auth.uid(); v_day jsonb; v_task jsonb; v_date date; v_id uuid; v_order integer; v_count integer:=0; v_ids jsonb:='[]';
BEGIN
  IF v_user IS NULL OR (NOT public.is_player_guardian(p_player_id,v_user) AND NOT EXISTS(SELECT 1 FROM public.players WHERE id=p_player_id AND owner_user_id=v_user)) THEN
    RAISE EXCEPTION 'You cannot manage this player' USING ERRCODE='42501';
  END IF;
  IF p_tier IS NULL OR p_tier NOT IN ('base','rec','rep','elite') OR jsonb_typeof(p_days) IS DISTINCT FROM 'array' OR jsonb_array_length(p_days) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Choose a valid intensity and between one and 180 workout days' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(DISTINCT value->>'date') FROM jsonb_array_elements(p_days))<>jsonb_array_length(p_days) THEN
    RAISE EXCEPTION 'Each workout needs a unique date' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.players WHERE id=p_player_id FOR UPDATE;
  FOR v_day IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    v_date:=(v_day->>'date')::date;
    IF v_date IS NULL OR v_date<current_date OR jsonb_typeof(v_day->'tasks') IS DISTINCT FROM 'array' OR jsonb_array_length(v_day->'tasks')>50
       OR coalesce(v_day->>'mode','normal') NOT IN ('normal','solo') OR char_length(coalesce(v_day->>'title',''))>160 THEN
      RAISE EXCEPTION 'Choose a valid future workout date and up to 50 activities' USING ERRCODE='22023';
    END IF;
    SELECT id INTO v_id FROM public.personal_practice_cards WHERE player_id=p_player_id AND date=v_date FOR UPDATE;
    IF v_id IS NOT NULL THEN
      PERFORM 1 FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_id FOR UPDATE;
      IF EXISTS(SELECT 1 FROM public.personal_task_completions c JOIN public.personal_practice_tasks t ON t.id=c.personal_practice_task_id WHERE t.personal_practice_card_id=v_id)
         OR EXISTS(SELECT 1 FROM public.personal_session_completions WHERE personal_practice_card_id=v_id) THEN
        RAISE EXCEPTION 'A workout on % has player progress. Choose another date to keep that work.',v_date USING ERRCODE='22023';
      END IF;
    END IF;
    IF jsonb_array_length(v_day->'tasks')=0 THEN
      IF v_id IS NOT NULL THEN
        DELETE FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_id;
        DELETE FROM public.personal_practice_cards WHERE id=v_id;
      END IF;
      CONTINUE;
    END IF;
    INSERT INTO public.personal_practice_cards(player_id,date,title,notes,tier,mode,published_at)
      VALUES(p_player_id,v_date,nullif(trim(v_day->>'title'),''),nullif(trim(v_day->>'notes'),''),p_tier,coalesce(v_day->>'mode','normal'),now())
      ON CONFLICT(player_id,date) DO UPDATE SET title=excluded.title,notes=excluded.notes,tier=excluded.tier,mode=excluded.mode,published_at=excluded.published_at,updated_at=now() RETURNING id INTO v_id;
    DELETE FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_id;
    v_order:=0;
    FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks') LOOP
      IF v_task->>'label' IS NULL OR char_length(trim(v_task->>'label')) NOT BETWEEN 1 AND 160
         OR coalesce(nullif(v_task->>'task_type',''),'other') NOT IN ('shooting','conditioning','mobility','recovery','prep','other','video')
       OR coalesce((v_task->>'target_value')::integer,0)<0 OR coalesce((v_task->>'shots_expected')::integer,0)<0 THEN
        RAISE EXCEPTION 'Each activity needs a name and non-negative targets' USING ERRCODE='22023';
      END IF;
      INSERT INTO public.personal_practice_tasks(personal_practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url,sets_count,rest_seconds,equipment,instructions)
        VALUES(v_id,v_order,coalesce(nullif(v_task->>'task_type',''),'other'),trim(v_task->>'label'),coalesce(nullif(v_task->>'target_type',''),'none'),
          nullif(v_task->>'target_value','')::integer,coalesce(nullif(v_task->>'shot_type',''),'none'),nullif(v_task->>'shots_expected','')::integer,
          coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''),coalesce((v_task->>'sets_count')::integer,1),coalesce((v_task->>'rest_seconds')::integer,0),coalesce(v_task->>'equipment',''),coalesce(v_task->>'instructions',''));
      v_order:=v_order+1;
    END LOOP;
    v_count:=v_count+1; v_ids:=v_ids||jsonb_build_array(v_id);
  END LOOP;
  RETURN jsonb_build_object('success',true,'card_count',v_count,'card_ids',v_ids);
END $function$;

