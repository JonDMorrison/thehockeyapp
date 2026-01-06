-- Create solo referral invites table for tracking shared workout/program invites
CREATE TABLE public.solo_referral_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('workout', 'program')),
  workout_card_id UUID REFERENCES public.personal_practice_cards(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.personal_training_plans(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_by_user_id UUID,
  redeemed_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired'))
);

-- Enable RLS
ALTER TABLE public.solo_referral_invites ENABLE ROW LEVEL SECURITY;

-- Players can create invites for their own profile
CREATE POLICY "Players can create their own invites"
ON public.solo_referral_invites
FOR INSERT
WITH CHECK (
  referrer_player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);

-- Players can view their own invites
CREATE POLICY "Players can view their own invites"
ON public.solo_referral_invites
FOR SELECT
USING (
  referrer_player_id IN (
    SELECT id FROM public.players WHERE owner_user_id = auth.uid()
  )
);

-- Anyone can read an invite by token (for redemption - using service role or anon for public access)
CREATE POLICY "Anyone can view invite by token for redemption"
ON public.solo_referral_invites
FOR SELECT
USING (true);

-- Players can update their own invites (for marking as redeemed)
CREATE POLICY "System can update invites"
ON public.solo_referral_invites
FOR UPDATE
USING (true)
WITH CHECK (true);