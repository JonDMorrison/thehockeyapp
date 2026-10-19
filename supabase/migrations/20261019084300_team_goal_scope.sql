CREATE OR REPLACE FUNCTION public.calculate_goal_progress(p_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_goal record;
  v_total integer := 0;
  v_player record;
  v_player_value integer;
BEGIN
  SELECT * INTO v_goal FROM public.team_goals WHERE id = p_goal_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
  END IF;

  IF v_user_id IS NULL OR NOT public.is_team_adult(v_goal.team_id, v_user_id) THEN
    RAISE EXCEPTION 'Not authorized to refresh this team goal'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.team_goal_contributions WHERE goal_id = p_goal_id;

  FOR v_player IN
    SELECT tm.player_id
    FROM public.team_memberships tm
    WHERE tm.team_id = v_goal.team_id AND tm.status = 'active'
  LOOP
    v_player_value := 0;

    CASE v_goal.goal_type
      WHEN 'sessions' THEN
        SELECT COUNT(*) INTO v_player_value
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = v_player.player_id
          AND sc.status = 'complete'
          AND pc.team_id = v_goal.team_id
          AND pc.program_source = 'team'
          AND pc.published_at IS NOT NULL
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;

      WHEN 'shots' THEN
        SELECT COALESCE(SUM(tc.shots_logged), 0) INTO v_player_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        JOIN public.practice_cards pc ON pc.id = pt.practice_card_id
        WHERE tc.player_id = v_player.player_id
          AND pc.team_id = v_goal.team_id
          AND pc.program_source = 'team'
          AND pc.published_at IS NOT NULL
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;

      WHEN 'badges' THEN
        SELECT COUNT(*) INTO v_player_value
        FROM public.player_badges pb
        WHERE pb.player_id = v_player.player_id
          AND pb.awarded_at >= v_goal.start_date
          AND pb.awarded_at < v_goal.end_date + interval '1 day';

      ELSE
        v_player_value := 0;
    END CASE;

    IF v_player_value > 0 THEN
      INSERT INTO public.team_goal_contributions (goal_id, player_id, contribution_value)
      VALUES (p_goal_id, v_player.player_id, v_player_value);
    END IF;

    v_total := v_total + v_player_value;
  END LOOP;

  IF v_goal.goal_type = 'participation' THEN
    SELECT COUNT(DISTINCT sc.player_id) * 100 / GREATEST(
      (SELECT COUNT(*) FROM public.team_memberships WHERE team_id = v_goal.team_id AND status = 'active'),
      1
    ) INTO v_total
    FROM public.session_completions sc
    JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
    JOIN public.team_memberships tm ON tm.player_id=sc.player_id AND tm.team_id=v_goal.team_id AND tm.status='active'
    WHERE pc.team_id = v_goal.team_id
      AND pc.program_source='team' AND pc.published_at IS NOT NULL
      AND sc.status = 'complete'
      AND pc.date >= v_goal.start_date
      AND pc.date <= v_goal.end_date;
  END IF;

  UPDATE public.team_goals
  SET current_value = v_total,
      status = CASE
        WHEN status = 'archived' THEN 'archived'
        WHEN v_total >= target_value THEN 'completed'
        WHEN end_date < CURRENT_DATE AND v_total < target_value THEN 'failed'
        ELSE 'active'
      END,
      completed_at = CASE
        WHEN status = 'archived' THEN completed_at
        WHEN v_total >= target_value THEN coalesce(completed_at,now())
        ELSE NULL
      END,
      updated_at = now()
  WHERE id = p_goal_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_value', v_total,
    'completed', v_total >= v_goal.target_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_goal_progress(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calculate_goal_progress(uuid) TO authenticated;
ALTER TABLE public.team_goals ADD CONSTRAINT team_goal_valid_target CHECK(target_value BETWEEN 1 AND 10000000 AND (goal_type<>'participation' OR target_value<=100));
ALTER TABLE public.team_goals ADD CONSTRAINT team_goal_valid_window CHECK(end_date>=start_date);
