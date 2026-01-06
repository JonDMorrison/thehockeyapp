-- Create table for personal training plans (for solo players)
CREATE TABLE public.personal_training_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Training Plan',
  training_focus TEXT[] DEFAULT ARRAY['shooting', 'conditioning']::TEXT[],
  days_per_week INTEGER DEFAULT 4,
  tier TEXT DEFAULT 'base',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_id)
);

-- Enable RLS
ALTER TABLE public.personal_training_plans ENABLE ROW LEVEL SECURITY;

-- Policies for personal training plans
CREATE POLICY "Players and guardians can view their training plans"
  ON public.personal_training_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_training_plans.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_training_plans.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can insert training plans"
  ON public.personal_training_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_training_plans.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_training_plans.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can update their training plans"
  ON public.personal_training_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_training_plans.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_training_plans.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can delete their training plans"
  ON public.personal_training_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_training_plans.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_training_plans.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- Create table for personal practice cards (solo player's daily workouts)
CREATE TABLE public.personal_practice_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT,
  tier TEXT DEFAULT 'base',
  mode TEXT DEFAULT 'solo',
  notes TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_id, date)
);

-- Enable RLS
ALTER TABLE public.personal_practice_cards ENABLE ROW LEVEL SECURITY;

-- Policies for personal practice cards
CREATE POLICY "Players and guardians can view personal cards"
  ON public.personal_practice_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_practice_cards.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_practice_cards.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can insert personal cards"
  ON public.personal_practice_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_practice_cards.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_practice_cards.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can update personal cards"
  ON public.personal_practice_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_practice_cards.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_practice_cards.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Players and guardians can delete personal cards"
  ON public.personal_practice_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = personal_practice_cards.player_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = personal_practice_cards.player_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- Create table for personal practice tasks
CREATE TABLE public.personal_practice_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personal_practice_card_id UUID NOT NULL REFERENCES public.personal_practice_cards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  task_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  shots_expected INTEGER,
  shot_type TEXT,
  target_type TEXT,
  target_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_practice_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for personal practice tasks (inherit from parent card)
CREATE POLICY "Users can view tasks for their cards"
  ON public.personal_practice_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.player_guardians pg ON pg.player_id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.players p ON p.id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks for their cards"
  ON public.personal_practice_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.player_guardians pg ON pg.player_id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.players p ON p.id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks for their cards"
  ON public.personal_practice_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.player_guardians pg ON pg.player_id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.players p ON p.id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND p.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks for their cards"
  ON public.personal_practice_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.player_guardians pg ON pg.player_id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND pg.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.personal_practice_cards ppc
      JOIN public.players p ON p.id = ppc.player_id
      WHERE ppc.id = personal_practice_tasks.personal_practice_card_id
      AND p.owner_user_id = auth.uid()
    )
  );

-- Add index for performance
CREATE INDEX idx_personal_practice_cards_player_date ON public.personal_practice_cards(player_id, date);
CREATE INDEX idx_personal_practice_tasks_card ON public.personal_practice_tasks(personal_practice_card_id);