-- Create team_goals table
CREATE TABLE public.team_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('sessions', 'shots', 'participation', 'badges')),
  target_value INTEGER NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('week', 'month', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  show_leaderboard BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'archived')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_goal_contributions table
CREATE TABLE public.team_goal_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.team_goals(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  contribution_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(goal_id, player_id)
);

-- Enable RLS
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_goal_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_goals
CREATE POLICY "Team adults can manage goals"
  ON public.team_goals
  FOR ALL
  USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians of team players can view goals"
  ON public.team_goals
  FOR SELECT
  USING (public.is_guardian_of_team_player(team_id, auth.uid()));

-- RLS Policies for team_goal_contributions
CREATE POLICY "Team adults can view contributions"
  ON public.team_goal_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_goals tg
      WHERE tg.id = goal_id AND public.is_team_adult(tg.team_id, auth.uid())
    )
  );

CREATE POLICY "Guardians can view contributions when leaderboard enabled"
  ON public.team_goal_contributions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_goals tg
      WHERE tg.id = goal_id 
      AND tg.show_leaderboard = true
      AND public.is_guardian_of_team_player(tg.team_id, auth.uid())
    )
  );

-- Create indexes
CREATE INDEX idx_team_goals_team_id ON public.team_goals(team_id);
CREATE INDEX idx_team_goals_status ON public.team_goals(status);
CREATE INDEX idx_team_goal_contributions_goal_id ON public.team_goal_contributions(goal_id);
CREATE INDEX idx_team_goal_contributions_player_id ON public.team_goal_contributions(player_id);

-- Trigger for updated_at
CREATE TRIGGER update_team_goals_updated_at
  BEFORE UPDATE ON public.team_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_updated_at();

-- Function to calculate goal progress
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(p_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal record;
  v_total integer := 0;
  v_player record;
  v_player_value integer;
BEGIN
  -- Get goal details
  SELECT * INTO v_goal FROM public.team_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
  END IF;

  -- Clear existing contributions
  DELETE FROM public.team_goal_contributions WHERE goal_id = p_goal_id;

  -- Calculate based on goal type
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
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;
          
      WHEN 'shots' THEN
        SELECT COALESCE(SUM(tc.shots_logged), 0) INTO v_player_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        JOIN public.practice_cards pc ON pc.id = pt.practice_card_id
        WHERE tc.player_id = v_player.player_id
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;
          
      WHEN 'badges' THEN
        SELECT COUNT(*) INTO v_player_value
        FROM public.player_badges pb
        WHERE pb.player_id = v_player.player_id
          AND pb.awarded_at >= v_goal.start_date
          AND pb.awarded_at <= v_goal.end_date + interval '1 day';
          
      ELSE
        v_player_value := 0;
    END CASE;
    
    IF v_player_value > 0 THEN
      INSERT INTO public.team_goal_contributions (goal_id, player_id, contribution_value)
      VALUES (p_goal_id, v_player.player_id, v_player_value);
    END IF;
    
    v_total := v_total + v_player_value;
  END LOOP;

  -- Handle participation type (percentage)
  IF v_goal.goal_type = 'participation' THEN
    SELECT COUNT(DISTINCT sc.player_id) * 100 / GREATEST(
      (SELECT COUNT(*) FROM public.team_memberships WHERE team_id = v_goal.team_id AND status = 'active'), 1
    ) INTO v_total
    FROM public.session_completions sc
    JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
    WHERE pc.team_id = v_goal.team_id
      AND sc.status = 'complete'
      AND pc.date >= v_goal.start_date
      AND pc.date <= v_goal.end_date;
  END IF;

  -- Update goal progress
  UPDATE public.team_goals 
  SET current_value = v_total,
      status = CASE 
        WHEN v_total >= target_value THEN 'completed'
        WHEN end_date < CURRENT_DATE AND v_total < target_value THEN 'failed'
        ELSE status
      END,
      completed_at = CASE 
        WHEN v_total >= target_value AND completed_at IS NULL THEN now()
        ELSE completed_at
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