-- Add from_user_id column to team_cheers for coach identity
ALTER TABLE public.team_cheers
ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make from_player_id nullable since cheers can now come from coaches
ALTER TABLE public.team_cheers
ALTER COLUMN from_player_id DROP NOT NULL;

-- Add check constraint: must have either from_player_id OR from_user_id
ALTER TABLE public.team_cheers
ADD CONSTRAINT cheer_must_have_sender CHECK (
  from_player_id IS NOT NULL OR from_user_id IS NOT NULL
);

-- Update RLS policy to allow coaches to send cheers
DROP POLICY IF EXISTS "Team adults can insert cheers" ON public.team_cheers;
CREATE POLICY "Team adults can insert cheers" ON public.team_cheers
FOR INSERT
WITH CHECK (
  public.is_team_adult(team_id, auth.uid())
  OR public.user_has_player_on_team(team_id, auth.uid())
);