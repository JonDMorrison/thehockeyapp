
-- 1. Create parent_weekly_summaries (aggregate per-parent, all children)
CREATE TABLE public.parent_weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  total_shots integer NOT NULL DEFAULT 0,
  total_pushups integer NOT NULL DEFAULT 0,
  total_workouts integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  focus_areas text[] DEFAULT '{}',
  program_active boolean NOT NULL DEFAULT false,
  ai_summary text,
  summary_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (user_id, week_start)
);

CREATE INDEX idx_parent_weekly_summaries_user_week
  ON public.parent_weekly_summaries (user_id, week_start);

ALTER TABLE public.parent_weekly_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT: only the owner
CREATE POLICY "Users can view own weekly summaries"
  ON public.parent_weekly_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for normal users (service role only)

-- 2. RPC: get_parent_week_metrics
-- Aggregates across ALL children owned/guarded by this user, parent-only data
CREATE OR REPLACE FUNCTION public.get_parent_week_metrics(
  p_user_id uuid,
  p_week_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end date;
  v_total_shots integer := 0;
  v_total_pushups integer := 0;
  v_total_workouts integer := 0;
  v_longest_streak integer := 0;
  v_focus_areas text[] := '{}';
  v_program_active boolean := false;
  v_player_ids uuid[];
BEGIN
  -- Auth check
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_week_end := p_week_start + 6;

  -- Collect all player_ids owned or guarded by this user
  SELECT array_agg(DISTINCT pid) INTO v_player_ids
  FROM (
    SELECT id AS pid FROM players WHERE owner_user_id = p_user_id
    UNION
    SELECT player_id AS pid FROM player_guardians WHERE user_id = p_user_id
  ) sub;

  IF v_player_ids IS NULL OR array_length(v_player_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'total_shots', 0, 'total_pushups', 0, 'total_workouts', 0,
      'longest_streak', 0, 'focus_areas', '[]'::jsonb, 'program_active', false
    );
  END IF;

  -- Total workouts from parent program_source session_completions
  SELECT count(*) INTO v_total_workouts
  FROM session_completions sc
  JOIN practice_cards pc ON pc.id = sc.practice_card_id
  WHERE sc.player_id = ANY(v_player_ids)
    AND sc.program_source = 'parent'
    AND sc.status = 'complete'
    AND pc.date >= p_week_start
    AND pc.date <= v_week_end;

  -- Also count personal session completions
  v_total_workouts := v_total_workouts + (
    SELECT count(*)
    FROM personal_session_completions psc
    JOIN personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE psc.player_id = ANY(v_player_ids)
      AND psc.status = 'complete'
      AND ppc.date >= p_week_start
      AND ppc.date <= v_week_end
  );

  -- Shots from parent task_completions
  SELECT COALESCE(sum(tc.shots_logged), 0) INTO v_total_shots
  FROM task_completions tc
  JOIN practice_tasks pt ON pt.id = tc.practice_task_id
  JOIN practice_cards pc ON pc.id = pt.practice_card_id
  WHERE tc.player_id = ANY(v_player_ids)
    AND tc.completed = true
    AND pc.program_source = 'parent'
    AND pc.date >= p_week_start
    AND pc.date <= v_week_end;

  -- Add personal shots
  v_total_shots := v_total_shots + (
    SELECT COALESCE(sum(ppt.shots_expected), 0)
    FROM personal_task_completions ptc
    JOIN personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
    JOIN personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id
    WHERE ptc.player_id = ANY(v_player_ids)
      AND ptc.completed = true
      AND ppc.date >= p_week_start
      AND ppc.date <= v_week_end
  );

  -- Pushups/strength reps from parent tasks
  SELECT COALESCE(sum(pt.target_value), 0) INTO v_total_pushups
  FROM task_completions tc
  JOIN practice_tasks pt ON pt.id = tc.practice_task_id
  JOIN practice_cards pc ON pc.id = pt.practice_card_id
  WHERE tc.player_id = ANY(v_player_ids)
    AND tc.completed = true
    AND pc.program_source = 'parent'
    AND pc.date >= p_week_start
    AND pc.date <= v_week_end
    AND pt.task_type = 'strength'
    AND pt.target_type = 'reps';

  -- Add personal strength reps
  v_total_pushups := v_total_pushups + (
    SELECT COALESCE(sum(ppt.target_value), 0)
    FROM personal_task_completions ptc
    JOIN personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
    JOIN personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id
    WHERE ptc.player_id = ANY(v_player_ids)
      AND ptc.completed = true
      AND ppc.date >= p_week_start
      AND ppc.date <= v_week_end
      AND ppt.task_type = 'strength'
      AND ppt.target_type = 'reps'
  );

  -- Longest streak across all children (parent-only completions)
  SELECT COALESCE(max(streak_len), 0) INTO v_longest_streak
  FROM (
    SELECT player_id, count(*) AS streak_len
    FROM (
      SELECT player_id, completion_date,
             completion_date - (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY completion_date))::int AS grp
      FROM (
        SELECT DISTINCT sc.player_id, pc.date AS completion_date
        FROM session_completions sc
        JOIN practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = ANY(v_player_ids)
          AND sc.program_source = 'parent'
          AND sc.status = 'complete'
        UNION
        SELECT DISTINCT psc.player_id, ppc.date AS completion_date
        FROM personal_session_completions psc
        JOIN personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
        WHERE psc.player_id = ANY(v_player_ids)
          AND psc.status = 'complete'
      ) all_dates
    ) with_groups
    GROUP BY player_id, grp
  ) streaks;

  -- Focus areas from active personal training plans
  SELECT array_agg(DISTINCT unnested) INTO v_focus_areas
  FROM personal_training_plans ptp,
       unnest(ptp.training_focus) AS unnested
  WHERE ptp.player_id = ANY(v_player_ids)
    AND ptp.is_active = true;

  IF v_focus_areas IS NULL THEN
    v_focus_areas := '{}';
  END IF;

  -- Program active check
  SELECT EXISTS(
    SELECT 1 FROM personal_training_plans
    WHERE player_id = ANY(v_player_ids) AND is_active = true
  ) INTO v_program_active;

  RETURN jsonb_build_object(
    'total_shots', v_total_shots,
    'total_pushups', v_total_pushups,
    'total_workouts', v_total_workouts,
    'longest_streak', v_longest_streak,
    'focus_areas', to_jsonb(v_focus_areas),
    'program_active', v_program_active
  );
