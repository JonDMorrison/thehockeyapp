
-- ============================================================
-- COMPATIBILITY LAYER RPCs
-- Normalize solo/team shapes without modifying tables
-- ============================================================

-- get_today_plan: Returns a normalized "today plan" for a player
-- Works for both solo (personal_practice_cards) and team (practice_cards) modes
CREATE OR REPLACE FUNCTION public.get_today_plan(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_today date;
  v_player record;
  v_result jsonb;
  v_solo_card record;
  v_solo_tasks jsonb;
  v_solo_completed int;
  v_solo_total int;
  v_team_card record;
  v_team_tasks jsonb;
  v_team_completed int;
  v_team_total int;
  v_active_team_id uuid;
  v_game_day_enabled boolean;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT id, first_name, last_initial, profile_photo_url, owner_user_id INTO v_player
  FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_player.owner_user_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Solo plan
  SELECT ppc.id, ppc.title, ppc.tier, ppc.mode INTO v_solo_card
  FROM public.personal_practice_cards ppc
  WHERE ppc.player_id = p_player_id AND ppc.date = v_today LIMIT 1;

  IF v_solo_card.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_solo_total FROM public.personal_practice_tasks WHERE personal_practice_card_id = v_solo_card.id;
    SELECT COUNT(*) INTO v_solo_completed FROM public.personal_practice_tasks ppt
      JOIN public.personal_task_completions ptc ON ptc.personal_practice_task_id = ppt.id
      WHERE ppt.personal_practice_card_id = v_solo_card.id AND ptc.player_id = p_player_id AND ptc.completed = true;

    SELECT jsonb_agg(jsonb_build_object(
      'id', ppt.id, 'label', ppt.label, 'task_type', ppt.task_type, 'sort_order', ppt.sort_order,
      'is_required', ppt.is_required, 'shots_expected', ppt.shots_expected, 'target_value', ppt.target_value,
      'completed', EXISTS (SELECT 1 FROM public.personal_task_completions ptc WHERE ptc.personal_practice_task_id = ppt.id AND ptc.player_id = p_player_id AND ptc.completed = true)
    ) ORDER BY ppt.sort_order) INTO v_solo_tasks
    FROM public.personal_practice_tasks ppt WHERE ppt.personal_practice_card_id = v_solo_card.id;
  END IF;

  -- Team plan
  SELECT active_team_id INTO v_active_team_id FROM public.player_team_preferences WHERE player_id = p_player_id;
  IF v_active_team_id IS NOT NULL THEN
    SELECT COALESCE(enabled, false) INTO v_game_day_enabled FROM public.team_game_days WHERE team_id = v_active_team_id AND date = v_today;

    IF v_game_day_enabled THEN
      SELECT pc.id, pc.title, pc.tier, pc.mode INTO v_team_card
      FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'game_day' AND pc.published_at IS NOT NULL LIMIT 1;
    END IF;
    IF v_team_card IS NULL THEN
      SELECT pc.id, pc.title, pc.tier, pc.mode INTO v_team_card
      FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'normal' AND pc.published_at IS NOT NULL LIMIT 1;
    END IF;

    IF v_team_card.id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_team_total FROM public.practice_tasks WHERE practice_card_id = v_team_card.id;
      SELECT COUNT(*) INTO v_team_completed FROM public.practice_tasks pt
        JOIN public.task_completions tc ON tc.practice_task_id = pt.id
        WHERE pt.practice_card_id = v_team_card.id AND tc.player_id = p_player_id AND tc.completed = true;

      SELECT jsonb_agg(jsonb_build_object(
        'id', pt.id, 'label', pt.label, 'task_type', pt.task_type, 'sort_order', pt.sort_order,
        'is_required', pt.is_required, 'shots_expected', pt.shots_expected, 'target_value', pt.target_value,
        'completed', EXISTS (SELECT 1 FROM public.task_completions tc WHERE tc.practice_task_id = pt.id AND tc.player_id = p_player_id AND tc.completed = true)
      ) ORDER BY pt.sort_order) INTO v_team_tasks
      FROM public.practice_tasks pt WHERE pt.practice_card_id = v_team_card.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'date', v_today,
    'solo', CASE WHEN v_solo_card.id IS NOT NULL THEN jsonb_build_object(
      'card_id', v_solo_card.id, 'title', v_solo_card.title, 'tier', v_solo_card.tier, 'mode', v_solo_card.mode,
      'completed', COALESCE(v_solo_completed, 0), 'total', COALESCE(v_solo_total, 0),
      'tasks', COALESCE(v_solo_tasks, '[]'::jsonb)
    ) ELSE NULL END,
    'team', CASE WHEN v_team_card.id IS NOT NULL THEN jsonb_build_object(
      'card_id', v_team_card.id, 'title', v_team_card.title, 'tier', v_team_card.tier, 'mode', v_team_card.mode,
      'team_id', v_active_team_id,
      'completed', COALESCE(v_team_completed, 0), 'total', COALESCE(v_team_total, 0),
      'tasks', COALESCE(v_team_tasks, '[]'::jsonb)
    ) ELSE NULL END
  );
END;
$function$;

