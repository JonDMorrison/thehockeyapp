
-- Fix the is_player_guardian function to use SECURITY DEFINER
-- This prevents infinite recursion when used in RLS policies on player_guardians table
CREATE OR REPLACE FUNCTION public.is_player_guardian(player_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.player_guardians
    WHERE player_id = player_uuid AND user_id = user_uuid
  )
$$;

-- Also fix is_player_owner if it has the same issue
CREATE OR REPLACE FUNCTION public.is_player_owner(player_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players
    WHERE id = player_uuid AND owner_user_id = user_uuid
  )
$$;
