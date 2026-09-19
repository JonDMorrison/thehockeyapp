-- Coaches may ask families to complete a short player profile after joining.
-- The answers live on the existing player record so families keep one profile
-- across every team and can edit it later.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS position text;

ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_position_check;

ALTER TABLE public.players
  ADD CONSTRAINT players_position_check
  CHECK (position IS NULL OR position IN ('forward', 'defence', 'goalie', 'unsure'));

ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS collect_player_profile boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.players.position IS
  'Player-selected hockey position: forward, defence, goalie, or unsure.';

COMMENT ON COLUMN public.team_invites.collect_player_profile IS
  'When true, families are guided through the player profile wizard after joining.';

-- Invite previews deliberately expose only the team presentation and whether the
-- family should complete onboarding. The invite token and private roster data are
-- never returned.
CREATE OR REPLACE FUNCTION public.preview_team_by_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_team record;
BEGIN
  SELECT team_id, collect_player_profile INTO v_invite
  FROM public.team_invites
  WHERE (token = invite_token OR short_code = upper(trim(invite_token)))
    AND status = 'active'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  SELECT id, name, season_label, team_photo_url, team_logo_url, palette_id
  INTO v_team
  FROM public.teams
  WHERE id = v_invite.team_id;

  RETURN json_build_object(
    'success', true,
    'team_id', v_team.id,
    'team_name', v_team.name,
    'season_label', v_team.season_label,
    'team_photo_url', v_team.team_photo_url,
    'team_logo_url', v_team.team_logo_url,
    'palette_id', v_team.palette_id,
    'collect_player_profile', COALESCE(v_invite.collect_player_profile, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_team_by_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_team_by_invite(text) TO anon, authenticated;
