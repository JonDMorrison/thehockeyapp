
-- Fix 1: Deterministic precedence (paid > comp > team > none) + deterministic team selection
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

  -- 2) Check individual subscription (paid, not comp)
  SELECT s.status, s.current_period_end, s.plan, s.source, s.comp_reason, s.comp_tag
  INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = v_uid
    AND s.plan = 'pro'
    AND s.source != 'comp'
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_sub IS NOT NULL THEN
    v_individual := json_build_object(
      'status', v_sub.status,
      'current_period_end', v_sub.current_period_end,
      'plan', v_sub.plan,
      'source', v_sub.source
    );
    IF v_has_access THEN v_source := 'paid'; END IF;
  END IF;

  -- 3) Check comp (only if not already 'paid')
  IF v_source = 'none' THEN
    SELECT s.status, s.current_period_end, s.plan, s.source
    INTO v_sub
    FROM public.subscriptions s
    WHERE s.user_id = v_uid
      AND s.source = 'comp'
      AND s.status = 'comped'
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_sub IS NOT NULL THEN
      v_comp := json_build_object(
        'expires_at', v_sub.current_period_end
      );
      IF v_has_access THEN v_source := 'comp'; END IF;
    END IF;
  END IF;

  -- 4) Check team coverage (purchaser OR player/guardian) — deterministic: latest expiry first
  SELECT ts.team_id, t.name AS team_name, ts.current_period_end, ts.created_by_user_id
  INTO v_tc
  FROM public.team_subscriptions ts
  JOIN public.teams t ON t.id = ts.team_id
  WHERE ts.status = 'active'
    AND ts.current_period_end > now()
    AND (
      ts.created_by_user_id = v_uid
      OR EXISTS (
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
  ORDER BY ts.current_period_end DESC
  LIMIT 1;

  IF v_tc IS NOT NULL THEN
    v_is_purchaser := (v_tc.created_by_user_id = v_uid);
    v_team_coverage := json_build_object(
      'team_id', v_tc.team_id,
      'team_name', v_tc.team_name,
      'current_period_end', v_tc.current_period_end,
      'is_purchaser', v_is_purchaser
    );
    IF v_has_access AND v_source = 'none' THEN v_source := 'team'; END IF;
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
