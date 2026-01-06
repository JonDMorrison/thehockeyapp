-- Create personal_session_completions table to track overall workout completion
CREATE TABLE public.personal_session_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  personal_practice_card_id UUID NOT NULL REFERENCES public.personal_practice_cards(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'partial', 'complete')),
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, personal_practice_card_id)
);

-- Enable RLS
ALTER TABLE public.personal_session_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies - players can only access their own completions
CREATE POLICY "Users can view their own session completions"
ON public.personal_session_completions
FOR SELECT
USING (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
  OR
  public.is_player_guardian(player_id, auth.uid())
);

CREATE POLICY "Users can insert their own session completions"
ON public.personal_session_completions
FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
  OR
  public.is_player_guardian(player_id, auth.uid())
);

CREATE POLICY "Users can update their own session completions"
ON public.personal_session_completions
FOR UPDATE
USING (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
  OR
  public.is_player_guardian(player_id, auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_personal_session_completions_updated_at
BEFORE UPDATE ON public.personal_session_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate solo player streak
CREATE OR REPLACE FUNCTION public.calculate_solo_streak(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_streak int := 0;
  v_best_streak int := 0;
  v_temp_streak int := 0;
  v_prev_date date := NULL;
  v_rec record;
BEGIN
  -- Calculate streaks from completed workout dates
  FOR v_rec IN
    SELECT DISTINCT ppc.date::date as workout_date
    FROM public.personal_session_completions psc
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE psc.player_id = p_player_id
      AND psc.status = 'complete'
    ORDER BY ppc.date DESC
  LOOP
    IF v_prev_date IS NULL THEN
      -- First date - check if it's today or yesterday for current streak
      IF v_rec.workout_date >= CURRENT_DATE - interval '1 day' THEN
        v_temp_streak := 1;
        v_current_streak := 1;
      ELSE
        v_temp_streak := 1;
      END IF;
    ELSIF v_prev_date - v_rec.workout_date = 1 THEN
      -- Consecutive day
      v_temp_streak := v_temp_streak + 1;
      IF v_current_streak > 0 THEN
        v_current_streak := v_temp_streak;
      END IF;
    ELSE
      -- Streak broken
      IF v_temp_streak > v_best_streak THEN
        v_best_streak := v_temp_streak;
      END IF;
      v_temp_streak := 1;
      IF v_current_streak > 0 THEN
        v_current_streak := 0; -- Current streak ends
      END IF;
    END IF;
    
    v_prev_date := v_rec.workout_date;
  END LOOP;
  
  -- Final check for best streak
  IF v_temp_streak > v_best_streak THEN
    v_best_streak := v_temp_streak;
  END IF;
  
  RETURN jsonb_build_object(
    'current_streak', v_current_streak,
    'best_streak', GREATEST(v_best_streak, v_current_streak)
  );
END;
$$;

-- Function to get solo dashboard data
CREATE OR REPLACE FUNCTION public.get_solo_dashboard(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_player record;
  v_plan record;
  v_today date;
  v_today_card record;
  v_today_status text;
  v_streak jsonb;
  v_recent_workouts jsonb;
  v_week_activity jsonb;
  v_total_workouts int;
  v_total_shots int;
  v_badges_earned int;
  v_badges_total int;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get player info
  SELECT id, first_name, last_initial, profile_photo_url, owner_user_id
  INTO v_player
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Check authorization
  IF v_player.owner_user_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get training plan
  SELECT id, name, tier, training_focus, days_per_week
  INTO v_plan
  FROM public.personal_training_plans
  WHERE player_id = p_player_id AND is_active = true
  LIMIT 1;

  -- Get today's card if exists
  SELECT ppc.id, ppc.title, ppc.tier, ppc.mode,
    (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id) as task_count,
    (SELECT COUNT(*) FROM public.personal_practice_tasks ppt
     JOIN public.personal_task_completions ptc ON ptc.personal_practice_task_id = ppt.id
     WHERE ppt.personal_practice_card_id = ppc.id AND ptc.player_id = p_player_id AND ptc.completed = true) as completed_count
  INTO v_today_card
  FROM public.personal_practice_cards ppc
  WHERE ppc.player_id = p_player_id AND ppc.date = v_today
  LIMIT 1;

  -- Determine today's status
  IF v_today_card.id IS NULL THEN
    v_today_status := 'no_workout';
  ELSIF v_today_card.completed_count >= v_today_card.task_count THEN
    v_today_status := 'complete';
  ELSIF v_today_card.completed_count > 0 THEN
    v_today_status := 'in_progress';
  ELSE
    v_today_status := 'not_started';
  END IF;

  -- Get streak
  v_streak := public.calculate_solo_streak(p_player_id);

  -- Get recent completed workouts (last 5)
  SELECT jsonb_agg(w ORDER BY w.date DESC)
  INTO v_recent_workouts
  FROM (
    SELECT ppc.id, ppc.title, ppc.date, ppc.tier,
      (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id) as task_count
    FROM public.personal_practice_cards ppc
    JOIN public.personal_session_completions psc ON psc.personal_practice_card_id = ppc.id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete'
    ORDER BY ppc.date DESC
    LIMIT 5
  ) w;

  -- Get this week's activity (Mon-Sun)
  SELECT jsonb_agg(jsonb_build_object(
    'date', d.date,
    'completed', EXISTS (
      SELECT 1 FROM public.personal_session_completions psc
      JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
      WHERE ppc.player_id = p_player_id AND ppc.date = d.date AND psc.status = 'complete'
    )
  ) ORDER BY d.date)
  INTO v_week_activity
  FROM (
    SELECT generate_series(
      date_trunc('week', v_today)::date,
      date_trunc('week', v_today)::date + 6,
      '1 day'::interval
    )::date as date
  ) d;

  -- Get total stats
  SELECT COUNT(*) INTO v_total_workouts
  FROM public.personal_session_completions
  WHERE player_id = p_player_id AND status = 'complete';

  SELECT COALESCE(SUM(ppt.shots_expected), 0) INTO v_total_shots
  FROM public.personal_task_completions ptc
  JOIN public.personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id
  WHERE ptc.player_id = p_player_id AND ptc.completed = true;

  -- Get badge counts
  SELECT COUNT(*) INTO v_badges_earned
  FROM public.player_badges
  WHERE player_id = p_player_id;

  SELECT COUNT(*) INTO v_badges_total
  FROM public.challenges
  WHERE is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'player', jsonb_build_object(
      'id', v_player.id,
      'first_name', v_player.first_name,
      'last_initial', v_player.last_initial,
      'photo_url', v_player.profile_photo_url
    ),
    'plan', CASE WHEN v_plan.id IS NOT NULL THEN jsonb_build_object(
      'id', v_plan.id,
      'name', v_plan.name,
      'tier', v_plan.tier,
      'focus', v_plan.training_focus,
      'days_per_week', v_plan.days_per_week
    ) ELSE null END,
    'today', jsonb_build_object(
      'date', v_today,
      'status', v_today_status,
      'card_id', v_today_card.id,
      'title', v_today_card.title,
      'task_count', COALESCE(v_today_card.task_count, 0),
      'completed_count', COALESCE(v_today_card.completed_count, 0)
    ),
    'streak', v_streak,
    'recent_workouts', COALESCE(v_recent_workouts, '[]'::jsonb),
    'week_activity', COALESCE(v_week_activity, '[]'::jsonb),
    'stats', jsonb_build_object(
      'total_workouts', v_total_workouts,
      'total_shots', v_total_shots,
      'badges_earned', v_badges_earned,
      'badges_total', v_badges_total
    )
  );
END;
$$;