-- Create team_game_days table for game day flagging
CREATE TABLE public.team_game_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, date)
);

-- Enable RLS
ALTER TABLE public.team_game_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_game_days
CREATE POLICY "Team adults can view game days"
  ON public.team_game_days
  FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can view game days for their player teams"
  ON public.team_game_days
  FOR SELECT
  USING (is_guardian_of_team_player(team_id, auth.uid()));

CREATE POLICY "Team adults can create game days"
  ON public.team_game_days
  FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update game days"
  ON public.team_game_days
  FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can delete game days"
  ON public.team_game_days
  FOR DELETE
  USING (is_team_adult(team_id, auth.uid()));

-- Update practice_cards mode constraint to include 'game_day'
ALTER TABLE public.practice_cards DROP CONSTRAINT IF EXISTS practice_cards_mode_check;
ALTER TABLE public.practice_cards ADD CONSTRAINT practice_cards_mode_check 
  CHECK (mode IN ('normal', 'game_day'));

-- Add unique constraint for team_id, date, mode
ALTER TABLE public.practice_cards DROP CONSTRAINT IF EXISTS practice_cards_team_id_date_key;
ALTER TABLE public.practice_cards DROP CONSTRAINT IF EXISTS practice_cards_team_id_date_mode_key;
ALTER TABLE public.practice_cards ADD CONSTRAINT practice_cards_team_id_date_mode_key 
  UNIQUE (team_id, date, mode);