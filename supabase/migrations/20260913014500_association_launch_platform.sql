-- Association launch platform
-- Adds privacy-preserving multi-team administration, explicit guardian consent,
-- communication preferences, client error telemetry, and private media rules.

-- ---------------------------------------------------------------------------
-- Association data model
-- ---------------------------------------------------------------------------

CREATE TABLE public.associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  season_label text CHECK (season_label IS NULL OR char_length(season_label) <= 50),
  region text CHECK (region IS NULL OR char_length(region) <= 100),
  status text NOT NULL DEFAULT 'pilot' CHECK (status IN ('pilot', 'active', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.association_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'director', 'admin', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (association_id, user_id)
);

CREATE TABLE public.association_teams (
  association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  added_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (association_id, team_id),
  UNIQUE (team_id)
);

CREATE TABLE public.association_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  invited_email text NOT NULL CHECK (char_length(invited_email) BETWEEN 3 AND 320),
  role text NOT NULL CHECK (role IN ('director', 'admin', 'viewer')),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX association_invites_one_pending_email
  ON public.association_invites (association_id, lower(invited_email))
  WHERE status = 'pending';

CREATE TABLE public.association_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  association_id uuid NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(action) BETWEEN 2 AND 100),
  entity_type text NOT NULL CHECK (char_length(entity_type) BETWEEN 2 AND 50),
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX association_roles_user_idx ON public.association_roles (user_id, association_id);
CREATE INDEX association_teams_association_idx ON public.association_teams (association_id, added_at);
CREATE INDEX association_audit_log_association_idx ON public.association_audit_log (association_id, created_at DESC);

CREATE TRIGGER update_associations_updated_at
  BEFORE UPDATE ON public.associations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SECURITY DEFINER membership predicates avoid recursive RLS evaluation.
