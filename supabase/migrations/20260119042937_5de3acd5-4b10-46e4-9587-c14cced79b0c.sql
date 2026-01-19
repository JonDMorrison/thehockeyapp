-- Fix infinite recursion: team_memberships SELECT/INSERT policies were querying public.players directly,
-- which triggers public.players policies that query team_memberships again.
-- Replace those policies with SECURITY DEFINER function checks.

DROP POLICY IF EXISTS "Player owners can view memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Player owners can insert memberships" ON public.team_memberships;

CREATE POLICY "Player owners can view memberships"
ON public.team_memberships
FOR SELECT
USING (public.is_player_owner(player_id, auth.uid()));

CREATE POLICY "Player owners can insert memberships"
ON public.team_memberships
FOR INSERT
WITH CHECK (public.is_player_owner(player_id, auth.uid()));
