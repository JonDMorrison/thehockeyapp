
-- ISSUE 2: Update has_full_access to include team plan purchaser
CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_active_individual_pro(p_user_id)
    OR public.user_is_team_covered(p_user_id)
    OR EXISTS (
      -- Team plan purchaser: created_by_user_id owns the subscription
      SELECT 1 FROM public.team_subscriptions
      WHERE created_by_user_id = p_user_id
        AND status = 'active'
        AND current_period_end > now()
    )
$function$;

-- Also update get_team_coverage_for_user to include purchaser path
CREATE OR REPLACE FUNCTION public.get_team_coverage_for_user(p_user_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, status text, current_period_end timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Path 1: player/guardian on a covered team
  SELECT ts.team_id, t.name, ts.status, ts.current_period_end
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  JOIN public.team_memberships tm ON tm.team_id = ts.team_id AND tm.status = 'active'
  JOIN public.players p ON p.id = tm.player_id
  WHERE ts.status = 'active'
    AND ts.current_period_end > now()
    AND (p.owner_user_id = p_user_id OR EXISTS (
      SELECT 1 FROM public.player_guardians pg
      WHERE pg.player_id = p.id AND pg.user_id = p_user_id
    ))
  UNION
  -- Path 2: purchaser of team plan
  SELECT ts.team_id, t.name, ts.status, ts.current_period_end
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  WHERE ts.created_by_user_id = p_user_id
    AND ts.status = 'active'
    AND ts.current_period_end > now()
  LIMIT 1;
END;
$function$;

-- ISSUE 1: Create get_my_access_status RPC
CREATE OR REPLACE FUNCTION public.get_my_access_status()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
  v_source text := 'none';
  v_team_coverage json := null;
  v_individual json := null;
  v_comp json := null;
  v_is_purchaser boolean := false;
  v_sub record;
  v_tc record;
BEGIN
  -- 1) Compute effective access
  v_has_access := public.has_full_access(v_uid);

  -- 2) Check individual subscription
  SELECT s.status, s.current_period_end, s.plan, s.source, s.comp_reason, s.comp_tag
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = v_uid
    AND s.plan = 'pro'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub IS NOT NULL THEN
    IF v_sub.source = 'comp' AND v_sub.status = 'comped' THEN
      v_comp := json_build_object(
        'expires_at', v_sub.current_period_end
      );
      IF v_has_access THEN v_source := 'comp'; END IF;
    ELSIF v_sub.status IN ('active', 'trialing') THEN
      v_individual := json_build_object(
        'status', v_sub.status,
        'current_period_end', v_sub.current_period_end,
        'plan', v_sub.plan,
        'source', v_sub.source
      );
      IF v_has_access AND v_source = 'none' THEN v_source := 'paid'; END IF;
    END IF;
  END IF;

  -- 3) Check team coverage (player/guardian OR purchaser)
  SELECT ts.team_id, t.name AS team_name, ts.current_period_end, ts.created_by_user_id
  INTO v_tc
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  WHERE ts.status = 'active'
    AND ts.current_period_end > now()
    AND (
      -- purchaser
      ts.created_by_user_id = v_uid
      OR
      -- player/guardian
      EXISTS (
        SELECT 1
        FROM public.team_memberships tm
        JOIN public.players p ON p.id = tm.player_id
        WHERE tm.team_id = ts.team_id AND tm.status = 'active'
          AND (p.owner_user_id = v_uid OR EXISTS (
            SELECT 1 FROM public.player_guardians pg
            WHERE pg.player_id = p.id AND pg.user_id = v_uid
          ))
      )
    )
  LIMIT 1;

  IF v_tc IS NOT NULL THEN
    v_is_purchaser := (v_tc.created_by_user_id = v_uid);
    v_team_coverage := json_build_object(
      'team_id', v_tc.team_id,
      'team_name', v_tc.team_name,
      'current_period_end', v_tc.current_period_end,
      'is_purchaser', v_is_purchaser
    );
    -- Team source takes priority over comp for display
    IF v_has_access AND v_source = 'none' THEN v_source := 'team'; END IF;
    -- If user has paid + team, keep 'paid' as source (collision case)
  END IF;

  RETURN json_build_object(
    'has_full_access', v_has_access,
    'access_source', v_source,
    'team_coverage', v_team_coverage,
    'individual', v_individual,
    'comp', v_comp,
    'is_team_purchaser', v_is_purchaser
  );
END;
$function$;
