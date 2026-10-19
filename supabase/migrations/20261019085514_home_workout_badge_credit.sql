CREATE OR REPLACE FUNCTION public.evaluate_player_challenges(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_challenge record;
  v_current_value integer;
  v_badges_awarded integer := 0;
  v_is_opted_in boolean;
  v_team_challenges_enabled boolean;
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.is_player_owner(p_player_id, v_user_id)
    OR public.is_player_guardian(p_player_id, v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to evaluate this player'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(national_challenges_opt_in, false) INTO v_is_opted_in
  FROM public.player_privacy_settings
  WHERE player_id = p_player_id;

  SELECT COALESCE(ts.challenges_enabled, false) INTO v_team_challenges_enabled
  FROM public.player_team_preferences ptp
  LEFT JOIN public.team_settings ts ON ts.team_id = ptp.active_team_id
  WHERE ptp.player_id = p_player_id;

  IF NOT COALESCE(v_is_opted_in, false)
     AND NOT COALESCE(v_team_challenges_enabled, false) THEN
    RETURN jsonb_build_object(
      'success', true,
      'badges_awarded', 0,
      'reason', 'not_opted_in'
    );
  END IF;

  FOR v_challenge IN
    SELECT *
    FROM public.challenges
    WHERE is_active = true
      AND (
        (scope = 'global' AND (
          COALESCE(v_is_opted_in, false)
          OR COALESCE(v_team_challenges_enabled, false)
        ))
        OR (scope = 'team' AND COALESCE(v_team_challenges_enabled, false))
      )
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.player_badges
      WHERE player_id = p_player_id
        AND challenge_id = v_challenge.id
    ) THEN
      CONTINUE;
    END IF;

    CASE v_challenge.metric_type
      WHEN 'total_shots' THEN
        SELECT COALESCE(SUM(shots_logged), 0) INTO v_current_value
        FROM public.task_completions
        WHERE player_id = p_player_id;

      WHEN 'sessions_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions
        WHERE player_id = p_player_id AND status = 'complete';
        v_current_value := v_current_value + (SELECT COUNT(*) FROM public.personal_session_completions WHERE player_id=p_player_id AND status='complete');

      WHEN 'game_day_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = p_player_id
          AND sc.status = 'complete'
          AND pc.mode = 'game_day';
        v_current_value := v_current_value + (SELECT COUNT(*) FROM public.personal_session_completions sc JOIN public.personal_practice_cards pc ON pc.id=sc.personal_practice_card_id WHERE sc.player_id=p_player_id AND sc.status='complete' AND pc.mode='game_day');

      WHEN 'prep_tasks_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        WHERE tc.player_id = p_player_id
          AND tc.completed = true
          AND pt.task_type = 'prep';
        v_current_value := v_current_value + (SELECT COUNT(*) FROM public.personal_task_completions tc JOIN public.personal_practice_tasks pt ON pt.id=tc.personal_practice_task_id WHERE tc.player_id=p_player_id AND tc.completed=true AND pt.task_type='prep');

      ELSE
        v_current_value := 0;
    END CASE;

    INSERT INTO public.player_challenge_progress (
      player_id,
      challenge_id,
      current_value,
      updated_at
    )
    VALUES (p_player_id, v_challenge.id, v_current_value, now())
    ON CONFLICT (player_id, challenge_id) DO UPDATE
    SET current_value = GREATEST(player_challenge_progress.current_value, v_current_value),
        updated_at = now();

    IF v_current_value >= v_challenge.target_value THEN
      UPDATE public.player_challenge_progress
      SET completed = true, completed_at = now()
      WHERE player_id = p_player_id
        AND challenge_id = v_challenge.id
        AND completed = false;

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
$$;

REVOKE ALL ON FUNCTION public.evaluate_player_challenges(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.evaluate_player_challenges(uuid) TO authenticated;
