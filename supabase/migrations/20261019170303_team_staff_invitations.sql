-- Email-bound invitations and private single-use links share the existing staff workspace.
ALTER TABLE public.team_adult_invites
  ADD COLUMN invitation_kind text NOT NULL DEFAULT 'email'
    CHECK (invitation_kind IN ('email', 'link')),
  ADD COLUMN accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.team_adult_invites
  ADD CONSTRAINT staff_invite_recipient_kind CHECK (
    (invitation_kind = 'email' AND length(btrim(invited_email)) > 0)
    OR (invitation_kind = 'link' AND invited_email = '')
  );

CREATE FUNCTION public.create_team_staff_invite(p_id uuid, p_team_id uuid, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_invite public.team_adult_invites%ROWTYPE;
  v_kind text := CASE WHEN p_email IS NULL THEN 'link' ELSE 'email' END;
  v_email text := lower(btrim(COALESCE(p_email, '')));
BEGIN
  IF v_user IS NULL OR NOT public.is_team_adult(p_team_id, v_user) THEN
    RAISE EXCEPTION 'Only team staff can create staff invitations' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR (v_kind = 'email' AND (length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')) THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;
  -- Serialize this team's requests and make a network retry reuse the same invitation.
  PERFORM 1 FROM public.teams WHERE id = p_team_id FOR UPDATE;
  SELECT * INTO v_invite FROM public.team_adult_invites WHERE id = p_id;
  IF FOUND THEN
    IF v_invite.team_id <> p_team_id OR v_invite.created_by_user_id <> v_user
      OR v_invite.invited_email <> v_email OR v_invite.invitation_kind <> v_kind
      OR v_invite.status <> 'pending' OR v_invite.expires_at <= now() THEN
      RAISE EXCEPTION 'This invitation request is no longer available. Create a new invitation.';
    END IF;
  ELSE
    IF (SELECT count(*) FROM public.team_adult_invites WHERE team_id = p_team_id AND created_at > now() - interval '1 hour') >= 30 THEN
      RAISE EXCEPTION 'Please wait before creating more staff invitations';
    END IF;
    INSERT INTO public.team_adult_invites(id, team_id, invited_email, invitation_kind, role, token, expires_at, created_by_user_id)
    VALUES(p_id, p_team_id, v_email, v_kind, 'assistant_coach',
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), now() + interval '14 days', v_user)
    RETURNING * INTO v_invite;
  END IF;
  RETURN jsonb_build_object('id', v_invite.id, 'token', v_invite.token, 'expires_at', v_invite.expires_at, 'invitation_kind', v_invite.invitation_kind);
END; $$;
REVOKE ALL ON FUNCTION public.create_team_staff_invite(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_staff_invite(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.preview_team_adult_invite(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_invite public.team_adult_invites%ROWTYPE; v_team_name text; v_member boolean;
BEGIN
  SELECT * INTO v_invite FROM public.team_adult_invites WHERE token = p_token;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid invite'); END IF;
  SELECT name INTO v_team_name FROM public.teams WHERE id = v_invite.team_id;
  v_member := auth.uid() IS NOT NULL AND public.is_team_adult(v_invite.team_id, auth.uid());
  RETURN jsonb_build_object('success', true, 'team_name', v_team_name, 'role', v_invite.role,
    'status', v_invite.status, 'expires_at', v_invite.expires_at,
    'invitation_kind', v_invite.invitation_kind,
    'email_domain', CASE WHEN v_invite.invitation_kind = 'email' THEN split_part(lower(v_invite.invited_email), '@', 2) ELSE NULL END,
    'already_member', v_member, 'team_id', CASE WHEN v_member THEN v_invite.team_id ELSE NULL END);
END; $$;

CREATE OR REPLACE FUNCTION public.redeem_team_adult_invite(invite_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_invite public.team_adult_invites%ROWTYPE; v_user_id uuid := auth.uid(); v_email text;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Sign in to join the coaching workspace'); END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invite FROM public.team_adult_invites WHERE token = invite_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation'); END IF;
  IF v_invite.status = 'accepted' AND v_invite.accepted_by_user_id = v_user_id
    AND public.is_team_adult(v_invite.team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'team_id', v_invite.team_id, 'already_member', true);
  END IF;
  IF v_invite.status <> 'pending' OR v_invite.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has been used, revoked or expired. Ask your coach for a new one.');
  END IF;
  IF v_invite.invitation_kind = 'email' AND lower(btrim(COALESCE(v_email, ''))) <> lower(btrim(v_invite.invited_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the email address that received this invitation');
  END IF;
  -- Joining an existing member consumes no link and never changes their current role.
  IF public.is_team_adult(v_invite.team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', true, 'team_id', v_invite.team_id, 'already_member', true);
  END IF;
  INSERT INTO public.team_roles(team_id, user_id, role) VALUES(v_invite.team_id, v_user_id, v_invite.role);
  UPDATE public.team_adult_invites SET status = 'accepted', accepted_by_user_id = v_user_id WHERE id = v_invite.id;
  RETURN jsonb_build_object('success', true, 'team_id', v_invite.team_id, 'already_member', false);
END; $$;
-- Replacing functions retains their prior narrow grants; state them explicitly.
REVOKE ALL ON FUNCTION public.preview_team_adult_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_team_adult_invite(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_team_adult_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_team_adult_invite(text) TO authenticated;
