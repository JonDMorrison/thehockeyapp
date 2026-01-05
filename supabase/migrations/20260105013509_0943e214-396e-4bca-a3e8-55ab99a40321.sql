-- Fix team creation flow: allow creators to SELECT their newly created team.
-- (CREATE POLICY doesn't support IF NOT EXISTS in Postgres)

DROP POLICY IF EXISTS "Team creator can view teams" ON public.teams;

CREATE POLICY "Team creator can view teams"
ON public.teams
FOR SELECT
TO authenticated
USING (created_by_user_id = auth.uid());