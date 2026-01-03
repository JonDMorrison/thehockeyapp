-- Extend teams table with bio fields
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS values_text text;

-- Create session_photos table
CREATE TABLE public.session_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_card_id uuid REFERENCES public.practice_cards(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  uploaded_by_user_id uuid NOT NULL,
  storage_path text NOT NULL,
  visibility text CHECK (visibility IN ('parent_only', 'team_adults')) DEFAULT 'parent_only',
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Create player_privacy_settings table
CREATE TABLE public.player_privacy_settings (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  national_challenges_opt_in boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Create team_settings table
CREATE TABLE public.team_settings (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  challenges_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- session_photos RLS policies
CREATE POLICY "Guardians can view their player photos"
ON public.session_photos FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can view shared photos"
ON public.session_photos FOR SELECT
USING (
  visibility = 'team_adults' 
  AND EXISTS (
    SELECT 1 FROM public.practice_cards pc
    WHERE pc.id = session_photos.practice_card_id
    AND public.is_team_adult(pc.team_id, auth.uid())
  )
);

CREATE POLICY "Guardians can insert photos for their player"
ON public.session_photos FOR INSERT
WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can update their player photos"
ON public.session_photos FOR UPDATE
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can delete their player photos"
ON public.session_photos FOR DELETE
USING (public.is_player_guardian(player_id, auth.uid()));

-- player_privacy_settings RLS policies
CREATE POLICY "Guardians can view player privacy settings"
ON public.player_privacy_settings FOR SELECT
USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can insert player privacy settings"
ON public.player_privacy_settings FOR INSERT
WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can update player privacy settings"
ON public.player_privacy_settings FOR UPDATE
USING (public.is_player_guardian(player_id, auth.uid()));

-- team_settings RLS policies
CREATE POLICY "Team adults can view team settings"
ON public.team_settings FOR SELECT
USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can view team settings for their player teams"
ON public.team_settings FOR SELECT
USING (public.is_guardian_of_team_player(team_id, auth.uid()));

CREATE POLICY "Team adults can insert team settings"
ON public.team_settings FOR INSERT
WITH CHECK (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update team settings"
ON public.team_settings FOR UPDATE
USING (public.is_team_adult(team_id, auth.uid()));

-- Create session-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for session-photos bucket
CREATE POLICY "Guardians can upload session photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their uploaded photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-photos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their uploaded photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-photos'
  AND auth.uid() IS NOT NULL
);