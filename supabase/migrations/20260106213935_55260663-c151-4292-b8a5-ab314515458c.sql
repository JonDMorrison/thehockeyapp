-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "System can update invites" ON public.solo_referral_invites;

-- Create a more restrictive update policy - only the referrer can update their own invites
CREATE POLICY "Players can update their own invites"
ON public.solo_referral_invites
FOR UPDATE
USING (
  referrer_player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  referrer_player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);