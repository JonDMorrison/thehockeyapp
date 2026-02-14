
-- ============================================================
-- Subscriptions & Entitlements tables
-- ============================================================

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- No direct INSERT/UPDATE/DELETE from clients — managed by server/Stripe webhooks

CREATE TABLE public.entitlements (
  user_id uuid PRIMARY KEY,
  can_view_full_history boolean NOT NULL DEFAULT false,
  can_access_programs boolean NOT NULL DEFAULT false,
  can_view_snapshot boolean NOT NULL DEFAULT false,
  can_receive_ai_summary boolean NOT NULL DEFAULT false,
  can_export_reports boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entitlements"
  ON public.entitlements FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- Auto-provision: when a user signs up, create free sub + entitlements
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.entitlements (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach to auth.users (fires on signup)
CREATE TRIGGER on_auth_user_created_entitlements
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_entitlements();

-- ============================================================
-- Sync entitlements when subscription changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_entitlements_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_pro boolean;
BEGIN
  v_is_pro := (NEW.plan = 'pro' AND NEW.status = 'active'
               AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()));

  INSERT INTO public.entitlements (user_id, can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports, updated_at)
  VALUES (NEW.user_id, v_is_pro, v_is_pro, v_is_pro, v_is_pro, v_is_pro, now())
  ON CONFLICT (user_id) DO UPDATE SET
    can_view_full_history = v_is_pro,
    can_access_programs = v_is_pro,
    can_view_snapshot = v_is_pro,
    can_receive_ai_summary = v_is_pro,
    can_export_reports = v_is_pro,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_change_sync_entitlements
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_entitlements_from_subscription();

-- ============================================================
-- Server-side helper: has_entitlement(user_id, key)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_entitlement(p_user_id uuid, p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result boolean;
BEGIN
  EXECUTE format(
    'SELECT %I FROM public.entitlements WHERE user_id = $1',
    p_key
  ) INTO v_result USING p_user_id;
  RETURN COALESCE(v_result, false);
END;
$$;

-- ============================================================
-- Gate the development snapshot RPC
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
  v_can_view       boolean;
BEGIN
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

  -- Entitlement gate
  v_can_view := public.has_entitlement(v_user_id, 'can_view_snapshot');
  IF NOT v_can_view THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'upgrade_required',
      'message', 'Development Snapshot requires a Pro subscription'
    );
  END IF;

  -- 1. Total sessions
  SELECT
    (SELECT COUNT(*) FROM public.personal_session_completions psc
     JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
     WHERE ppc.player_id = p_player_id AND psc.status = 'complete')
    +
    (SELECT COUNT(*) FROM public.session_completions
     WHERE player_id = p_player_id AND status = 'complete')
  INTO v_total_sessions;

  -- 2. Total shots
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

  -- 3. Streak (window functions)
  WITH completed_dates AS (
    SELECT DISTINCT ppc.date::date AS d
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete'
    UNION
    SELECT DISTINCT (sc.completed_at AT TIME ZONE 'UTC')::date AS d
    FROM public.session_completions sc
    WHERE sc.player_id = p_player_id AND sc.status = 'complete' AND sc.completed_at IS NOT NULL
  ),
  ordered AS (
    SELECT DISTINCT d FROM completed_dates ORDER BY d
  ),
  grouped AS (
    SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
    FROM ordered
  ),
  streaks AS (
    SELECT grp, COUNT(*)::int AS streak_len, MAX(d) AS streak_end
    FROM grouped GROUP BY grp
  )
  SELECT
    COALESCE(MAX(streak_len), 0),
    COALESCE(MAX(CASE WHEN streak_end >= CURRENT_DATE - 1 THEN streak_len END), 0)
  INTO v_best_streak, v_current_streak
  FROM streaks;

  -- 4. Month completion %
  WITH month_dates AS (
    SELECT DISTINCT ppc.date::date AS d
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete' AND ppc.date >= CURRENT_DATE - 30
    UNION
    SELECT DISTINCT (sc.completed_at AT TIME ZONE 'UTC')::date AS d
    FROM public.session_completions sc
    WHERE sc.player_id = p_player_id AND sc.status = 'complete' AND sc.completed_at >= CURRENT_DATE - 30
  )
  SELECT ROUND(COUNT(DISTINCT d)::numeric / 30 * 100, 1)
  INTO v_month_pct FROM month_dates;

  -- 5. Program progress %
  SELECT
    CASE WHEN ptp.days_per_week IS NOT NULL AND ptp.days_per_week > 0 THEN
      ROUND(LEAST(
        (SELECT COUNT(*) FROM public.personal_session_completions psc2
         JOIN public.personal_practice_cards ppc2 ON ppc2.id = psc2.personal_practice_card_id
         WHERE ppc2.player_id = p_player_id AND psc2.status = 'complete' AND ppc2.date >= ptp.created_at::date
        )::numeric / GREATEST(ptp.days_per_week * 4, 1) * 100
      , 100), 1)
    ELSE 0 END
  INTO v_program_pct
  FROM public.personal_training_plans ptp
  WHERE ptp.player_id = p_player_id AND ptp.is_active = true LIMIT 1;

  IF v_program_pct IS NULL THEN v_program_pct := 0; END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_sessions', v_total_sessions,
    'total_shots', v_total_shots,
    'current_streak', v_current_streak,
    'best_streak', v_best_streak,
    'month_completion_percentage', v_month_pct,
    'active_program_progress_percentage', v_program_pct
  );
END;
$function$;

-- ============================================================
-- Gate history RPC: free = 7 days, pro = unlimited
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_history_summary(p_player_id uuid, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id    uuid;
  v_owner_id   uuid;
  v_can_full   boolean;
  v_limit_days int;
  v_history    jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_owner_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_can_full := public.has_entitlement(v_user_id, 'can_view_full_history');
  v_limit_days := CASE WHEN v_can_full THEN p_days ELSE LEAST(p_days, 7) END;

  WITH history AS (
    SELECT ppc.date::date AS workout_date, ppc.title, ppc.tier, 'solo' AS mode,
      (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id) AS task_count
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete'
      AND ppc.date >= CURRENT_DATE - v_limit_days
    UNION ALL
    SELECT (sc.completed_at AT TIME ZONE 'UTC')::date, pc.title, pc.tier, 'team',
      (SELECT COUNT(*) FROM public.practice_tasks WHERE practice_card_id = pc.id)
    FROM public.session_completions sc
    JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
    WHERE sc.player_id = p_player_id AND sc.status = 'complete'
      AND sc.completed_at >= CURRENT_DATE - v_limit_days
    ORDER BY workout_date DESC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(history)), '[]'::jsonb) INTO v_history FROM history;

  RETURN jsonb_build_object(
    'success', true,
    'days_limit', v_limit_days,
    'is_limited', NOT v_can_full,
    'history', v_history
  );
END;
$function$;

-- Index for entitlements lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON public.entitlements (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

-- Backfill entitlements for existing users
INSERT INTO public.subscriptions (user_id, plan, status)
SELECT id, 'free', 'active' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.entitlements (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