-- get_history_summary: Returns last N days of workout history across both modes
CREATE OR REPLACE FUNCTION public.get_history_summary(p_player_id uuid, p_days int DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_player record;
  v_solo_history jsonb;
  v_team_history jsonb;
  v_start_date date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT id, owner_user_id INTO v_player FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_player.owner_user_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_start_date := CURRENT_DATE - (p_days || ' days')::interval;

  -- Solo history
  SELECT jsonb_agg(jsonb_build_object(
    'date', ppc.date, 'card_id', ppc.id, 'title', ppc.title, 'tier', ppc.tier, 'mode', 'solo',
    'task_count', (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id),
    'completed_count', (SELECT COUNT(*) FROM public.personal_practice_tasks ppt JOIN public.personal_task_completions ptc ON ptc.personal_practice_task_id = ppt.id WHERE ppt.personal_practice_card_id = ppc.id AND ptc.player_id = p_player_id AND ptc.completed = true),
    'session_status', COALESCE((SELECT psc.status FROM public.personal_session_completions psc WHERE psc.personal_practice_card_id = ppc.id AND psc.player_id = p_player_id), 'none')
  ) ORDER BY ppc.date DESC) INTO v_solo_history
  FROM public.personal_practice_cards ppc WHERE ppc.player_id = p_player_id AND ppc.date >= v_start_date;

  -- Team history
  SELECT jsonb_agg(jsonb_build_object(
    'date', pc.date, 'card_id', pc.id, 'title', pc.title, 'tier', pc.tier, 'mode', pc.mode, 'team_id', pc.team_id,
    'task_count', (SELECT COUNT(*) FROM public.practice_tasks WHERE practice_card_id = pc.id),
    'completed_count', (SELECT COUNT(*) FROM public.practice_tasks pt JOIN public.task_completions tc ON tc.practice_task_id = pt.id WHERE pt.practice_card_id = pc.id AND tc.player_id = p_player_id AND tc.completed = true),
    'session_status', COALESCE((SELECT sc.status FROM public.session_completions sc WHERE sc.practice_card_id = pc.id AND sc.player_id = p_player_id), 'none')
  ) ORDER BY pc.date DESC) INTO v_team_history
  FROM public.practice_cards pc
  JOIN public.team_memberships tm ON tm.team_id = pc.team_id AND tm.player_id = p_player_id AND tm.status = 'active'
  WHERE pc.date >= v_start_date AND pc.published_at IS NOT NULL;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'days', p_days,
    'solo', COALESCE(v_solo_history, '[]'::jsonb),
    'team', COALESCE(v_team_history, '[]'::jsonb)
  );
END;
$function$;

-- get_development_snapshot: Aggregate stats across both modes
CREATE OR REPLACE FUNCTION public.get_development_snapshot(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_player record;
  v_solo_workouts int;
  v_solo_shots int;
  v_solo_streak jsonb;
  v_team_workouts int;
  v_team_shots int;
  v_badges_earned int;
  v_badges_total int;
  v_plan record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT id, first_name, last_initial, profile_photo_url, owner_user_id INTO v_player
  FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_player.owner_user_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Solo stats
  SELECT COUNT(*) INTO v_solo_workouts FROM public.personal_session_completions psc
  JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
  WHERE ppc.player_id = p_player_id AND psc.status = 'complete';

  SELECT COALESCE(SUM(ppt.shots_expected), 0) INTO v_solo_shots
  FROM public.personal_task_completions ptc
  JOIN public.personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
  JOIN public.personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id
  WHERE ppc.player_id = p_player_id AND ptc.completed = true;

  v_solo_streak := public.calculate_solo_streak(p_player_id);

  -- Team stats
  SELECT COUNT(*) INTO v_team_workouts FROM public.session_completions sc
  WHERE sc.player_id = p_player_id AND sc.status = 'complete';

  SELECT COALESCE(SUM(tc.shots_logged), 0) INTO v_team_shots
  FROM public.task_completions tc WHERE tc.player_id = p_player_id AND tc.completed = true;

  -- Badges
  SELECT COUNT(*) INTO v_badges_earned FROM public.player_badges WHERE player_id = p_player_id;
  SELECT COUNT(*) INTO v_badges_total FROM public.challenges WHERE is_active = true;

  -- Training plan
  SELECT id, name, tier, days_per_week, training_focus INTO v_plan
  FROM public.personal_training_plans WHERE player_id = p_player_id AND is_active = true LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'player', jsonb_build_object('id', v_player.id, 'first_name', v_player.first_name, 'last_initial', v_player.last_initial, 'photo_url', v_player.profile_photo_url),
    'plan', CASE WHEN v_plan.id IS NOT NULL THEN jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'tier', v_plan.tier, 'days_per_week', v_plan.days_per_week, 'focus', v_plan.training_focus) ELSE NULL END,
    'solo', jsonb_build_object('total_workouts', v_solo_workouts, 'total_shots', v_solo_shots, 'streak', v_solo_streak),
    'team', jsonb_build_object('total_workouts', v_team_workouts, 'total_shots', v_team_shots),
    'combined', jsonb_build_object('total_workouts', v_solo_workouts + v_team_workouts, 'total_shots', v_solo_shots + v_team_shots),
    'badges', jsonb_build_object('earned', v_badges_earned, 'total', v_badges_total)
  );
END;
$function$;
