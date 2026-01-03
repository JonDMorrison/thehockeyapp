-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season_label text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_photo_url text,
  team_logo_url text,
  palette_id text NOT NULL DEFAULT 'toronto',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create team_roles table
CREATE TABLE public.team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('head_coach', 'assistant_coach', 'manager')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS on team_roles
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;

-- Create team_adult_invites table
CREATE TABLE public.team_adult_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  role text CHECK (role IN ('assistant_coach', 'manager')) NOT NULL,
  token text UNIQUE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')) DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on team_adult_invites
ALTER TABLE public.team_adult_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is a team adult
CREATE OR REPLACE FUNCTION public.is_team_adult(team_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE team_id = team_uuid AND user_id = user_uuid
  )
$$;

-- Security definer function to check if user is head coach
CREATE OR REPLACE FUNCTION public.is_team_head_coach(team_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE team_id = team_uuid AND user_id = user_uuid AND role = 'head_coach'
  )
$$;

-- Teams RLS policies
CREATE POLICY "Team adults can view teams" ON public.teams
  FOR SELECT USING (public.is_team_adult(id, auth.uid()));

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Team adults can update teams" ON public.teams
  FOR UPDATE USING (public.is_team_adult(id, auth.uid()));

CREATE POLICY "Head coach can delete teams" ON public.teams
  FOR DELETE USING (public.is_team_head_coach(id, auth.uid()));

-- Team roles RLS policies
CREATE POLICY "Team adults can view team roles" ON public.team_roles
  FOR SELECT USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Allow role creation on team creation or invite redemption" ON public.team_roles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      -- Allow head coach role on new team (creator)
      (role = 'head_coach' AND EXISTS (
        SELECT 1 FROM public.teams WHERE id = team_id AND created_by_user_id = auth.uid()
      ))
      OR
      -- Allow via invite redemption (handled by RPC)
      role IN ('assistant_coach', 'manager')
    )
  );

CREATE POLICY "Head coach can update roles" ON public.team_roles
  FOR UPDATE USING (public.is_team_head_coach(team_id, auth.uid()));

CREATE POLICY "Head coach can delete roles" ON public.team_roles
  FOR DELETE USING (public.is_team_head_coach(team_id, auth.uid()));

-- Team adult invites RLS policies
CREATE POLICY "Team adults can view invites" ON public.team_adult_invites
  FOR SELECT USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Anyone can view invite by token" ON public.team_adult_invites
  FOR SELECT USING (true);

CREATE POLICY "Team adults can create invites" ON public.team_adult_invites
  FOR INSERT WITH CHECK (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update invites" ON public.team_adult_invites
  FOR UPDATE USING (public.is_team_adult(team_id, auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_team_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_team_updated_at();

-- RPC function to redeem adult invite (secure token redemption)
CREATE OR REPLACE FUNCTION public.redeem_team_adult_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the invite
  SELECT * INTO v_invite FROM public.team_adult_invites
  WHERE token = invite_token AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Check if already a team adult
  IF EXISTS (SELECT 1 FROM public.team_roles WHERE team_id = v_invite.team_id AND user_id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;

  -- Add as team role
  INSERT INTO public.team_roles (team_id, user_id, role)
  VALUES (v_invite.team_id, v_user_id, v_invite.role);

  -- Mark invite as accepted
  UPDATE public.team_adult_invites SET status = 'accepted' WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'team_id', v_invite.team_id);
END;
$$;

-- Create storage bucket for team media
INSERT INTO storage.buckets (id, name, public) VALUES ('team-media', 'team-media', false);

-- Storage policies for team media
CREATE POLICY "Team adults can view team media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'team-media' AND
    public.is_team_adult((string_to_array(name, '/'))[2]::uuid, auth.uid())
  );

CREATE POLICY "Team adults can upload team media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-media' AND
    public.is_team_adult((string_to_array(name, '/'))[2]::uuid, auth.uid())
  );

CREATE POLICY "Team adults can update team media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'team-media' AND
    public.is_team_adult((string_to_array(name, '/'))[2]::uuid, auth.uid())
  );

CREATE POLICY "Team adults can delete team media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-media' AND
    public.is_team_adult((string_to_array(name, '/'))[2]::uuid, auth.uid())
  );