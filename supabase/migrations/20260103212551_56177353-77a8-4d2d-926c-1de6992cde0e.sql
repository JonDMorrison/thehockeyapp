-- Create team_invites table (parent join links)
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  status text CHECK (status IN ('active', 'revoked', 'expired')) DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on team_invites
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Create team_memberships table
CREATE TABLE public.team_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id)
);

-- Enable RLS on team_memberships
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Create player_team_preferences table
CREATE TABLE public.player_team_preferences (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  active_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on player_team_preferences
ALTER TABLE public.player_team_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_invites
CREATE POLICY "Team adults can view team invites" ON public.team_invites
  FOR SELECT USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create invites" ON public.team_invites
  FOR INSERT WITH CHECK (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update invites" ON public.team_invites
  FOR UPDATE USING (public.is_team_adult(team_id, auth.uid()));

-- RLS Policies for team_memberships
CREATE POLICY "Team adults can view memberships" ON public.team_memberships
  FOR SELECT USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can view their player memberships" ON public.team_memberships
  FOR SELECT USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can insert memberships via RPC" ON public.team_memberships
  FOR INSERT WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Team adults can update memberships" ON public.team_memberships
  FOR UPDATE USING (public.is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can delete their player memberships" ON public.team_memberships
  FOR DELETE USING (public.is_player_guardian(player_id, auth.uid()));

-- RLS Policies for player_team_preferences
CREATE POLICY "Guardians can view player preferences" ON public.player_team_preferences
  FOR SELECT USING (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can insert player preferences" ON public.player_team_preferences
  FOR INSERT WITH CHECK (public.is_player_guardian(player_id, auth.uid()));

CREATE POLICY "Guardians can update player preferences" ON public.player_team_preferences
  FOR UPDATE USING (public.is_player_guardian(player_id, auth.uid()));

-- RPC: Preview team by invite token (public, no auth required)
CREATE OR REPLACE FUNCTION public.preview_team_by_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_team record;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite FROM public.team_invites
  WHERE token = invite_token AND status = 'active' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Get team details
  SELECT id, name, season_label, team_photo_url, team_logo_url, palette_id 
  INTO v_team FROM public.teams WHERE id = v_invite.team_id;

  RETURN json_build_object(
    'success', true,
    'team_id', v_team.id,
    'team_name', v_team.name,
    'season_label', v_team.season_label,
    'team_photo_url', v_team.team_photo_url,
    'team_logo_url', v_team.team_logo_url,
    'palette_id', v_team.palette_id
  );
END;
$$;

-- RPC: Join team with invite (requires auth)
CREATE OR REPLACE FUNCTION public.join_team_with_invite(invite_token text, p_player_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invite record;
  v_membership_id uuid;
  v_existing_membership record;
  v_has_active_team boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is guardian of this player
  IF NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized for this player');
  END IF;

  -- Find and validate the invite
  SELECT * INTO v_invite FROM public.team_invites
  WHERE token = invite_token AND status = 'active' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  -- Check if membership already exists
  SELECT * INTO v_existing_membership FROM public.team_memberships
  WHERE team_id = v_invite.team_id AND player_id = p_player_id;

  IF FOUND THEN
    -- Already a member, return success idempotently
    RETURN json_build_object(
      'success', true, 
      'membership_id', v_existing_membership.id, 
      'team_id', v_invite.team_id,
      'already_member', true
    );
  END IF;

  -- Create membership
  INSERT INTO public.team_memberships (team_id, player_id, status)
  VALUES (v_invite.team_id, p_player_id, 'active')
  RETURNING id INTO v_membership_id;

  -- Check if player has active team preference
  SELECT EXISTS (
    SELECT 1 FROM public.player_team_preferences WHERE player_id = p_player_id AND active_team_id IS NOT NULL
  ) INTO v_has_active_team;

  -- Set active team if player doesn't have one
  IF NOT v_has_active_team THEN
    INSERT INTO public.player_team_preferences (player_id, active_team_id, updated_at)
    VALUES (p_player_id, v_invite.team_id, now())
    ON CONFLICT (player_id) DO UPDATE SET active_team_id = v_invite.team_id, updated_at = now();
  END IF;

  RETURN json_build_object(
    'success', true, 
    'membership_id', v_membership_id, 
    'team_id', v_invite.team_id,
    'already_member', false
  );
END;
$$;

-- RPC: Regenerate team invite (requires team adult)
CREATE OR REPLACE FUNCTION public.regenerate_team_invite(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_token text;
  v_expires_at timestamptz;
  v_invite_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is team adult
  IF NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Revoke all existing active invites for this team
  UPDATE public.team_invites 
  SET status = 'revoked' 
  WHERE team_id = p_team_id AND status = 'active';

  -- Generate new token (32 chars, url-safe)
  v_new_token := encode(gen_random_bytes(24), 'base64');
  v_new_token := replace(replace(replace(v_new_token, '+', ''), '/', ''), '=', '');
  
  v_expires_at := now() + interval '14 days';

  -- Create new invite
  INSERT INTO public.team_invites (team_id, token, status, expires_at, created_by_user_id)
  VALUES (p_team_id, v_new_token, 'active', v_expires_at, v_user_id)
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'token', v_new_token,
    'expires_at', v_expires_at
  );
END;
$$;