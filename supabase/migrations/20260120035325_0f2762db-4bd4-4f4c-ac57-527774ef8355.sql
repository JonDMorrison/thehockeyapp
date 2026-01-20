-- Fix badge evaluation to allow team players to earn global badges when team challenges are enabled
-- The issue: all challenges have scope='global', but the function was only allowing global badges for national_challenges_opt_in users
-- Solution: When team has challenges_enabled=true, allow earning global scope badges too

CREATE OR REPLACE FUNCTION public.evaluate_player_challenges(p_player_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_current_value int;
  v_badges_awarded int := 0;
  v_is_opted_in boolean;
  v_team_challenges_enabled boolean;
BEGIN
  -- Check if player is opted in to national challenges
  SELECT COALESCE(national_challenges_opt_in, false) INTO v_is_opted_in
  FROM public.player_privacy_settings
  WHERE player_id = p_player_id;

  -- Check if player's active team has challenges enabled
  SELECT COALESCE(ts.challenges_enabled, false) INTO v_team_challenges_enabled
  FROM public.player_team_preferences ptp
  LEFT JOIN public.team_settings ts ON ts.team_id = ptp.active_team_id
  WHERE ptp.player_id = p_player_id;

  -- If neither global opt-in nor team challenges enabled, exit
  IF NOT COALESCE(v_is_opted_in, false) AND NOT COALESCE(v_team_challenges_enabled, false) THEN
    RETURN jsonb_build_object('success', true, 'badges_awarded', 0, 'reason', 'not_opted_in');
  END IF;

  -- Loop through active challenges
  -- FIX: When team has challenges enabled, also allow global scope badges (not just team scope)
  FOR v_challenge IN 
    SELECT * FROM public.challenges 
    WHERE is_active = true
    AND (
      (scope = 'global' AND (COALESCE(v_is_opted_in, false) OR COALESCE(v_team_challenges_enabled, false)))
      OR
      (scope = 'team' AND COALESCE(v_team_challenges_enabled, false))
    )
  LOOP
    -- Skip if already has badge for this challenge
    IF EXISTS (
      SELECT 1 FROM public.player_badges
      WHERE player_id = p_player_id AND challenge_id = v_challenge.id
    ) THEN
      CONTINUE;
    END IF;

    -- Calculate current value based on metric type
    CASE v_challenge.metric_type
      WHEN 'total_shots' THEN
        SELECT COALESCE(SUM(shots_logged), 0) INTO v_current_value
        FROM public.task_completions
        WHERE player_id = p_player_id;

      WHEN 'sessions_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions
        WHERE player_id = p_player_id AND status = 'complete';

      WHEN 'game_day_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = p_player_id 
        AND sc.status = 'complete'
        AND pc.mode = 'game_day';

      WHEN 'prep_tasks_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        WHERE tc.player_id = p_player_id 
        AND tc.completed = true
        AND pt.task_type = 'prep';

      ELSE
        v_current_value := 0;
    END CASE;

    -- Upsert progress
    INSERT INTO public.player_challenge_progress (player_id, challenge_id, current_value, updated_at)
    VALUES (p_player_id, v_challenge.id, v_current_value, now())
    ON CONFLICT (player_id, challenge_id) DO UPDATE SET
      current_value = GREATEST(player_challenge_progress.current_value, v_current_value),
      updated_at = now();

    -- Check if challenge is now complete
    IF v_current_value >= v_challenge.target_value THEN
      -- Mark as completed
      UPDATE public.player_challenge_progress
      SET completed = true, completed_at = now()
      WHERE player_id = p_player_id AND challenge_id = v_challenge.id AND completed = false;

      -- Award badge if not already awarded
      INSERT INTO public.player_badges (player_id, challenge_id)
      VALUES (p_player_id, v_challenge.id)
      ON CONFLICT (player_id, challenge_id) DO NOTHING;

      IF FOUND THEN
        v_badges_awarded := v_badges_awarded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'badges_awarded', v_badges_awarded);
END;
$function$;