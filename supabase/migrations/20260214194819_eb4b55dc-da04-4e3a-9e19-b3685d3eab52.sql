
-- Phase 3: Fix has_entitlement to never deny access for paid/team/comp users
CREATE OR REPLACE FUNCTION public.has_entitlement(p_user_id uuid, p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result boolean;
BEGIN
  -- If user has full access (paid, team, or comp), always grant all Pro flags
  IF public.has_full_access(p_user_id) THEN
    RETURN true;
  END IF;

  -- Otherwise check entitlements table
  EXECUTE format(
    'SELECT %I FROM public.entitlements WHERE user_id = $1',
    p_key
  ) INTO v_result USING p_user_id;
  RETURN COALESCE(v_result, false);
END;
$function$;

-- Phase 4: Debug RPC for current user
CREATE OR REPLACE FUNCTION public.get_my_access_debug()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_ind_pro boolean;
  v_team_covered boolean;
  v_full_access boolean;
  v_sub record;
  v_team_cov record;
  v_ent record;
  v_source text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  v_ind_pro := public.has_active_individual_pro(v_user_id);
  v_team_covered := public.user_is_team_covered(v_user_id);
  v_full_access := public.has_full_access(v_user_id);

  -- Get subscription row
  SELECT plan, status, source, current_period_end, comp_reason, comp_tag, revoked_at
  INTO v_sub FROM public.subscriptions WHERE user_id = v_user_id;

  -- Get team coverage details
  SELECT ts.team_id, t.name as team_name, ts.status, ts.current_period_end
  INTO v_team_cov
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  JOIN public.team_memberships tm ON tm.team_id = ts.team_id AND tm.status = 'active'
  JOIN public.players p ON p.id = tm.player_id
  WHERE ts.status = 'active' AND ts.current_period_end > now()
    AND (p.owner_user_id = v_user_id OR EXISTS (
      SELECT 1 FROM public.player_guardians pg WHERE pg.player_id = p.id AND pg.user_id = v_user_id
    ))
  LIMIT 1;

  -- Get entitlements row
  SELECT can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports, updated_at
  INTO v_ent FROM public.entitlements WHERE user_id = v_user_id;

  -- Derive access source
  IF v_sub IS NOT NULL AND v_sub.source = 'comp' AND v_sub.status = 'comped' AND v_sub.revoked_at IS NULL THEN
    v_source := 'comp';
  ELSIF v_ind_pro THEN
    v_source := 'paid';
  ELSIF v_team_covered THEN
    v_source := 'team';
  ELSE
    v_source := 'none';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'has_active_individual_pro', v_ind_pro,
    'is_team_covered', v_team_covered,
    'team_coverage', CASE WHEN v_team_cov IS NOT NULL THEN jsonb_build_object(
      'team_id', v_team_cov.team_id, 'team_name', v_team_cov.team_name,
      'status', v_team_cov.status, 'expires', v_team_cov.current_period_end
    ) ELSE null END,
    'has_full_access', v_full_access,
    'access_source', v_source,
    'subscription', CASE WHEN v_sub IS NOT NULL THEN jsonb_build_object(
      'plan', v_sub.plan, 'status', v_sub.status, 'source', v_sub.source,
      'current_period_end', v_sub.current_period_end,
      'comp_reason', v_sub.comp_reason, 'comp_tag', v_sub.comp_tag,
      'revoked_at', v_sub.revoked_at
    ) ELSE null END,
    'entitlements', CASE WHEN v_ent IS NOT NULL THEN jsonb_build_object(
      'can_view_full_history', v_ent.can_view_full_history,
      'can_access_programs', v_ent.can_access_programs,
      'can_view_snapshot', v_ent.can_view_snapshot,
      'can_receive_ai_summary', v_ent.can_receive_ai_summary,
      'can_export_reports', v_ent.can_export_reports,
      'updated_at', v_ent.updated_at
    ) ELSE null END
  );
END;
$function$;

-- Admin version: get_user_access_debug
CREATE OR REPLACE FUNCTION public.get_user_access_debug(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_ind_pro boolean;
  v_team_covered boolean;
  v_full_access boolean;
  v_sub record;
  v_team_cov record;
  v_ent record;
  v_source text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Admin gate
  IF NOT public.am_i_admin() THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  v_ind_pro := public.has_active_individual_pro(p_user_id);
  v_team_covered := public.user_is_team_covered(p_user_id);
  v_full_access := public.has_full_access(p_user_id);

  SELECT plan, status, source, current_period_end, comp_reason, comp_tag, revoked_at
  INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id;

  SELECT ts.team_id, t.name as team_name, ts.status, ts.current_period_end
  INTO v_team_cov
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  JOIN public.team_memberships tm ON tm.team_id = ts.team_id AND tm.status = 'active'
  JOIN public.players p ON p.id = tm.player_id
  WHERE ts.status = 'active' AND ts.current_period_end > now()
    AND (p.owner_user_id = p_user_id OR EXISTS (
      SELECT 1 FROM public.player_guardians pg WHERE pg.player_id = p.id AND pg.user_id = p_user_id
    ))
  LIMIT 1;

  SELECT can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports, updated_at
  INTO v_ent FROM public.entitlements WHERE user_id = p_user_id;

  IF v_sub IS NOT NULL AND v_sub.source = 'comp' AND v_sub.status = 'comped' AND v_sub.revoked_at IS NULL THEN
    v_source := 'comp';
  ELSIF v_ind_pro THEN
    v_source := 'paid';
  ELSIF v_team_covered THEN
    v_source := 'team';
  ELSE
    v_source := 'none';
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'has_active_individual_pro', v_ind_pro,
    'is_team_covered', v_team_covered,
    'team_coverage', CASE WHEN v_team_cov IS NOT NULL THEN jsonb_build_object(
      'team_id', v_team_cov.team_id, 'team_name', v_team_cov.team_name,
      'status', v_team_cov.status, 'expires', v_team_cov.current_period_end
    ) ELSE null END,
    'has_full_access', v_full_access,
    'access_source', v_source,
    'subscription', CASE WHEN v_sub IS NOT NULL THEN jsonb_build_object(
      'plan', v_sub.plan, 'status', v_sub.status, 'source', v_sub.source,
      'current_period_end', v_sub.current_period_end,
      'comp_reason', v_sub.comp_reason, 'comp_tag', v_sub.comp_tag,
      'revoked_at', v_sub.revoked_at
    ) ELSE null END,
    'entitlements', CASE WHEN v_ent IS NOT NULL THEN jsonb_build_object(
      'can_view_full_history', v_ent.can_view_full_history,
      'can_access_programs', v_ent.can_access_programs,
      'can_view_snapshot', v_ent.can_view_snapshot,
      'can_receive_ai_summary', v_ent.can_receive_ai_summary,
      'can_export_reports', v_ent.can_export_reports,
      'updated_at', v_ent.updated_at
    ) ELSE null END
  );
END;
$function$;