END;
$$;

-- 3. RPC: get_parents_eligible_for_weekly_summary
CREATE OR REPLACE FUNCTION public.get_parents_eligible_for_weekly_summary(
  p_week_start date
)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_end date;
BEGIN
  v_week_end := p_week_start + 6;

  RETURN QUERY
  WITH parent_users AS (
    -- Users who own at least one player
    SELECT DISTINCT p.owner_user_id AS uid
    FROM players p
    UNION
    -- Users who are guardians
    SELECT DISTINCT pg.user_id AS uid
    FROM player_guardians pg
  ),
  parent_player_map AS (
    SELECT pu.uid, array_agg(DISTINCT pid) AS player_ids
    FROM parent_users pu
    CROSS JOIN LATERAL (
      SELECT id AS pid FROM players WHERE owner_user_id = pu.uid
      UNION
      SELECT player_id AS pid FROM player_guardians WHERE user_id = pu.uid
    ) children
    GROUP BY pu.uid
  ),
  parent_metrics AS (
    SELECT
      ppm.uid,
      -- workouts
      (
        SELECT count(*)
        FROM session_completions sc
        JOIN practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = ANY(ppm.player_ids)
          AND sc.program_source = 'parent'
          AND sc.status = 'complete'
          AND pc.date >= p_week_start AND pc.date <= v_week_end
      ) + (
        SELECT count(*)
        FROM personal_session_completions psc
        JOIN personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
        WHERE psc.player_id = ANY(ppm.player_ids)
          AND psc.status = 'complete'
          AND ppc.date >= p_week_start AND ppc.date <= v_week_end
      ) AS total_workouts,
      -- shots
      (
        SELECT COALESCE(sum(tc.shots_logged), 0)
        FROM task_completions tc
        JOIN practice_tasks pt ON pt.id = tc.practice_task_id
        JOIN practice_cards pc ON pc.id = pt.practice_card_id
        WHERE tc.player_id = ANY(ppm.player_ids)
          AND tc.completed = true
          AND pc.program_source = 'parent'
          AND pc.date >= p_week_start AND pc.date <= v_week_end
      ) + (
        SELECT COALESCE(sum(ppt.shots_expected), 0)
        FROM personal_task_completions ptc
        JOIN personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
        JOIN personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id
        WHERE ptc.player_id = ANY(ppm.player_ids)
          AND ptc.completed = true
          AND ppc.date >= p_week_start AND ppc.date <= v_week_end
      ) AS total_shots,
      -- streak (simplified: any completion in the week counts as streak >= 1)
      CASE WHEN EXISTS (
        SELECT 1 FROM session_completions sc
        JOIN practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = ANY(ppm.player_ids)
          AND sc.program_source = 'parent' AND sc.status = 'complete'
          AND pc.date >= p_week_start AND pc.date <= v_week_end
        UNION ALL
        SELECT 1 FROM personal_session_completions psc
        JOIN personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
        WHERE psc.player_id = ANY(ppm.player_ids)
          AND psc.status = 'complete'
          AND ppc.date >= p_week_start AND ppc.date <= v_week_end
      ) THEN 1 ELSE 0 END AS has_streak,
      -- program active
      EXISTS(
        SELECT 1 FROM personal_training_plans
        WHERE player_id = ANY(ppm.player_ids) AND is_active = true
      ) AS program_active
    FROM parent_player_map ppm
  )
  SELECT pm.uid AS user_id
  FROM parent_metrics pm
  WHERE pm.total_workouts >= 2
     OR pm.total_shots >= 200
     OR pm.has_streak >= 1
     OR pm.program_active = true;
END;
$$;
