-- Create practice_cards table
CREATE TABLE public.practice_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  mode text CHECK (mode IN ('normal')) DEFAULT 'normal',
  tier text CHECK (tier IN ('rec','rep','elite')) DEFAULT 'rep',
  title text,
  notes text,
  created_by_user_id uuid NOT NULL,
  published_at timestamptz,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, date, mode)
);

-- Create practice_tasks table
CREATE TABLE public.practice_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_card_id uuid REFERENCES public.practice_cards(id) ON DELETE CASCADE NOT NULL,
  sort_order int NOT NULL,
  task_type text CHECK (task_type IN ('shooting','conditioning','mobility','recovery','prep','other')) NOT NULL,
  label text NOT NULL,
  target_type text CHECK (target_type IN ('reps','seconds','minutes','none')) DEFAULT 'none',
  target_value int,
  shot_type text CHECK (shot_type IN ('wrist','snap','slap','backhand','mixed','none')) DEFAULT 'none',
  shots_expected int,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_completions table
CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_task_id uuid REFERENCES public.practice_tasks(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text CHECK (completed_by IN ('parent','player')) DEFAULT 'parent',
  shots_logged int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(practice_task_id, player_id)
);

-- Create session_completions table
CREATE TABLE public.session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_card_id uuid REFERENCES public.practice_cards(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('none','partial','complete')) DEFAULT 'none',
  completed_at timestamptz,
  completed_by text CHECK (completed_by IN ('parent','player')) DEFAULT 'parent',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(practice_card_id, player_id)
);

-- Enable RLS on all tables
ALTER TABLE public.practice_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_completions ENABLE ROW LEVEL SECURITY;

-- Helper function: check if player is member of team
CREATE OR REPLACE FUNCTION public.is_player_team_member(p_player_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE player_id = p_player_id 
    AND team_id = p_team_id 
    AND status = 'active'
  )
$$;

-- Helper: check if user is guardian of any player on team
CREATE OR REPLACE FUNCTION public.is_guardian_of_team_player(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.player_guardians pg ON pg.player_id = tm.player_id
    WHERE tm.team_id = p_team_id 
    AND tm.status = 'active'
    AND pg.user_id = p_user_id
  )
$$;

-- practice_cards RLS policies
CREATE POLICY "Team adults can view all practice cards"
ON public.practice_cards FOR SELECT
USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can view published cards for their player teams"
ON public.practice_cards FOR SELECT
USING (
  published_at IS NOT NULL 
  AND public.is_guardian_of_team_player(team_id, auth.uid())
);

CREATE POLICY "Team adults can create practice cards"
ON public.practice_cards FOR INSERT
WITH CHECK (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update practice cards"
ON public.practice_cards FOR UPDATE
USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can delete unpublished cards"
ON public.practice_cards FOR DELETE
USING (public.is_team_adult(team_id, auth.uid()) AND published_at IS NULL);

-- practice_tasks RLS policies
CREATE POLICY "Team adults can view all tasks"
ON public.practice_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
  )
);

CREATE POLICY "Guardians can view tasks for published cards"
ON public.practice_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND pc.published_at IS NOT NULL
    AND public.is_guardian_of_team_player(pc.team_id, auth.uid())
  )
);

CREATE POLICY "Team adults can create tasks"
ON public.practice_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
    AND pc.locked = false
  )
);

CREATE POLICY "Team adults can update tasks"
ON public.practice_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
    AND pc.locked = false
  )
);

CREATE POLICY "Team adults can delete tasks"
ON public.practice_tasks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
    AND pc.locked = false
  )
);

-- task_completions RLS policies
CREATE POLICY "Guardians can view their player completions"
ON public.task_completions FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can view completions for their team"
ON public.task_completions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practice_tasks pt
    JOIN public.practice_cards pc ON pc.id = pt.practice_card_id
    WHERE pt.id = practice_task_id
    AND public.is_team_adult(pc.team_id, auth.uid())
  )
);

CREATE POLICY "Guardians can insert completions for their player"
ON public.task_completions FOR INSERT
WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can update completions for their player"
ON public.task_completions FOR UPDATE
USING (public.is_player_guardian(player_id, auth.uid()));

-- session_completions RLS policies
CREATE POLICY "Guardians can view their player session completions"
ON public.session_completions FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can view session completions for their team"
ON public.session_completions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
  )
);

CREATE POLICY "Guardians can insert session completions for their player"
ON public.session_completions FOR INSERT
WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can update session completions for their player"
ON public.session_completions FOR UPDATE
USING (public.is_player_guardian(player_id, auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_practice_cards_updated_at
BEFORE UPDATE ON public.practice_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_team_updated_at();

CREATE TRIGGER update_practice_tasks_updated_at
BEFORE UPDATE ON public.practice_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_team_updated_at();

CREATE TRIGGER update_task_completions_updated_at
BEFORE UPDATE ON public.task_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_team_updated_at();

CREATE TRIGGER update_session_completions_updated_at
BEFORE UPDATE ON public.session_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_team_updated_at();