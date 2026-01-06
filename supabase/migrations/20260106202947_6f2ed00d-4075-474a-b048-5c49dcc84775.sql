-- Create personal_task_completions table for solo training
CREATE TABLE public.personal_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  personal_practice_task_id UUID NOT NULL REFERENCES public.personal_practice_tasks(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_by UUID,
  source TEXT DEFAULT 'solo',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_id, personal_practice_task_id)
);

-- Enable RLS
ALTER TABLE public.personal_task_completions ENABLE ROW LEVEL SECURITY;

-- Players can view their own completions
CREATE POLICY "Players can view own completions"
ON public.personal_task_completions
FOR SELECT
USING (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);

-- Players can insert their own completions
CREATE POLICY "Players can insert own completions"
ON public.personal_task_completions
FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);

-- Players can update their own completions
CREATE POLICY "Players can update own completions"
ON public.personal_task_completions
FOR UPDATE
USING (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);

-- Players can delete their own completions
CREATE POLICY "Players can delete own completions"
ON public.personal_task_completions
FOR DELETE
USING (
  player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);