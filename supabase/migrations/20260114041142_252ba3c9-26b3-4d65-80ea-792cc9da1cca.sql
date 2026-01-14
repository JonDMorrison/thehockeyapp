-- Create team_cheers table for teammate encouragement
CREATE TABLE public.team_cheers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  to_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  cheer_type TEXT NOT NULL DEFAULT 'emoji', -- 'emoji' or 'message'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Create indexes for efficient querying
CREATE INDEX idx_team_cheers_to_player ON public.team_cheers(to_player_id, created_at DESC);
CREATE INDEX idx_team_cheers_team ON public.team_cheers(team_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.team_cheers ENABLE ROW LEVEL SECURITY;

-- Players can view cheers sent to them
CREATE POLICY "Players can view their received cheers"
ON public.team_cheers FOR SELECT
USING (
  public.is_player_owner(to_player_id, auth.uid()) OR
  public.is_player_guardian(to_player_id, auth.uid())
);

-- Players can view cheers they sent
CREATE POLICY "Players can view their sent cheers"
ON public.team_cheers FOR SELECT
USING (
  public.is_player_owner(from_player_id, auth.uid()) OR
  public.is_player_guardian(from_player_id, auth.uid())
);

-- Team members can view all team cheers (for the feed)
CREATE POLICY "Team members can view team cheers"
ON public.team_cheers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    JOIN public.players p ON p.id = tm.player_id
    WHERE tm.team_id = team_cheers.team_id
    AND tm.status = 'active'
    AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(p.id, auth.uid()))
  )
);

-- Players can send cheers to teammates
CREATE POLICY "Players can send cheers"
ON public.team_cheers FOR INSERT
WITH CHECK (
  public.is_player_owner(from_player_id, auth.uid()) OR
  public.is_player_guardian(from_player_id, auth.uid())
);

-- Players can mark their received cheers as read
CREATE POLICY "Players can update their received cheers"
ON public.team_cheers FOR UPDATE
USING (
  public.is_player_owner(to_player_id, auth.uid()) OR
  public.is_player_guardian(to_player_id, auth.uid())
);

-- Enable realtime for cheers
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_cheers;