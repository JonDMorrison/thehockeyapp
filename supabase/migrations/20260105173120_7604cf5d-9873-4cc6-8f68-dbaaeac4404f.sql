-- Update regenerate_team_invite function to use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.regenerate_team_invite(p_team_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text;
  v_expires_at timestamptz;
  v_invite_id uuid;
BEGIN
  -- Check if user is head coach of this team
  IF NOT is_team_head_coach(p_team_id, auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Generate new token using extensions schema
  v_new_token := encode(extensions.gen_random_bytes(24), 'base64');
  -- Make it URL-safe
  v_new_token := replace(replace(v_new_token, '+', '-'), '/', '_');
  v_expires_at := now() + interval '7 days';

  -- Expire any existing active invites
  UPDATE team_invites
  SET status = 'expired'
  WHERE team_id = p_team_id AND status = 'active';

  -- Create new invite
  INSERT INTO team_invites (team_id, token, expires_at, created_by_user_id, status)
  VALUES (p_team_id, v_new_token, v_expires_at, auth.uid(), 'active')
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'success', true,
    'token', v_new_token,
    'expires_at', v_expires_at
  );
END;
$$;