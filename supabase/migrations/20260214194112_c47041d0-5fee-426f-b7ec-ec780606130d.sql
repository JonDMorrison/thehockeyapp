
-- =============================================
-- PHASE 1: Centralized access logic functions
-- =============================================

-- A) has_active_individual_pro(p_user_id)
CREATE OR REPLACE FUNCTION public.has_active_individual_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
    AND plan = 'pro'
    AND (
      -- Comp access
      (source = 'comp' AND status = 'comped' AND revoked_at IS NULL
       AND (current_period_end IS NULL OR current_period_end > now()))
      OR
      -- Paid/trial access
      (source IN ('paid', 'trial', 'stripe') AND status IN ('active', 'trialing')
       AND current_period_end > now())
    )
  )
$$;

-- B) has_active_team_plan(p_team_id)
CREATE OR REPLACE FUNCTION public.has_active_team_plan(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_subscriptions
    WHERE team_id = p_team_id
    AND status = 'active'
    AND current_period_end > now()
  )
$$;

-- C) user_is_team_covered(p_user_id)
CREATE OR REPLACE FUNCTION public.user_is_team_covered(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_subscriptions ts
    JOIN public.team_memberships tm ON tm.team_id = ts.team_id AND tm.status = 'active'
    JOIN public.players p ON p.id = tm.player_id
    WHERE ts.status = 'active'
      AND ts.current_period_end > now()
      AND (p.owner_user_id = p_user_id OR EXISTS (
        SELECT 1 FROM public.player_guardians pg
        WHERE pg.player_id = p.id AND pg.user_id = p_user_id
      ))
  )
$$;

-- D) has_full_access(p_user_id)
CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_active_individual_pro(p_user_id) OR public.user_is_team_covered(p_user_id)
$$;

-- Update is_pro to delegate to has_full_access
CREATE OR REPLACE FUNCTION public.is_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_full_access(p_user_id)
$$;

-- Update sync_entitlements_from_subscription to use has_full_access
CREATE OR REPLACE FUNCTION public.sync_entitlements_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_pro boolean;
BEGIN
  v_is_pro := public.has_full_access(NEW.user_id);

  INSERT INTO public.entitlements (user_id, can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports, updated_at)
  VALUES (NEW.user_id, v_is_pro, v_is_pro, v_is_pro, v_is_pro, v_is_pro, now())
  ON CONFLICT (user_id) DO UPDATE SET
    can_view_full_history = v_is_pro,
    can_access_programs = v_is_pro,
    can_view_snapshot = v_is_pro,
    can_receive_ai_summary = v_is_pro,
    can_export_reports = v_is_pro,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- =============================================
-- PHASE 2: Team plan cap enforcement trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.enforce_team_plan_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cap int;
  v_active_count int;
BEGIN
  -- Only enforce when status is or becomes 'active'
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Check if team has an active team plan
  SELECT max_players INTO v_cap
  FROM public.team_subscriptions
  WHERE team_id = NEW.team_id
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;

  -- No active plan = no cap to enforce
  IF v_cap IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current active members (excluding this row if it's an update)
  SELECT COUNT(*) INTO v_active_count
  FROM public.team_memberships
  WHERE team_id = NEW.team_id
    AND status = 'active'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_cap THEN
    RAISE EXCEPTION 'team_plan_player_cap_reached'
      USING HINT = 'The team roster has reached its maximum of ' || v_cap || ' players.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach trigger
DROP TRIGGER IF EXISTS enforce_team_plan_cap_trigger ON public.team_memberships;
CREATE TRIGGER enforce_team_plan_cap_trigger
  BEFORE INSERT OR UPDATE OF status, team_id ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_team_plan_cap();
