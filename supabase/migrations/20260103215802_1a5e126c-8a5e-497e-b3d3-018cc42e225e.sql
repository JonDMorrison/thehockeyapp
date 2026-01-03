-- Table for tracking AI generations
CREATE TABLE public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  generation_type text NOT NULL CHECK (generation_type IN ('day_card', 'week_plan', 'summary_player', 'summary_team')),
  input_json jsonb NOT NULL,
  output_json jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'accepted', 'rejected', 'failed')),
  error text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ai_generations
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- Team adults can manage ai_generations for their team
CREATE POLICY "Team adults can view AI generations"
  ON public.ai_generations
  FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create AI generations"
  ON public.ai_generations
  FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update AI generations"
  ON public.ai_generations
  FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

-- Table for player weekly summaries (parent-facing)
CREATE TABLE public.player_week_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, team_id, week_start)
);

-- Enable RLS on player_week_summaries
ALTER TABLE public.player_week_summaries ENABLE ROW LEVEL SECURITY;

-- Guardians can view their player's summaries
CREATE POLICY "Guardians can view player summaries"
  ON public.player_week_summaries
  FOR SELECT
  USING (is_player_guardian(player_id, auth.uid()));

-- Team adults can view summaries for their team
CREATE POLICY "Team adults can view player summaries"
  ON public.player_week_summaries
  FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

-- Team adults can create/update summaries
CREATE POLICY "Team adults can create player summaries"
  ON public.player_week_summaries
  FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update player summaries"
  ON public.player_week_summaries
  FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

-- Table for team weekly summaries (coach-facing)
CREATE TABLE public.team_week_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, week_start)
);

-- Enable RLS on team_week_summaries
ALTER TABLE public.team_week_summaries ENABLE ROW LEVEL SECURITY;

-- Team adults can manage team summaries
CREATE POLICY "Team adults can view team summaries"
  ON public.team_week_summaries
  FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create team summaries"
  ON public.team_week_summaries
  FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update team summaries"
  ON public.team_week_summaries
  FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));