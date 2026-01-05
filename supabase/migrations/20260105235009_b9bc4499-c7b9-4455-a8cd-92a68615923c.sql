-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create training_programs table for multi-week AI-generated programs
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tier TEXT CHECK (tier IN ('rec', 'rep', 'elite')) DEFAULT 'rep',
  days_per_week INT DEFAULT 5,
  focus_areas TEXT[] DEFAULT '{}',
  time_budget_minutes INT DEFAULT 25,
  status TEXT CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link week plans to programs
ALTER TABLE public.team_week_plans
ADD COLUMN program_id UUID REFERENCES public.training_programs(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for training_programs
CREATE POLICY "Team adults can view their training programs"
  ON public.training_programs FOR SELECT
  USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create training programs"
  ON public.training_programs FOR INSERT
  WITH CHECK (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update their training programs"
  ON public.training_programs FOR UPDATE
  USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can delete their training programs"
  ON public.training_programs FOR DELETE
  USING (public.is_team_adult(team_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_training_programs_updated_at
BEFORE UPDATE ON public.training_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();