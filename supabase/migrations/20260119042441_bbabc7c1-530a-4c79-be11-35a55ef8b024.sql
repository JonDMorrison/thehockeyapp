
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Team members can view team memberships" ON public.team_memberships;

-- Create a SECURITY DEFINER function to check if user has a player on a team
CREATE OR REPLACE FUNCTION public.user_has_player_on_team(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN players p ON p.id = tm.player_id
    WHERE tm.team_id = p_team_id
    AND tm.status = 'active'
    AND (p.owner_user_id = p_user_id OR EXISTS (
      SELECT 1 FROM player_guardians pg 
      WHERE pg.player_id = p.id AND pg.user_id = p_user_id
    ))
  )
$$;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Team members can view team memberships"
ON public.team_memberships
FOR SELECT
USING (user_has_player_on_team(team_id, auth.uid()));

-- Also drop and recreate the "Team members can view teammates" policy on players
-- to avoid potential recursion issues
DROP POLICY IF EXISTS "Team members can view teammates" ON public.players;

-- Create a helper function for checking teammate visibility
CREATE OR REPLACE FUNCTION public.is_teammate_of_user(p_player_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_memberships tm1
    JOIN team_memberships tm2 ON tm1.team_id = tm2.team_id
    JOIN players my_player ON my_player.id = tm1.player_id
    WHERE tm2.player_id = p_player_id
    AND tm1.status = 'active'
    AND tm2.status = 'active'
    AND (my_player.owner_user_id = p_user_id OR EXISTS (
      SELECT 1 FROM player_guardians pg 
      WHERE pg.player_id = my_player.id AND pg.user_id = p_user_id
    ))
  )
$$;

-- Recreate teammates policy using the function
CREATE POLICY "Team members can view teammates"
ON public.players
FOR SELECT
USING (is_teammate_of_user(id, auth.uid()));
