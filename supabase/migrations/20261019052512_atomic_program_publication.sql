-- Save the editable week and its published workouts in one transaction.
-- Staff scope is checked before the definer reads or writes any team data.
CREATE OR REPLACE FUNCTION public.save_team_week_plan(
  p_id uuid, p_team_id uuid, p_name text, p_start_date date,
  p_tier text, p_use_tier_scaling boolean, p_days jsonb, p_publish boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
    IF p_publish AND jsonb_array_length(v_day->'tasks')>0 THEN
      IF v_date<current_date THEN RAISE EXCEPTION 'Past workouts cannot be replaced' USING ERRCODE='22023'; END IF;
      SELECT id INTO v_card_id FROM public.practice_cards
        WHERE team_id=p_team_id AND date=v_date AND mode='normal' AND program_source='team' FOR UPDATE;
      IF v_card_id IS NOT NULL THEN
        -- Lock task rows before inspecting progress, so concurrent completions cannot be deleted unnoticed.
        PERFORM 1 FROM public.practice_tasks WHERE practice_card_id=v_card_id FOR UPDATE;
        IF EXISTS (SELECT 1 FROM public.practice_cards WHERE id=v_card_id AND locked)
           OR EXISTS (SELECT 1 FROM public.task_completions c JOIN public.practice_tasks t ON t.id=c.practice_task_id
             WHERE t.practice_card_id=v_card_id AND (c.completed OR coalesce(c.shots_logged,0)>0))
           OR EXISTS (SELECT 1 FROM public.session_completions WHERE practice_card_id=v_card_id AND status='complete') THEN
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
    END IF;
    FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks') LOOP
      v_target:=nullif(v_task->>'target_value','')::integer; v_shots:=nullif(v_task->>'shots_expected','')::integer;
      INSERT INTO public.team_week_plan_tasks(team_week_plan_day_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url)
        VALUES(v_day_id,v_order,coalesce(v_task->>'task_type','other'),trim(v_task->>'label'),coalesce(v_task->>'target_type','none'),
          v_target,coalesce(v_task->>'shot_type','none'),v_shots,coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''));
      IF v_card_id IS NOT NULL THEN
        IF p_use_tier_scaling THEN
          v_scaled:=v_target*v_factor;
          v_target:=CASE WHEN v_scaled<=10 THEN round(v_scaled) WHEN v_scaled<=60 THEN round(v_scaled/5)*5 ELSE round(v_scaled/10)*10 END;
          v_scaled:=v_shots*v_factor;
          v_shots:=CASE WHEN v_scaled<=10 THEN round(v_scaled) WHEN v_scaled<=60 THEN round(v_scaled/5)*5 ELSE round(v_scaled/10)*10 END;
        END IF;
        INSERT INTO public.practice_tasks(practice_card_id,sort_order,task_type,label,target_type,target_value,shot_type,shots_expected,is_required,video_url,program_source)
          VALUES(v_card_id,v_order,coalesce(v_task->>'task_type','other'),trim(v_task->>'label'),coalesce(v_task->>'target_type','none'),
            v_target,coalesce(v_task->>'shot_type','none'),v_shots,coalesce((v_task->>'is_required')::boolean,true),nullif(v_task->>'video_url',''),'team');
      END IF;
      v_order:=v_order+1;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('success',true,'plan_id',p_id,'published',p_publish);
END $$;
REVOKE ALL ON FUNCTION public.save_team_week_plan(uuid,uuid,text,date,text,boolean,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_team_week_plan(uuid,uuid,text,date,text,boolean,jsonb,boolean) TO authenticated;
