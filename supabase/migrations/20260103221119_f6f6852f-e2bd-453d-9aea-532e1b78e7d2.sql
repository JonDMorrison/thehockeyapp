-- Create challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text CHECK (scope IN ('global', 'team')) DEFAULT 'global',
  name text NOT NULL,
  description text NOT NULL,
  metric_type text CHECK (
    metric_type IN (
      'total_shots',
      'sessions_completed',
      'game_day_completed',
      'prep_tasks_completed'
    )
  ) NOT NULL,
  target_value int NOT NULL,
  badge_icon text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create player_challenge_progress table
CREATE TABLE public.player_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  current_value int DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, challenge_id)
);

-- Create player_badges table
CREATE TABLE public.player_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(player_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

-- challenges RLS policies (read-only for authenticated users)
CREATE POLICY "Authenticated users can view challenges"
ON public.challenges FOR SELECT
TO authenticated
USING (is_active = true);

-- player_challenge_progress RLS policies
CREATE POLICY "Guardians can view player progress"
ON public.player_challenge_progress FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can view team player progress"
ON public.player_challenge_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.player_id = player_challenge_progress.player_id
    AND tm.status = 'active'
    AND public.is_team_adult(tm.team_id, auth.uid())
  )
);

-- player_badges RLS policies
CREATE POLICY "Guardians can view player badges"
ON public.player_badges FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can view team player badges"
ON public.player_badges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.player_id = player_badges.player_id
    AND tm.status = 'active'
    AND public.is_team_adult(tm.team_id, auth.uid())
  )
);

-- Create the badge evaluation function
CREATE OR REPLACE FUNCTION public.evaluate_player_challenges(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FOR v_challenge IN 
    SELECT * FROM public.challenges 
    WHERE is_active = true
    AND (
      (scope = 'global' AND COALESCE(v_is_opted_in, false))
      OR
      (scope = 'team' AND COALESCE(v_team_challenges_enabled, false))
    )
  LOOP
    -- Skip if already completed
    IF EXISTS (
      SELECT 1 FROM public.player_challenge_progress
      WHERE player_id = p_player_id AND challenge_id = v_challenge.id AND completed = true
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
$$;

-- Seed initial challenges
INSERT INTO public.challenges (scope, name, description, metric_type, target_value, badge_icon) VALUES
  ('global', 'First 100 Shots', 'Log your first 100 shots in practice', 'total_shots', 100, 'target'),
  ('global', '500 Shot Club', 'Reach 500 total shots logged', 'total_shots', 500, 'flame'),
  ('global', '1,000 Shot Club', 'Join the elite 1,000 shot club', 'total_shots', 1000, 'trophy'),
  ('global', '5,000 Shots', 'Master level - 5,000 shots logged', 'total_shots', 5000, 'medal'),
  ('global', 'First Practice', 'Complete your first practice session', 'sessions_completed', 1, 'check-circle'),
  ('global', 'Week Warrior', 'Complete 7 practice sessions', 'sessions_completed', 7, 'calendar'),
  ('global', 'Consistent', 'Complete 14 practice sessions', 'sessions_completed', 14, 'star'),
  ('global', 'Dedicated', 'Complete 30 practice sessions', 'sessions_completed', 30, 'award'),
  ('global', 'Game Ready', 'Complete your first game day prep', 'game_day_completed', 1, 'zap'),
  ('global', '5 Games Ready', 'Complete 5 game day preparations', 'game_day_completed', 5, 'shield'),
  ('global', 'Prepared Athlete', 'Complete 10 game day preparations', 'game_day_completed', 10, 'crown'),
  ('global', 'Mindset Master', 'Complete 25 prep tasks', 'prep_tasks_completed', 25, 'brain');