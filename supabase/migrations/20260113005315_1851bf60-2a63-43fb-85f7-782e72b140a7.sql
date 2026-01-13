-- Add RLS policy for team adults to insert memberships for players they own
-- This is needed when a coach creates a new child and wants to add them to the team
-- The coach creates the player (owner_user_id = coach) and guardian record, 
-- but we need to ensure the INSERT happens smoothly

-- First, let's check if a policy already exists and drop it if needed
DROP POLICY IF EXISTS "Player owners can insert memberships" ON public.team_memberships;

-- Create a new policy that also allows player owners to insert memberships
CREATE POLICY "Player owners can insert memberships" 
ON public.team_memberships 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE id = player_id AND owner_user_id = auth.uid()
  )
);

-- Also add SELECT policy for player owners (not just guardians) so they can see their children's memberships
DROP POLICY IF EXISTS "Player owners can view memberships" ON public.team_memberships;

CREATE POLICY "Player owners can view memberships" 
ON public.team_memberships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE id = player_id AND owner_user_id = auth.uid()
  )
);