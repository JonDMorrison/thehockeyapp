
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
    SELECT DISTINCT p.owner_user_id AS uid
    FROM players p
    UNION
    SELECT DISTINCT pg.user_id AS uid
    FROM player_guardians pg
  ),
  parent_player_map AS (
    SELECT pu.uid, array_agg(DISTINCT child_pid) AS player_ids
    FROM parent_users pu
    CROSS JOIN LATERAL (
      SELECT pl.id AS child_pid FROM players pl WHERE pl.owner_user_id = pu.uid
      UNION
      SELECT pg2.player_id AS child_pid FROM player_guardians pg2 WHERE pg2.user_id = pu.uid
    ) children
    GROUP BY pu.uid
  ),
  parent_metrics AS (
    SELECT
      ppm.uid,
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
      CASE WHEN EXISTS (
        SELECT 1 FROM session_completions sc2
        JOIN practice_cards pc2 ON pc2.id = sc2.practice_card_id
        WHERE sc2.player_id = ANY(ppm.player_ids)
          AND sc2.program_source = 'parent' AND sc2.status = 'complete'
          AND pc2.date >= p_week_start AND pc2.date <= v_week_end
        UNION ALL
        SELECT 1 FROM personal_session_completions psc2
        JOIN personal_practice_cards ppc2 ON ppc2.id = psc2.personal_practice_card_id
        WHERE psc2.player_id = ANY(ppm.player_ids)
          AND psc2.status = 'complete'
          AND ppc2.date >= p_week_start AND ppc2.date <= v_week_end
      ) THEN 1 ELSE 0 END AS has_streak,
      EXISTS(
        SELECT 1 FROM personal_training_plans ptp
        WHERE ptp.player_id = ANY(ppm.player_ids) AND ptp.is_active = true
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
