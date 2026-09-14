-- Launch hardening: keep family workouts private and make the most important
-- planning writes atomic. Each SECURITY DEFINER function validates ownership
-- before writing and has an explicit execution allow-list.

ALTER TABLE public.training_programs
  ADD COLUMN IF NOT EXISTS reward_type text,
  ADD COLUMN IF NOT EXISTS reward_description text;

ALTER TABLE public.team_week_plan_tasks
  ADD COLUMN IF NOT EXISTS video_url text;

-- The rebuilt personal-card table lost its original uniqueness constraint.
-- Restoring it prevents duplicate "today" workouts and makes replacements safe.
CREATE UNIQUE INDEX IF NOT EXISTS personal_practice_cards_player_date_unique
  ON public.personal_practice_cards (player_id, date);

-- Team workouts and legacy parent workouts must not compete for the same slot.
ALTER TABLE public.practice_cards
  DROP CONSTRAINT IF EXISTS practice_cards_team_id_date_mode_key;

CREATE UNIQUE INDEX IF NOT EXISTS practice_cards_team_schedule_unique
  ON public.practice_cards (team_id, date, mode)
  WHERE program_source = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS practice_cards_legacy_parent_unique
  ON public.practice_cards (team_id, date, mode, created_by_user_id)
  WHERE program_source = 'parent';

-- The old policies were permissive policies. PostgreSQL ORs permissive
-- policies together, so they could not act as a deny overlay.
DROP POLICY IF EXISTS "Coaches cannot access parent practice cards" ON public.practice_cards;
DROP POLICY IF EXISTS "Coaches cannot access parent practice tasks" ON public.practice_tasks;
DROP POLICY IF EXISTS "Coaches cannot access parent session completions" ON public.session_completions;

CREATE POLICY "Private legacy parent cards"
  ON public.practice_cards AS RESTRICTIVE FOR SELECT TO authenticated
  USING (program_source = 'team' OR created_by_user_id = (SELECT auth.uid()));

CREATE POLICY "New cards are team sourced"
  ON public.practice_cards AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (program_source = 'team');

CREATE POLICY "Only team cards can be updated"
  ON public.practice_cards AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (program_source = 'team')
  WITH CHECK (program_source = 'team');

CREATE POLICY "Only team cards can be deleted"
  ON public.practice_cards AS RESTRICTIVE FOR DELETE TO authenticated
  USING (program_source = 'team');

