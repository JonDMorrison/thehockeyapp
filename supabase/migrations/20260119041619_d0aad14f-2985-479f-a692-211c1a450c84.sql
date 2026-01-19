
-- Allow team coaches/adults to view all players on their teams
CREATE POLICY "Team adults can view team players"
ON public.players
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM team_memberships tm
    WHERE tm.player_id = players.id
    AND tm.status = 'active'
    AND is_team_adult(tm.team_id, auth.uid())
  )
);
