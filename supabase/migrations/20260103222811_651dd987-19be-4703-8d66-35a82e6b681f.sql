-- Create team_training_preferences table
CREATE TABLE public.team_training_preferences (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  training_mode text CHECK (training_mode IN ('shooting_only', 'balanced', 'performance')) DEFAULT 'balanced',
  allowed_task_types text[] DEFAULT ARRAY['shooting', 'mobility', 'prep']::text[],
  default_tier text CHECK (default_tier IN ('rec', 'rep', 'elite')) DEFAULT 'rep',
  use_ai_assist boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team_onboarding_state table
CREATE TABLE public.team_onboarding_state (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  last_step_completed text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_training_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_training_preferences
CREATE POLICY "Team adults can view training preferences"
  ON public.team_training_preferences FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can insert training preferences"
  ON public.team_training_preferences FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update training preferences"
  ON public.team_training_preferences FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

-- RLS policies for team_onboarding_state
CREATE POLICY "Team adults can view onboarding state"
  ON public.team_onboarding_state FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can insert onboarding state"
  ON public.team_onboarding_state FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update onboarding state"
  ON public.team_onboarding_state FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));