CREATE POLICY "Private legacy parent tasks"
  ON public.practice_tasks AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    program_source = 'team'
    OR EXISTS (
      SELECT 1
      FROM public.practice_cards card
      WHERE card.id = practice_tasks.practice_card_id
        AND card.program_source = 'parent'
        AND card.created_by_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "New tasks are team sourced"
  ON public.practice_tasks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (program_source = 'team');

CREATE POLICY "Only team tasks can be updated"
  ON public.practice_tasks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (program_source = 'team')
  WITH CHECK (program_source = 'team');

CREATE POLICY "Only team tasks can be deleted"
  ON public.practice_tasks AS RESTRICTIVE FOR DELETE TO authenticated
  USING (program_source = 'team');

CREATE POLICY "Private legacy parent completions"
  ON public.session_completions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    program_source = 'team'
    OR (
      public.is_player_guardian(player_id, (SELECT auth.uid()))
      AND EXISTS (
        SELECT 1
        FROM public.practice_cards card
        WHERE card.id = session_completions.practice_card_id
          AND card.program_source = 'parent'
          AND card.created_by_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE OR REPLACE FUNCTION public.replace_personal_training_program(
  p_player_id uuid,
  p_name text,
  p_tier text,
  p_days_per_week integer,
  p_training_focus text[],
  p_days jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_day jsonb;
  v_task jsonb;
  v_card_id uuid;
  v_card_count integer := 0;
  v_task_count integer := 0;
  v_date date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_player_guardian(p_player_id, v_user_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.players
       WHERE id = p_player_id AND owner_user_id = v_user_id
     ) THEN
    RAISE EXCEPTION 'You cannot manage this player' USING ERRCODE = '42501';
  END IF;
  IF char_length(trim(p_name)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Program name is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_days_per_week NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Training days must be between 1 and 7' USING ERRCODE = '22023';
  END IF;
  IF p_tier NOT IN ('base', 'rec', 'rep', 'elite') THEN
    RAISE EXCEPTION 'Training tier is invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_days) <> 'array' OR jsonb_array_length(p_days) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Program must contain between 1 and 180 workout days' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.personal_training_plans (
    player_id, name, tier, days_per_week, training_focus, is_active, updated_at
  ) VALUES (
    p_player_id, trim(p_name), p_tier, p_days_per_week,
    COALESCE(p_training_focus, ARRAY[]::text[]), true, now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    name = EXCLUDED.name,
    tier = EXCLUDED.tier,
    days_per_week = EXCLUDED.days_per_week,
    training_focus = EXCLUDED.training_focus,
    is_active = true,
    updated_at = now();

  FOR v_day IN SELECT value FROM jsonb_array_elements(p_days)
  LOOP
    BEGIN
      v_date := (v_day->>'date')::date;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'A workout date is invalid' USING ERRCODE = '22023';
    END;
    IF v_date < current_date THEN
      RAISE EXCEPTION 'Past workouts cannot be replaced' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(v_day->'tasks') <> 'array'
       OR jsonb_array_length(v_day->'tasks') NOT BETWEEN 1 AND 50 THEN
      RAISE EXCEPTION 'Each workout must contain between 1 and 50 tasks' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.personal_practice_cards card
      JOIN public.personal_session_completions completion
        ON completion.personal_practice_card_id = card.id
      WHERE card.player_id = p_player_id
        AND card.date = v_date
        AND completion.status = 'complete'
    ) THEN
      RAISE EXCEPTION 'A completed workout on % cannot be replaced', v_date USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.personal_practice_cards (
      player_id, date, title, notes, tier, mode, published_at, updated_at
    ) VALUES (
      p_player_id,
      v_date,
      nullif(trim(v_day->>'title'), ''),
      nullif(trim(v_day->>'notes'), ''),
      p_tier,
      'normal',
      now(),
      now()
    )
    ON CONFLICT (player_id, date) DO UPDATE SET
      title = EXCLUDED.title,
      notes = EXCLUDED.notes,
      tier = EXCLUDED.tier,
      mode = EXCLUDED.mode,
      published_at = EXCLUDED.published_at,
      updated_at = now()
    RETURNING id INTO v_card_id;

    DELETE FROM public.personal_practice_tasks
    WHERE personal_practice_card_id = v_card_id;

    FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks')
    LOOP
      IF char_length(trim(v_task->>'label')) NOT BETWEEN 1 AND 160 THEN
        RAISE EXCEPTION 'A task label is invalid' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.personal_practice_tasks (
        personal_practice_card_id, label, task_type, sort_order,
        target_type, target_value, shot_type, shots_expected,
        is_required, video_url
      ) VALUES (
        v_card_id,
        trim(v_task->>'label'),
        COALESCE(nullif(v_task->>'task_type', ''), 'other'),
        COALESCE((v_task->>'sort_order')::integer, v_task_count),
        COALESCE(nullif(v_task->>'target_type', ''), 'none'),
        nullif(v_task->>'target_value', '')::integer,
        COALESCE(nullif(v_task->>'shot_type', ''), 'none'),
        nullif(v_task->>'shots_expected', '')::integer,
        COALESCE((v_task->>'is_required')::boolean, true),
        nullif(v_task->>'video_url', '')
      );
      v_task_count := v_task_count + 1;
    END LOOP;
    v_card_count := v_card_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'card_count', v_card_count,
    'task_count', v_task_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_team_practice_card(
  p_team_id uuid,
  p_date date,
  p_publish boolean,
  p_tier text,
  p_title text,
  p_tasks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card_id uuid;
  v_locked boolean;
  v_task jsonb;
  v_task_count integer := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Team staff access required' USING ERRCODE = '42501';
  END IF;
  IF p_date < current_date THEN
    RAISE EXCEPTION 'Past workouts cannot be replaced' USING ERRCODE = '22023';
  END IF;
  IF p_tier NOT IN ('rec', 'rep', 'elite') THEN
    RAISE EXCEPTION 'Training tier is invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_tasks) <> 'array' OR jsonb_array_length(p_tasks) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Workout must contain between 1 and 50 tasks' USING ERRCODE = '22023';
  END IF;

  SELECT id, locked INTO v_card_id, v_locked
  FROM public.practice_cards
  WHERE team_id = p_team_id AND date = p_date AND mode = 'normal' AND program_source = 'team'
  FOR UPDATE;

  IF v_locked THEN
    RAISE EXCEPTION 'This workout is locked and cannot be replaced' USING ERRCODE = '22023';
  END IF;

  IF v_card_id IS NULL THEN
    INSERT INTO public.practice_cards (
      team_id, date, mode, tier, title, created_by_user_id, published_at, program_source
    ) VALUES (
      p_team_id, p_date, 'normal', p_tier, nullif(trim(p_title), ''),
      v_user_id, CASE WHEN p_publish THEN now() ELSE NULL END, 'team'
    ) RETURNING id INTO v_card_id;
  ELSE
    UPDATE public.practice_cards SET
      tier = p_tier,
      title = COALESCE(nullif(trim(p_title), ''), title),
      published_at = CASE WHEN p_publish THEN now() ELSE NULL END,
      updated_at = now()
    WHERE id = v_card_id;
    DELETE FROM public.practice_tasks WHERE practice_card_id = v_card_id;
  END IF;

  FOR v_task IN SELECT value FROM jsonb_array_elements(p_tasks)
  LOOP
    INSERT INTO public.practice_tasks (
      practice_card_id, sort_order, task_type, label, target_type,
      target_value, shot_type, shots_expected, is_required, video_url, program_source
    ) VALUES (
      v_card_id,
      COALESCE((v_task->>'sort_order')::integer, v_task_count),
      COALESCE(nullif(v_task->>'task_type', ''), 'other'),
      trim(v_task->>'label'),
      COALESCE(nullif(v_task->>'target_type', ''), 'none'),
      nullif(v_task->>'target_value', '')::integer,
      COALESCE(nullif(v_task->>'shot_type', ''), 'none'),
      nullif(v_task->>'shots_expected', '')::integer,
      COALESCE((v_task->>'is_required')::boolean, true),
      nullif(v_task->>'video_url', ''),
      'team'
    );
    v_task_count := v_task_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'card_id', v_card_id, 'task_count', v_task_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_training_program(
  p_team_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_tier text,
  p_days_per_week integer,
  p_focus_areas text[],
  p_time_budget integer,
  p_reward_type text,
  p_reward_description text,
  p_weeks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_program_id uuid;
  v_week_plan_id uuid;
  v_first_plan_id uuid;
  v_day_id uuid;
  v_week jsonb;
  v_day jsonb;
  v_task jsonb;
  v_task_index integer;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Team staff access required' USING ERRCODE = '42501';
  END IF;
  IF char_length(trim(p_name)) NOT BETWEEN 1 AND 100
     OR p_start_date < current_date
     OR p_end_date <= p_start_date
     OR p_tier NOT IN ('rec', 'rep', 'elite')
     OR p_days_per_week NOT BETWEEN 1 AND 7
     OR p_time_budget NOT BETWEEN 5 AND 120
     OR jsonb_typeof(p_weeks) <> 'array'
     OR jsonb_array_length(p_weeks) NOT BETWEEN 1 AND 26 THEN
    RAISE EXCEPTION 'Program settings are invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.training_programs (
    team_id, name, start_date, end_date, tier, days_per_week,
    focus_areas, time_budget_minutes, status, created_by_user_id,
    reward_type, reward_description
  ) VALUES (
    p_team_id, trim(p_name), p_start_date, p_end_date, p_tier,
    p_days_per_week, COALESCE(p_focus_areas, ARRAY[]::text[]),
    p_time_budget, 'active', v_user_id, nullif(p_reward_type, ''),
    nullif(trim(p_reward_description), '')
  ) RETURNING id INTO v_program_id;

  FOR v_week IN SELECT value FROM jsonb_array_elements(p_weeks)
  LOOP
    INSERT INTO public.team_week_plans (
      team_id, name, start_date, tier, status, created_by_user_id, program_id
    ) VALUES (
      p_team_id,
      trim(p_name) || ' - Week ' || COALESCE(v_week->>'weekNumber', '1'),
      (v_week->>'startDate')::date,
      p_tier,
      'draft',
      v_user_id,
      v_program_id
    ) RETURNING id INTO v_week_plan_id;

    IF v_first_plan_id IS NULL THEN v_first_plan_id := v_week_plan_id; END IF;

    FOR v_day IN SELECT value FROM jsonb_array_elements(v_week->'days')
    LOOP
      INSERT INTO public.team_week_plan_days (
        team_week_plan_id, date, title, notes
      ) VALUES (
        v_week_plan_id,
        (v_day->>'date')::date,
        nullif(trim(v_day->>'title'), ''),
        nullif(trim(v_day->>'notes'), '')
      ) RETURNING id INTO v_day_id;

      v_task_index := 0;
      FOR v_task IN SELECT value FROM jsonb_array_elements(v_day->'tasks')
      LOOP
        INSERT INTO public.team_week_plan_tasks (
          team_week_plan_day_id, sort_order, task_type, label,
          target_type, target_value, shot_type, shots_expected,
          is_required, video_url
        ) VALUES (
          v_day_id,
          COALESCE((v_task->>'sort_order')::integer, v_task_index),
          COALESCE(nullif(v_task->>'task_type', ''), 'other'),
          trim(v_task->>'label'),
          COALESCE(nullif(v_task->>'target_type', ''), 'none'),
          nullif(v_task->>'target_value', '')::integer,
          COALESCE(nullif(v_task->>'shot_type', ''), 'none'),
          nullif(v_task->>'shots_expected', '')::integer,
          COALESCE((v_task->>'is_required')::boolean, true),
          nullif(v_task->>'video_url', '')
        );
        v_task_index := v_task_index + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'program_id', v_program_id,
    'first_plan_id', v_first_plan_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_personal_training_program(uuid, text, text, integer, text[], jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_team_practice_card(uuid, date, boolean, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_team_training_program(uuid, text, date, date, text, integer, text[], integer, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_personal_training_program(uuid, text, text, integer, text[], jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_team_practice_card(uuid, date, boolean, text, text, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_training_program(uuid, text, date, date, text, integer, text[], integer, text, text, jsonb)
  TO authenticated;
