
-- Performance indexes for the new RPC
CREATE INDEX IF NOT EXISTS idx_personal_session_completions_player_status
  ON public.personal_session_completions (player_id, status);

CREATE INDEX IF NOT EXISTS idx_session_completions_player_status
  ON public.session_completions (player_id, status);

CREATE INDEX IF NOT EXISTS idx_personal_task_completions_player
  ON public.personal_task_completions (player_id);

CREATE INDEX IF NOT EXISTS idx_task_completions_player_completed
  ON public.task_completions (player_id, completed);

CREATE INDEX IF NOT EXISTS idx_player_badges_player
  ON public.player_badges (player_id);

CREATE INDEX IF NOT EXISTS idx_personal_practice_cards_player_date
  ON public.personal_practice_cards (player_id, date);

-- ============================================================
-- get_player_development_snapshot(player_id)
--
-- Returns a single JSONB row with:
--   total_sessions       — completed solo + team sessions
--   total_shots          — sum of logged/expected shots across both modes
--   current_streak       — consecutive calendar days with ≥1 completed session
--   best_streak          — all-time best consecutive-day run
--   month_completion_pct — % of days with a completed session in last 30 days
--   program_progress_pct — % of program days that have a completed card (0 if no active program)
--
-- All calculations are server-side. Streak uses a single ordered
-- scan with no row-by-row loop — it leverages window functions.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_player_development_snapshot(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id        uuid;
  v_owner_id       uuid;
  v_total_sessions int;
  v_total_shots    bigint;
  v_current_streak int;
  v_best_streak    int;
  v_month_pct      numeric;
  v_program_pct    numeric;
BEGIN
  -- Auth check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  IF v_owner_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- ── 1. Total sessions (solo + team) ──
  SELECT
    (SELECT COUNT(*) FROM public.personal_session_completions psc
     JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
     WHERE ppc.player_id = p_player_id AND psc.status = 'complete')
    +
    (SELECT COUNT(*) FROM public.session_completions
     WHERE player_id = p_player_id AND status = 'complete')
  INTO v_total_sessions;

  -- ── 2. Total shots (solo expected + team logged) ──
  SELECT
    COALESCE((
      SELECT SUM(ppt.shots_expected)
      FROM public.personal_task_completions ptc
      JOIN public.personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
      JOIN public.personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id
      WHERE ppc.player_id = p_player_id AND ptc.completed = true
    ), 0)
    +
    COALESCE((
      SELECT SUM(tc.shots_logged)
      FROM public.task_completions tc
      WHERE tc.player_id = p_player_id AND tc.completed = true
    ), 0)
  INTO v_total_shots;

  -- ── 3. Streak (window-function approach, no row-by-row loop) ──
  --
  -- Strategy:
  --   a) UNION all completed session dates from both modes
  --   b) DISTINCT to one row per calendar day
  --   c) Use LAG to detect gaps → assign a new "group" when gap > 1 day
  --   d) Count days per group → best_streak = MAX, current_streak = group that includes today or yesterday
  --
  WITH completed_dates AS (
    -- Solo dates
    SELECT DISTINCT ppc.date::date AS d
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete'
    UNION
    -- Team dates
    SELECT DISTINCT (sc.completed_at AT TIME ZONE 'UTC')::date AS d
    FROM public.session_completions sc
    WHERE sc.player_id = p_player_id AND sc.status = 'complete' AND sc.completed_at IS NOT NULL
  ),
  ordered AS (
    SELECT DISTINCT d FROM completed_dates ORDER BY d
  ),
  grouped AS (
    SELECT
      d,
      d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
    FROM ordered
  ),
  streaks AS (
    SELECT
      grp,
      COUNT(*)::int AS streak_len,
      MAX(d)        AS streak_end
    FROM grouped
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(streak_len), 0),
    COALESCE(MAX(CASE WHEN streak_end >= CURRENT_DATE - 1 THEN streak_len END), 0)
  INTO v_best_streak, v_current_streak
  FROM streaks;

  -- ── 4. Month completion % ──
  -- How many of the last 30 calendar days had at least one completed session
  WITH month_dates AS (
    SELECT DISTINCT ppc.date::date AS d
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete'
      AND ppc.date >= CURRENT_DATE - 30
    UNION
    SELECT DISTINCT (sc.completed_at AT TIME ZONE 'UTC')::date AS d
    FROM public.session_completions sc
    WHERE sc.player_id = p_player_id AND sc.status = 'complete'
      AND sc.completed_at >= CURRENT_DATE - 30
  )
  SELECT ROUND(COUNT(DISTINCT d)::numeric / 30 * 100, 1)
  INTO v_month_pct
  FROM month_dates;

  -- ── 5. Active program progress % ──
  -- Based on personal_training_plans: cards completed / days_per_week * program duration
  SELECT
    CASE WHEN ptp.days_per_week IS NOT NULL AND ptp.days_per_week > 0 THEN
      ROUND(
        LEAST(
          (SELECT COUNT(*) FROM public.personal_session_completions psc2
           JOIN public.personal_practice_cards ppc2 ON ppc2.id = psc2.personal_practice_card_id
           WHERE ppc2.player_id = p_player_id
             AND psc2.status = 'complete'
             AND ppc2.date >= ptp.created_at::date
          )::numeric
          /
          GREATEST(ptp.days_per_week * 4, 1)  -- approximate 4-week program
          * 100
        , 100), 1)
    ELSE 0 END
  INTO v_program_pct
  FROM public.personal_training_plans ptp
  WHERE ptp.player_id = p_player_id AND ptp.is_active = true
  LIMIT 1;

  IF v_program_pct IS NULL THEN v_program_pct := 0; END IF;

  RETURN jsonb_build_object(
    'success',                      true,
    'total_sessions',               v_total_sessions,
    'total_shots',                  v_total_shots,
    'current_streak',               v_current_streak,
    'best_streak',                  v_best_streak,
    'month_completion_percentage',  v_month_pct,
    'active_program_progress_percentage', v_program_pct
  );
END;
$function$;