CREATE OR REPLACE FUNCTION public.is_association_member(
  p_association_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.association_roles ar
    WHERE ar.association_id = p_association_id
      AND ar.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_association_admin(
  p_association_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.association_roles ar
    WHERE ar.association_id = p_association_id
      AND ar.user_id = p_user_id
      AND ar.role IN ('owner', 'director', 'admin')
  );
$$;

ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.associations FROM anon, authenticated;
REVOKE ALL ON TABLE public.association_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.association_teams FROM anon, authenticated;
REVOKE ALL ON TABLE public.association_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.association_audit_log FROM anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.associations TO authenticated;
GRANT SELECT ON TABLE public.association_roles TO authenticated;
GRANT SELECT ON TABLE public.association_teams TO authenticated;
GRANT SELECT ON TABLE public.association_invites TO authenticated;
GRANT SELECT ON TABLE public.association_audit_log TO authenticated;

CREATE POLICY "Association members can view their associations"
ON public.associations FOR SELECT TO authenticated
USING (public.is_association_member(id, (SELECT auth.uid())));

CREATE POLICY "Association admins can update association details"
ON public.associations FOR UPDATE TO authenticated
USING (public.is_association_admin(id, (SELECT auth.uid())))
WITH CHECK (public.is_association_admin(id, (SELECT auth.uid())));

CREATE POLICY "Association members can view staff roles"
ON public.association_roles FOR SELECT TO authenticated
USING (public.is_association_member(association_id, (SELECT auth.uid())));

CREATE POLICY "Association members can view team links"
ON public.association_teams FOR SELECT TO authenticated
USING (public.is_association_member(association_id, (SELECT auth.uid())));

CREATE POLICY "Association admins can view invitations"
ON public.association_invites FOR SELECT TO authenticated
USING (public.is_association_admin(association_id, (SELECT auth.uid())));

CREATE POLICY "Association admins can view audit history"
ON public.association_audit_log FOR SELECT TO authenticated
USING (public.is_association_admin(association_id, (SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- Atomic association and team operations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_association(
  p_name text,
  p_season_label text DEFAULT NULL,
  p_region text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_name text := trim(p_name);
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'Association name must be between 2 and 120 characters' USING ERRCODE = '22023';
  END IF;
  IF p_season_label IS NOT NULL AND char_length(trim(p_season_label)) > 50 THEN
    RAISE EXCEPTION 'Season label is too long' USING ERRCODE = '22023';
  END IF;
  IF p_region IS NOT NULL AND char_length(trim(p_region)) > 100 THEN
    RAISE EXCEPTION 'Region is too long' USING ERRCODE = '22023';
  END IF;

  v_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  IF v_slug = '' THEN v_slug := 'association'; END IF;
  v_slug := left(v_slug, 72) || '-' || substr(replace(v_id::text, '-', ''), 1, 8);

  INSERT INTO public.associations (
    id, name, slug, season_label, region, created_by_user_id
  ) VALUES (
    v_id,
    v_name,
    v_slug,
    NULLIF(trim(p_season_label), ''),
    NULLIF(trim(p_region), ''),
    v_user_id
  );

  INSERT INTO public.association_roles (association_id, user_id, role)
  VALUES (v_id, v_user_id, 'owner');

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id
  ) VALUES (v_id, v_user_id, 'association.created', 'association', v_id);

  RETURN jsonb_build_object(
    'success', true,
    'association_id', v_id,
    'name', v_name,
    'slug', v_slug
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  p_name text,
  p_season_label text DEFAULT NULL,
  p_palette_id text DEFAULT 'toronto',
  p_age_division text DEFAULT NULL,
  p_level text DEFAULT NULL,
  p_association_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_name text := trim(p_name);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_name) < 1 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Team name must be between 1 and 100 characters' USING ERRCODE = '22023';
  END IF;
  IF p_association_id IS NOT NULL
     AND NOT public.is_association_admin(p_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association administrator access required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.teams (
    name, season_label, palette_id, age_division, level, created_by_user_id
  ) VALUES (
    v_name,
    NULLIF(trim(p_season_label), ''),
    COALESCE(NULLIF(trim(p_palette_id), ''), 'toronto'),
    NULLIF(trim(p_age_division), ''),
    NULLIF(trim(p_level), ''),
    v_user_id
  ) RETURNING id INTO v_team_id;

  INSERT INTO public.team_roles (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'head_coach');

  IF p_association_id IS NOT NULL THEN
    INSERT INTO public.association_teams (
      association_id, team_id, added_by_user_id
    ) VALUES (p_association_id, v_team_id, v_user_id);

    INSERT INTO public.association_audit_log (
      association_id, actor_user_id, action, entity_type, entity_id,
      metadata
    ) VALUES (
      p_association_id, v_user_id, 'team.created', 'team', v_team_id,
      jsonb_build_object('name', v_name)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'name', v_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_team_to_association(
  p_association_id uuid,
  p_team_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT public.is_association_admin(p_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association administrator access required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_team_head_coach(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'Only the team head coach can connect this team' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.association_teams (association_id, team_id, added_by_user_id)
  VALUES (p_association_id, p_team_id, v_user_id)
  ON CONFLICT (association_id, team_id) DO NOTHING;

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id
  ) VALUES (p_association_id, v_user_id, 'team.connected', 'team', p_team_id);

  RETURN jsonb_build_object('success', true, 'team_id', p_team_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_team_from_association(
  p_association_id uuid,
  p_team_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT public.is_association_admin(p_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association administrator access required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.association_teams
  WHERE association_id = p_association_id AND team_id = p_team_id;

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id
  ) VALUES (p_association_id, v_user_id, 'team.disconnected', 'team', p_team_id);

  RETURN jsonb_build_object('success', true, 'team_id', p_team_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_association_invite(
  p_association_id uuid,
  p_email text,
  p_role text DEFAULT 'viewer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_invite public.association_invites;
BEGIN
  IF NOT public.is_association_admin(p_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association administrator access required' USING ERRCODE = '42501';
  END IF;
  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22023';
  END IF;
  IF p_role NOT IN ('director', 'admin', 'viewer') THEN
    RAISE EXCEPTION 'Invalid association role' USING ERRCODE = '22023';
  END IF;

  UPDATE public.association_invites
  SET status = 'expired'
  WHERE association_id = p_association_id
    AND lower(invited_email) = v_email
    AND status = 'pending';

  INSERT INTO public.association_invites (
    association_id, invited_email, role, created_by_user_id
  ) VALUES (p_association_id, v_email, p_role, v_user_id)
  RETURNING * INTO v_invite;

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) VALUES (
    p_association_id, v_user_id, 'staff.invited', 'association_invite', v_invite.id,
    jsonb_build_object('role', p_role)
  );

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'token', v_invite.token,
    'expires_at', v_invite.expires_at,
    'email', v_email,
    'role', p_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_association_invite(p_invite_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_association_id uuid;
BEGIN
  SELECT association_id INTO v_association_id
  FROM public.association_invites WHERE id = p_invite_id;

  IF v_association_id IS NULL
     OR NOT public.is_association_admin(v_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association administrator access required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.association_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND status = 'pending';

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id
  ) VALUES (v_association_id, v_user_id, 'staff.invite_revoked', 'association_invite', p_invite_id);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_association_invite(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'success', true,
        'association_name', a.name,
        'season_label', a.season_label,
        'region', a.region,
        'role', ai.role,
        'expires_at', ai.expires_at
      )
      FROM public.association_invites ai
      JOIN public.associations a ON a.id = ai.association_id
      WHERE ai.token::text = p_token
        AND ai.status = 'pending'
        AND ai.expires_at > now()
    ),
    jsonb_build_object('success', false, 'error', 'Invalid or expired invitation')
  );
$$;

CREATE OR REPLACE FUNCTION public.redeem_association_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.association_invites;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invite
  FROM public.association_invites
  WHERE token::text = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  IF v_user_email IS NULL OR v_user_email <> lower(v_invite.invited_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the email address that received this invitation');
  END IF;

  INSERT INTO public.association_roles (association_id, user_id, role)
  VALUES (v_invite.association_id, v_user_id, v_invite.role)
  ON CONFLICT (association_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.association_invites
  SET status = 'accepted', accepted_by_user_id = v_user_id, accepted_at = now()
  WHERE id = v_invite.id;

  INSERT INTO public.association_audit_log (
    association_id, actor_user_id, action, entity_type, entity_id,
    metadata
  ) VALUES (
    v_invite.association_id, v_user_id, 'staff.joined', 'association_role', v_user_id,
    jsonb_build_object('role', v_invite.role)
  );

  RETURN jsonb_build_object(
    'success', true,
    'association_id', v_invite.association_id,
    'role', v_invite.role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_association_dashboard(
  p_association_id uuid,
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_association public.associations;
  v_role text;
  v_days integer := greatest(1, least(COALESCE(p_days, 7), 90));
  v_teams jsonb;
  v_totals jsonb;
BEGIN
  IF NOT public.is_association_member(p_association_id, v_user_id) THEN
    RAISE EXCEPTION 'Association access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_association FROM public.associations WHERE id = p_association_id;
  SELECT role INTO v_role FROM public.association_roles
  WHERE association_id = p_association_id AND user_id = v_user_id;

  WITH team_stats AS (
    SELECT
      t.id,
      t.name,
      t.season_label,
      t.age_division,
      t.level,
      t.team_logo_url,
      t.palette_id,
      public.is_team_adult(t.id, v_user_id) AS can_open_team,
      (SELECT count(*)::int FROM public.team_memberships tm
        WHERE tm.team_id = t.id AND tm.status = 'active') AS players_count,
      (SELECT count(*)::int FROM public.team_roles tr
        WHERE tr.team_id = t.id) AS staff_count,
      (SELECT count(*)::int
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE pc.team_id = t.id
          AND sc.status = 'complete'
          AND sc.completed_at >= now() - make_interval(days => v_days)) AS sessions_count,
      (SELECT count(DISTINCT sc.player_id)::int
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE pc.team_id = t.id
          AND sc.status = 'complete'
          AND sc.completed_at >= now() - make_interval(days => v_days)) AS active_players_count,
      (SELECT COALESCE(sum(tc.shots_logged), 0)::bigint
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        JOIN public.practice_cards pc ON pc.id = pt.practice_card_id
        WHERE pc.team_id = t.id
          AND tc.completed = true
          AND tc.completed_at >= now() - make_interval(days => v_days)) AS shots_count,
      EXISTS (
        SELECT 1 FROM public.practice_cards pc
        WHERE pc.team_id = t.id
          AND pc.published_at IS NOT NULL
          AND pc.date >= current_date
          AND pc.date < current_date + 7
      ) AS has_published_week
    FROM public.association_teams at
    JOIN public.teams t ON t.id = at.team_id
    WHERE at.association_id = p_association_id
  )
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'season_label', season_label,
        'age_division', age_division,
        'level', level,
        'team_logo_url', team_logo_url,
        'palette_id', palette_id,
        'can_open_team', can_open_team,
        'players_count', players_count,
        'staff_count', staff_count,
        'sessions_count', sessions_count,
        'active_players_count', active_players_count,
        'shots_count', shots_count,
        'has_published_week', has_published_week,
        'adoption_percent', CASE
          WHEN players_count = 0 THEN 0
          ELSE least(100, round((active_players_count::numeric / players_count::numeric) * 100))::int
        END
      ) ORDER BY name
    ), '[]'::jsonb),
    jsonb_build_object(
      'teams_count', count(*)::int,
      'players_count', COALESCE(sum(players_count), 0)::int,
      'active_players_count', COALESCE(sum(active_players_count), 0)::int,
      'sessions_count', COALESCE(sum(sessions_count), 0)::int,
      'shots_count', COALESCE(sum(shots_count), 0)::bigint,
      'teams_with_plan_count', count(*) FILTER (WHERE has_published_week)::int
    )
  INTO v_teams, v_totals
  FROM team_stats;

  RETURN jsonb_build_object(
    'association', jsonb_build_object(
      'id', v_association.id,
      'name', v_association.name,
      'slug', v_association.slug,
      'season_label', v_association.season_label,
      'region', v_association.region,
      'status', v_association.status
    ),
    'current_user_role', v_role,
    'window_days', v_days,
    'totals', v_totals,
    'teams', v_teams
  );
END;
$$;

-- Explicit grants for association RPCs. The public preview reveals only the
-- organization name and offered role; redemption remains email-bound.
REVOKE ALL ON FUNCTION public.is_association_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_association_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_association(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_team_with_owner(text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_team_to_association(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_team_from_association(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_association_invite(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_association_invite(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_association_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_association_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_association_dashboard(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_association_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_association_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_association(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_with_owner(text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_team_to_association(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_from_association(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_association_invite(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_association_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_association_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_association_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_association_dashboard(uuid, integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Guardian consent and communication preferences
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL DEFAULT '2026-09-12',
  terms_version text NOT NULL DEFAULT '2026-09-12',
  relationship_confirmed boolean NOT NULL DEFAULT false,
  photo_sharing_allowed boolean NOT NULL DEFAULT false,
  ai_personalization_allowed boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, guardian_user_id),
  CHECK ((relationship_confirmed AND consented_at IS NOT NULL) OR (NOT relationship_confirmed))
);

CREATE TABLE public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_invites boolean NOT NULL DEFAULT true,
  weekly_coach_digest boolean NOT NULL DEFAULT true,
  player_weekly_progress boolean NOT NULL DEFAULT true,
  product_updates boolean NOT NULL DEFAULT false,
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_player_consents_updated_at
  BEFORE UPDATE ON public.player_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.player_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.player_consents FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_preferences FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_consents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_preferences TO authenticated;

CREATE POLICY "Guardians can view their consent records"
ON public.player_consents FOR SELECT TO authenticated
USING (
  guardian_user_id = (SELECT auth.uid())
  AND public.is_player_guardian(player_id, (SELECT auth.uid()))
);

CREATE POLICY "Guardians can record their consent"
ON public.player_consents FOR INSERT TO authenticated
WITH CHECK (
  guardian_user_id = (SELECT auth.uid())
  AND public.is_player_guardian(player_id, (SELECT auth.uid()))
);

CREATE POLICY "Guardians can update their consent"
ON public.player_consents FOR UPDATE TO authenticated
USING (
  guardian_user_id = (SELECT auth.uid())
  AND public.is_player_guardian(player_id, (SELECT auth.uid()))
)
WITH CHECK (
  guardian_user_id = (SELECT auth.uid())
  AND public.is_player_guardian(player_id, (SELECT auth.uid()))
);

CREATE POLICY "Users can view their email preferences"
ON public.email_preferences FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create their email preferences"
ON public.email_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their email preferences"
ON public.email_preferences FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.create_managed_player(
  p_first_name text,
  p_birth_year integer,
  p_last_initial text DEFAULT NULL,
  p_shoots text DEFAULT 'unknown',
  p_jersey_number text DEFAULT NULL,
  p_fav_nhl_city text DEFAULT NULL,
  p_fav_nhl_player text DEFAULT NULL,
  p_hockey_love text DEFAULT NULL,
  p_season_goals text DEFAULT NULL,
  p_photo_sharing_allowed boolean DEFAULT false,
  p_ai_personalization_allowed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_player_id uuid;
  v_first_name text := trim(p_first_name);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_first_name) < 1 OR char_length(v_first_name) > 50 THEN
    RAISE EXCEPTION 'First name must be between 1 and 50 characters' USING ERRCODE = '22023';
  END IF;
  IF p_birth_year < 1900 OR p_birth_year > extract(year FROM current_date)::integer THEN
    RAISE EXCEPTION 'Birth year is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_shoots NOT IN ('left', 'right', 'unknown') THEN
    RAISE EXCEPTION 'Shooting side is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.players (
    owner_user_id, first_name, last_initial, birth_year, shoots,
    jersey_number, fav_nhl_city, fav_nhl_player, hockey_love, season_goals
  ) VALUES (
    v_user_id,
    v_first_name,
    NULLIF(left(trim(p_last_initial), 1), ''),
    p_birth_year,
    p_shoots,
    NULLIF(left(trim(p_jersey_number), 3), ''),
    NULLIF(left(trim(p_fav_nhl_city), 50), ''),
    NULLIF(left(trim(p_fav_nhl_player), 100), ''),
    NULLIF(left(trim(p_hockey_love), 500), ''),
    NULLIF(left(trim(p_season_goals), 500), '')
  ) RETURNING id INTO v_player_id;

  INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
  VALUES (v_player_id, v_user_id, 'owner');

  INSERT INTO public.player_consents (
    player_id,
    guardian_user_id,
    relationship_confirmed,
    photo_sharing_allowed,
    ai_personalization_allowed,
    consented_at
  ) VALUES (
    v_player_id,
    v_user_id,
    true,
    COALESCE(p_photo_sharing_allowed, false),
    COALESCE(p_ai_personalization_allowed, false),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'player_id', v_player_id,
    'first_name', v_first_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_managed_player(text, integer, text, text, text, text, text, text, text, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_managed_player(text, integer, text, text, text, text, text, text, text, boolean, boolean)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.unsubscribe_email(
  p_token text,
  p_kind text DEFAULT 'all_optional'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF p_kind NOT IN ('weekly_coach_digest', 'player_weekly_progress', 'product_updates', 'all_optional') THEN
    RETURN false;
  END IF;

  UPDATE public.email_preferences
  SET
    weekly_coach_digest = CASE WHEN p_kind IN ('weekly_coach_digest', 'all_optional') THEN false ELSE weekly_coach_digest END,
    player_weekly_progress = CASE WHEN p_kind IN ('player_weekly_progress', 'all_optional') THEN false ELSE player_weekly_progress END,
    product_updates = CASE WHEN p_kind IN ('product_updates', 'all_optional') THEN false ELSE product_updates END,
    updated_at = now()
  WHERE unsubscribe_token::text = p_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.unsubscribe_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_email(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Production error telemetry (sanitized UI errors only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.client_error_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  route text NOT NULL CHECK (char_length(route) <= 500),
  message text NOT NULL CHECK (char_length(message) <= 500),
  component_stack text CHECK (component_stack IS NULL OR char_length(component_stack) <= 2000),
  release text CHECK (release IS NULL OR char_length(release) <= 100),
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_error_events_created_idx ON public.client_error_events (created_at DESC);
ALTER TABLE public.client_error_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_error_events FROM anon, authenticated;
GRANT INSERT ON TABLE public.client_error_events TO authenticated;

CREATE POLICY "Signed-in users can report their own UI errors"
ON public.client_error_events FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Private player, coach-avatar, and team-photo media
-- ---------------------------------------------------------------------------

UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'player-photos';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media', 'profile-media', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
), (
  'team-private-media', 'team-private-media', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Player photos are publicly accessible" ON storage.objects;

CREATE POLICY "Authorized adults can view player photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'player-photos'
  AND (
    public.is_player_guardian(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships tm
      WHERE tm.player_id = ((storage.foldername(name))[1])::uuid
        AND tm.status = 'active'
        AND public.is_team_adult(tm.team_id, (SELECT auth.uid()))
    )
  )
);

CREATE POLICY "Guardians can upload player photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'player-photos'
  AND public.is_player_guardian(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
);

CREATE POLICY "Guardians can update player photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'player-photos'
  AND public.is_player_guardian(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'player-photos'
  AND public.is_player_guardian(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
);

CREATE POLICY "Guardians can delete player photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'player-photos'
  AND public.is_player_guardian(((storage.foldername(name))[1])::uuid, (SELECT auth.uid()))
);

CREATE POLICY "Signed-in users can view profile media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-media');

CREATE POLICY "Users can upload their private profile media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update their private profile media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete their private profile media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-media'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

CREATE POLICY "Team families can view private team photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'team-private-media'
  AND (
    public.is_team_adult(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
    OR public.is_guardian_of_team_player(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
  )
);

CREATE POLICY "Team adults can upload private team photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-private-media'
  AND (storage.foldername(name))[1] = 'teams'
  AND public.is_team_adult(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
);

CREATE POLICY "Team adults can update private team photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-private-media'
  AND public.is_team_adult(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'team-private-media'
  AND public.is_team_adult(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
);

CREATE POLICY "Team adults can delete private team photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'team-private-media'
  AND public.is_team_adult(((storage.foldername(name))[2])::uuid, (SELECT auth.uid()))
);

-- Keep new public tables closed by default; future access is opt-in.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Invite privacy and roster authorization
-- ---------------------------------------------------------------------------

-- A token is a credential. Invite rows must never be enumerable through the
-- Data API, even though a holder can preview the single invite via an RPC.
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.player_guardian_invites;
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.team_adult_invites;
DROP POLICY IF EXISTS "Anyone can view invite by token for redemption" ON public.solo_referral_invites;

REVOKE ALL ON TABLE public.player_guardian_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_adult_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.solo_referral_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.teams FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_invites FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_memberships FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.player_guardian_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_adult_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.solo_referral_invites TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_invites TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.team_roles TO authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.team_memberships TO authenticated;

CREATE OR REPLACE FUNCTION public.preview_guardian_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_player record;
BEGIN
  SELECT id, player_id, status, expires_at, invited_email
  INTO v_invite
  FROM public.player_guardian_invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite');
  END IF;

  SELECT first_name, last_initial
  INTO v_player
  FROM public.players
  WHERE id = v_invite.player_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at,
    'player_name', concat_ws(' ', v_player.first_name,
      CASE WHEN v_player.last_initial IS NULL THEN NULL ELSE left(v_player.last_initial, 1) || '.' END),
    'email_domain', split_part(lower(v_invite.invited_email), '@', 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_team_adult_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_team_name text;
BEGIN
  SELECT id, team_id, role, status, expires_at, invited_email
  INTO v_invite
  FROM public.team_adult_invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite');
  END IF;

  SELECT name INTO v_team_name FROM public.teams WHERE id = v_invite.team_id;

  RETURN jsonb_build_object(
    'success', true,
    'team_name', v_team_name,
    'role', v_invite.role,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at,
    'email_domain', split_part(lower(v_invite.invited_email), '@', 2)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.redeem_guardian_invite(text);
CREATE FUNCTION public.redeem_guardian_invite(
  invite_token text,
  p_relationship_confirmed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF p_relationship_confirmed IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guardian confirmation is required');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invite
  FROM public.player_guardian_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  IF lower(trim(COALESCE(v_user_email, ''))) <> lower(trim(v_invite.invited_email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sign in with the email address that received this invitation'
    );
  END IF;

  INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
  VALUES (v_invite.player_id, v_user_id, 'guardian')
  ON CONFLICT (player_id, user_id) DO NOTHING;

  INSERT INTO public.player_consents (
    player_id, guardian_user_id, relationship_confirmed, consented_at, withdrawn_at
  ) VALUES (
    v_invite.player_id, v_user_id, true, now(), NULL
  )
  ON CONFLICT (player_id, guardian_user_id) DO UPDATE SET
    relationship_confirmed = true,
    consented_at = now(),
    withdrawn_at = NULL,
    updated_at = now();

  UPDATE public.player_guardian_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'player_id', v_invite.player_id);
END;
$$;

DROP FUNCTION IF EXISTS public.redeem_team_adult_invite(text);
CREATE FUNCTION public.redeem_team_adult_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_user_id uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invite
  FROM public.team_adult_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  IF lower(trim(COALESCE(v_user_email, ''))) <> lower(trim(v_invite.invited_email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sign in with the email address that received this invitation'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_roles
    WHERE team_id = v_invite.team_id AND user_id = v_user_id
  ) THEN
    UPDATE public.team_adult_invites SET status = 'accepted' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', true, 'team_id', v_invite.team_id, 'already_member', true);
  END IF;

  INSERT INTO public.team_roles (team_id, user_id, role)
  VALUES (v_invite.team_id, v_user_id, v_invite.role);

  UPDATE public.team_adult_invites SET status = 'accepted' WHERE id = v_invite.id;
  RETURN jsonb_build_object('success', true, 'team_id', v_invite.team_id, 'already_member', false);
END;
$$;

-- Roster membership is granted only through a team code or when the current
-- adult already belongs to the team. This closes arbitrary team enrollment.
DROP POLICY IF EXISTS "Guardians can insert memberships via RPC" ON public.team_memberships;
DROP POLICY IF EXISTS "Player owners can insert memberships" ON public.team_memberships;
REVOKE INSERT ON TABLE public.team_memberships FROM authenticated;
REVOKE INSERT ON TABLE public.team_roles FROM authenticated;
REVOKE INSERT ON TABLE public.teams FROM authenticated;

-- Both long links and coach-friendly short codes use the same minimal preview.
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
  SELECT team_id INTO v_invite
  FROM public.team_invites
  WHERE (token = invite_token OR short_code = upper(trim(invite_token)))
    AND status = 'active'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

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

CREATE OR REPLACE FUNCTION public.add_my_player_to_team(p_team_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_membership_id uuid;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RAISE EXCEPTION 'Not authorized for this player' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.is_team_adult(p_team_id, v_user_id)
    OR public.is_guardian_of_team_player(p_team_id, v_user_id)
  ) THEN
    RAISE EXCEPTION 'A team invitation is required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.team_memberships (team_id, player_id, status)
  VALUES (p_team_id, p_player_id, 'active')
  ON CONFLICT (team_id, player_id) DO UPDATE SET status = 'active'
  RETURNING id INTO v_membership_id;

  INSERT INTO public.player_team_preferences (player_id, active_team_id, updated_at)
  VALUES (p_player_id, p_team_id, now())
  ON CONFLICT (player_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'membership_id', v_membership_id, 'team_id', p_team_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_my_player_from_team(p_team_id uuid, p_player_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RAISE EXCEPTION 'Not authorized for this player' USING ERRCODE = '42501';
  END IF;

  UPDATE public.team_memberships
  SET status = 'inactive'
  WHERE team_id = p_team_id AND player_id = p_player_id;

  RETURN FOUND;
END;
$$;

-- Share pages use a token-scoped RPC so referral tokens and unrelated player
-- data cannot be listed from the public table endpoint.
CREATE OR REPLACE FUNCTION public.preview_solo_referral_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_player record;
  v_plan record;
  v_card record;
  v_tasks jsonb := '[]'::jsonb;
BEGIN
  SELECT id, referrer_player_id, share_type, workout_card_id, plan_id,
         expires_at, status
  INTO v_invite
  FROM public.solo_referral_invites
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite');
  END IF;

  SELECT first_name, last_initial INTO v_player
  FROM public.players WHERE id = v_invite.referrer_player_id;

  IF v_invite.plan_id IS NOT NULL THEN
    SELECT id, name, tier, days_per_week, training_focus INTO v_plan
    FROM public.personal_training_plans WHERE id = v_invite.plan_id;
  END IF;

  IF v_invite.workout_card_id IS NOT NULL THEN
    SELECT id, title, date, tier INTO v_card
    FROM public.personal_practice_cards WHERE id = v_invite.workout_card_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'label', label, 'task_type', task_type
    ) ORDER BY sort_order), '[]'::jsonb)
    INTO v_tasks
    FROM public.personal_practice_tasks
    WHERE personal_practice_card_id = v_invite.workout_card_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'share_type', v_invite.share_type,
    'expires_at', v_invite.expires_at,
    'status', v_invite.status,
    'referrer', jsonb_build_object('first_name', v_player.first_name, 'last_initial', v_player.last_initial),
    'plan', CASE WHEN v_plan.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_plan.id, 'name', v_plan.name, 'tier', v_plan.tier,
      'days_per_week', v_plan.days_per_week, 'training_focus', v_plan.training_focus
    ) END,
    'workout', CASE WHEN v_card.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_card.id, 'title', v_card.title, 'date', v_card.date,
      'tier', v_card.tier, 'tasks', v_tasks
    ) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.preview_guardian_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_team_adult_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_guardian_invite(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_team_adult_invite(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_my_player_to_team(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leave_my_player_from_team(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_solo_referral_invite(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.preview_guardian_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_team_adult_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_guardian_invite(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_adult_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_my_player_to_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_my_player_from_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_solo_referral_invite(text) TO anon, authenticated;

-- Solo onboarding is also transactional: no orphaned player or guardian rows
-- when plan creation fails part-way through a weak connection.
CREATE OR REPLACE FUNCTION public.create_solo_player_with_plan(
  p_first_name text,
  p_birth_year integer,
  p_training_focus text[],
  p_days_per_week integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_player_id uuid;
  v_first_name text := trim(p_first_name);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_first_name) < 1 OR char_length(v_first_name) > 50 THEN
    RAISE EXCEPTION 'First name must be between 1 and 50 characters' USING ERRCODE = '22023';
  END IF;
  IF p_birth_year < 1900 OR p_birth_year > extract(year FROM current_date)::integer THEN
    RAISE EXCEPTION 'Birth year is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_days_per_week < 1 OR p_days_per_week > 7 THEN
    RAISE EXCEPTION 'Training days must be between 1 and 7' USING ERRCODE = '22023';
  END IF;
  IF cardinality(p_training_focus) < 1 OR EXISTS (
    SELECT 1 FROM unnest(p_training_focus) focus
    WHERE focus NOT IN ('shooting', 'conditioning', 'mobility', 'skills')
  ) THEN
    RAISE EXCEPTION 'Training focus is invalid' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.players (owner_user_id, first_name, birth_year, shoots)
  VALUES (v_user_id, v_first_name, p_birth_year, 'unknown')
  RETURNING id INTO v_player_id;

  INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
  VALUES (v_player_id, v_user_id, 'owner');

  INSERT INTO public.player_consents (
    player_id, guardian_user_id, relationship_confirmed, consented_at
  ) VALUES (v_player_id, v_user_id, true, now());

  INSERT INTO public.personal_training_plans (
    player_id, name, training_focus, days_per_week, tier, is_active
  ) VALUES (
    v_player_id, 'My Training Plan', p_training_focus, p_days_per_week, 'base', true
  );

  RETURN jsonb_build_object('success', true, 'player_id', v_player_id, 'first_name', v_first_name);
END;
$$;

REVOKE ALL ON FUNCTION public.create_solo_player_with_plan(text, integer, text[], integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_solo_player_with_plan(text, integer, text[], integer)
  TO authenticated;
