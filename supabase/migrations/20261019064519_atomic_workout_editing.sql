-- Protect complete workout saves from partial writes and preserve any recorded player work.
CREATE OR REPLACE FUNCTION public.save_team_practice_card(
  p_id uuid, p_team_id uuid, p_date date, p_tier text, p_title text,
  p_notes text, p_tasks jsonb, p_publish boolean, p_mode text DEFAULT 'normal'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
    INSERT INTO public.practice_tasks(practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,coach_notes,video_url,program_source)
      VALUES(p_id,v_order,coalesce(nullif(v_task->>'task_type',''),'other'),trim(v_task->>'label'),coalesce(nullif(v_task->>'target_type',''),'none'),
        nullif(v_task->>'target_value','')::integer,coalesce(nullif(v_task->>'shot_type',''),'none'),nullif(v_task->>'shots_expected','')::integer,
        coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'coach_notes',''),nullif(v_task->>'video_url',''),'team');
    v_order:=v_order+1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'card_id',p_id,'task_count',v_order,'published',p_publish OR v_existing.published_at IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.save_team_practice_card(uuid,uuid,date,text,text,text,jsonb,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_team_practice_card(uuid,uuid,date,text,text,text,jsonb,boolean,text) TO authenticated;

-- Existing quick-assignment callers retain their contract and now share the same progress guard.
CREATE OR REPLACE FUNCTION public.replace_team_practice_card(p_team_id uuid,p_date date,p_publish boolean,p_tier text,p_title text,p_tasks jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid; v_notes text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_adult(p_team_id,auth.uid()) THEN
    RAISE EXCEPTION 'Team staff access required' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.teams WHERE id=p_team_id FOR UPDATE;
  SELECT id,notes INTO v_id,v_notes FROM public.practice_cards WHERE team_id=p_team_id AND date=p_date AND mode='normal' AND program_source='team';
  RETURN public.save_team_practice_card(coalesce(v_id,gen_random_uuid()),p_team_id,p_date,p_tier,p_title,v_notes,p_tasks,p_publish,'normal');
END $$;
REVOKE ALL ON FUNCTION public.replace_team_practice_card(uuid,date,boolean,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_team_practice_card(uuid,date,boolean,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_personal_workouts(p_player_id uuid,p_tier text,p_days jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
      INSERT INTO public.personal_practice_tasks(personal_practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url)
        VALUES(v_id,v_order,coalesce(nullif(v_task->>'task_type',''),'other'),trim(v_task->>'label'),coalesce(nullif(v_task->>'target_type',''),'none'),
          nullif(v_task->>'target_value','')::integer,coalesce(nullif(v_task->>'shot_type',''),'none'),nullif(v_task->>'shots_expected','')::integer,
          coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''));
      v_order:=v_order+1;
    END LOOP;
    v_count:=v_count+1; v_ids:=v_ids||jsonb_build_array(v_id);
  END LOOP;
  RETURN jsonb_build_object('success',true,'card_count',v_count,'card_ids',v_ids);
END $$;
REVOKE ALL ON FUNCTION public.save_personal_workouts(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_personal_workouts(uuid,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_personal_training_program(p_player_id uuid,p_name text,p_tier text,p_days_per_week integer,p_training_focus text[],p_days jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
  -- Authorize and validate all days before updating plan metadata; any later error rolls back both.
  IF p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 1 AND 100 OR p_days_per_week IS NULL OR p_days_per_week NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Choose a program name and between one and seven training days' USING ERRCODE='22023';
  END IF;
  v_result:=public.save_personal_workouts(p_player_id,p_tier,p_days);
  INSERT INTO public.personal_training_plans(player_id,name,tier,days_per_week,training_focus,is_active,updated_at)
    VALUES(p_player_id,trim(p_name),p_tier,p_days_per_week,coalesce(p_training_focus,ARRAY[]::text[]),true,now())
    ON CONFLICT(player_id) DO UPDATE SET name=excluded.name,tier=excluded.tier,days_per_week=excluded.days_per_week,training_focus=excluded.training_focus,is_active=true,updated_at=now();
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.replace_personal_training_program(uuid,text,text,integer,text[],jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_personal_training_program(uuid,text,text,integer,text[],jsonb) TO authenticated;
