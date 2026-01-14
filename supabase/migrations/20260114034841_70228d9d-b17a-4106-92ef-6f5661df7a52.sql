-- Add RLS policy to allow guardians to view teams their players are on
CREATE POLICY "Guardians can view their player teams"
ON public.teams FOR SELECT
USING (
  is_guardian_of_team_player(id, auth.uid())
);