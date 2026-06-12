-- End of Season Report aggregation RPC.
--
-- SECURITY: This function is SECURITY DEFINER with an explicit coach guard
-- (public.is_team_adult). Rationale: aggregating every roster player's
-- completion data requires reading rows that per-player RLS would hide from
-- the coach, so an INVOKER function is insufficient. DEFINER + an explicit
-- is_team_adult check is the correct, safe choice: a non-coach gets back
-- { success: false } and never sees any data.

CREATE OR REPLACE FUNCTION public.get_season_report(
  p_team_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_published_cards int;
  v_players jsonb;
  v_total_sessions int;
  v_total_shots int;
  v_avg_completion int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Coach-only guard. See header comment for the DEFINER rationale.
  IF NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Published team cards within the range.
  SELECT COUNT(*)
  INTO v_published_cards
  FROM public.practice_cards pc
  WHERE pc.team_id = p_team_id
    AND pc.date BETWEEN p_start_date AND p_end_date
    AND pc.published_at IS NOT NULL
    AND pc.program_source = 'team';

  WITH published AS (
    SELECT pc.id, pc.date
    FROM public.practice_cards pc
    WHERE pc.team_id = p_team_id
      AND pc.date BETWEEN p_start_date AND p_end_date
      AND pc.published_at IS NOT NULL
      AND pc.program_source = 'team'
  ),
  roster AS (
    SELECT pl.id AS player_id,
           pl.first_name,
           pl.last_initial
    FROM public.team_memberships tm
    JOIN public.players pl ON pl.id = tm.player_id
    WHERE tm.team_id = p_team_id
      AND (tm.status IS NULL OR tm.status <> 'removed')
  ),
  -- Distinct complete-session dates per player within range.
  complete_sessions AS (
    SELECT sc.player_id,
           pub.id AS practice_card_id,
           pub.date AS session_date
    FROM public.session_completions sc
    JOIN published pub ON pub.id = sc.practice_card_id
    WHERE sc.status = 'complete'
  ),
  sessions_per_player AS (
    SELECT r.player_id,
           COUNT(DISTINCT cs.practice_card_id) AS sessions_completed
    FROM roster r
    LEFT JOIN complete_sessions cs ON cs.player_id = r.player_id
    GROUP BY r.player_id
  ),
  shots_per_player AS (
    SELECT r.player_id,
           COALESCE(SUM(tc.shots_logged), 0) AS total_shots
    FROM roster r
    LEFT JOIN public.task_completions tc ON tc.player_id = r.player_id AND tc.completed = true
    LEFT JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
    LEFT JOIN published pub ON pub.id = pt.practice_card_id
    WHERE tc.id IS NULL OR pub.id IS NOT NULL
    GROUP BY r.player_id
  ),
  badges_per_player AS (
    SELECT r.player_id,
           COUNT(pb.id) AS badges_earned
    FROM roster r
    LEFT JOIN public.player_badges pb
      ON pb.player_id = r.player_id
     AND pb.awarded_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY r.player_id
  ),
  -- Gaps-and-islands: longest run of consecutive calendar dates on which the
  -- player has a complete session within range.
  distinct_dates AS (
    SELECT DISTINCT player_id, session_date
    FROM complete_sessions
  ),
  islands AS (
    SELECT player_id,
           session_date,
           session_date - (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY session_date))::int AS grp
    FROM distinct_dates
  ),
  streak_per_player AS (
    SELECT r.player_id,
           COALESCE(MAX(run_len), 0) AS longest_streak
    FROM roster r
    LEFT JOIN (
      SELECT player_id, grp, COUNT(*) AS run_len
      FROM islands
      GROUP BY player_id, grp
    ) runs ON runs.player_id = r.player_id
    GROUP BY r.player_id
  ),
  per_player AS (
    SELECT r.player_id,
           (r.first_name || ' ' || COALESCE(r.last_initial, '')) AS name,
           COALESCE(spp.sessions_completed, 0) AS sessions_completed,
           CASE WHEN v_published_cards = 0 THEN 0
                ELSE ROUND(100.0 * COALESCE(spp.sessions_completed, 0) / v_published_cards)
           END AS completion_rate,
           COALESCE(shp.total_shots, 0) AS total_shots,
           COALESCE(str.longest_streak, 0) AS longest_streak,
           COALESCE(bpp.badges_earned, 0) AS badges_earned
    FROM roster r
    LEFT JOIN sessions_per_player spp ON spp.player_id = r.player_id
    LEFT JOIN shots_per_player shp ON shp.player_id = r.player_id
    LEFT JOIN streak_per_player str ON str.player_id = r.player_id
    LEFT JOIN badges_per_player bpp ON bpp.player_id = r.player_id
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'player_id', pp.player_id,
        'name', pp.name,
        'sessions_completed', pp.sessions_completed,
        'completion_rate', pp.completion_rate,
        'total_shots', pp.total_shots,
        'longest_streak', pp.longest_streak,
        'badges_earned', pp.badges_earned
      )
      ORDER BY pp.sessions_completed DESC
    ), '[]'::jsonb),
    COALESCE(SUM(pp.sessions_completed), 0),
    COALESCE(SUM(pp.total_shots), 0),
    COALESCE(ROUND(AVG(pp.completion_rate)), 0)
  INTO v_players, v_total_sessions, v_total_shots, v_avg_completion
  FROM per_player pp;

  RETURN jsonb_build_object(
    'success', true,
    'published_cards', v_published_cards,
    'players', v_players,
    'totals', jsonb_build_object(
      'total_sessions', v_total_sessions,
      'total_shots', v_total_shots,
      'avg_completion_rate', v_avg_completion
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_season_report(uuid, date, date) TO authenticated;
