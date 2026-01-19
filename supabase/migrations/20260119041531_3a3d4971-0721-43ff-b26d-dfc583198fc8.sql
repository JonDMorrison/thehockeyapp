
-- Allow team members to view other team memberships on their team
-- This enables the Teammates feature where players can see who else is on their team
CREATE POLICY "Team members can view team memberships"
ON public.team_memberships
FOR SELECT
USING (
  -- User can see memberships for teams where they have a player
  EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN players p ON p.id = tm.player_id
    WHERE tm.team_id = team_memberships.team_id
    AND (p.owner_user_id = auth.uid() OR is_player_guardian(p.id, auth.uid()))
    AND tm.status = 'active'
  )
);

-- Allow team members to view other players on their team
-- This enables showing teammate names and photos
CREATE POLICY "Team members can view teammates"
ON public.players
FOR SELECT
USING (
  -- User can see players who are on the same team as their player
  EXISTS (
    SELECT 1
    FROM team_memberships tm1
    JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
    JOIN players my_player ON my_player.id = tm1.player_id
    WHERE tm2.player_id = players.id
    AND (my_player.owner_user_id = auth.uid() OR is_player_guardian(my_player.id, auth.uid()))
    AND tm1.status = 'active'
    AND tm2.status = 'active'
  )
);
