-- Add short_code column to team_invites
ALTER TABLE public.team_invites 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(20) UNIQUE;

-- Create function to generate short codes
CREATE OR REPLACE FUNCTION public.generate_team_short_code(p_team_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team_name TEXT;
  v_slug TEXT;
  v_pin TEXT;
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  -- Get team name
  SELECT name INTO v_team_name FROM public.teams WHERE id = p_team_id;
  
  -- Create slug: first 6 chars, uppercase, alphanumeric only
  v_slug := UPPER(REGEXP_REPLACE(LEFT(v_team_name, 6), '[^A-Za-z0-9]', '', 'g'));
  
  -- Ensure at least 3 chars
  IF LENGTH(v_slug) < 3 THEN
    v_slug := v_slug || 'TEAM';
  END IF;
  
  -- Try to generate unique code
  LOOP
    v_pin := LPAD((1000 + floor(random() * 9000))::TEXT, 4, '0');
    v_code := v_slug || '-' || v_pin;
    
    -- Check if unique
    IF NOT EXISTS (SELECT 1 FROM public.team_invites WHERE short_code = v_code) THEN
      RETURN v_code;
    END IF;
    
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      -- Fallback: add more random chars
      v_code := v_slug || '-' || LPAD((10000 + floor(random() * 90000))::TEXT, 5, '0');
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger function to auto-generate short codes on insert
CREATE OR REPLACE FUNCTION public.set_team_invite_short_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_team_short_code(NEW.team_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_team_invite_short_code_trigger ON public.team_invites;
CREATE TRIGGER set_team_invite_short_code_trigger
BEFORE INSERT ON public.team_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_team_invite_short_code();

-- Backfill existing invites with short codes
UPDATE public.team_invites 
SET short_code = public.generate_team_short_code(team_id)
WHERE short_code IS NULL;

-- Create function to preview team by short code
CREATE OR REPLACE FUNCTION public.preview_team_by_short_code(p_short_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
  v_team record;
BEGIN
  -- Find the invite by short code
  SELECT * INTO v_invite FROM public.team_invites
  WHERE short_code = UPPER(TRIM(p_short_code)) AND status = 'active' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired code');
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
    'palette_id', v_team.palette_id,
    'invite_token', v_invite.token
  );
END;
$$;

-- Update join_team_with_invite to also accept short codes
CREATE OR REPLACE FUNCTION public.join_team_with_invite(invite_token text, p_player_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Find invite by token OR short_code
  SELECT * INTO v_invite FROM public.team_invites
  WHERE (token = invite_token OR short_code = UPPER(TRIM(invite_token)))
    AND status = 'active' AND expires_at > now();
  
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