
-- =============================================
-- 1) Harden attach_pending_comp trigger
--    - Skip if user already has paid active sub
--    - Ensure idempotency
-- =============================================
CREATE OR REPLACE FUNCTION public.attach_pending_comp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pending RECORD;
  has_paid_active boolean;
BEGIN
  -- Check for pending comp grant matching this user's email
  SELECT * INTO pending
  FROM public.pending_comp_grants
  WHERE lower(email) = lower(NEW.email)
    AND redeemed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF pending IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if user already has a paid active subscription — do NOT overwrite
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id
      AND plan = 'pro'
      AND source = 'paid'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_paid_active;

  IF has_paid_active THEN
    -- Mark pending grant as redeemed but don't overwrite paid sub
    UPDATE public.pending_comp_grants
    SET redeemed_at = now(), redeemed_by_user_id = NEW.user_id
    WHERE id = pending.id;
    RETURN NEW;
  END IF;

  -- Grant comp subscription (upsert by user_id)
  INSERT INTO public.subscriptions (user_id, plan, status, source, current_period_end, comp_reason, comp_tag, comp_granted_by, comp_granted_at, stripe_subscription_id, stripe_customer_id)
  VALUES (
    NEW.user_id,
    'pro',
    'comped',
    'comp',
    now() + (pending.days || ' days')::interval,
    pending.reason,
    pending.tag,
    pending.created_by,
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = 'pro',
    status = 'comped',
    source = 'comp',
    current_period_end = now() + (pending.days || ' days')::interval,
    comp_reason = pending.reason,
    comp_tag = pending.tag,
    comp_granted_by = pending.created_by,
    comp_granted_at = now(),
    revoked_at = NULL,
    revoked_by = NULL,
    updated_at = now();

  -- Grant all entitlements
  INSERT INTO public.entitlements (user_id, can_view_full_history, can_access_programs, can_view_snapshot, can_receive_ai_summary, can_export_reports)
  VALUES (NEW.user_id, true, true, true, true, true)
  ON CONFLICT (user_id) DO UPDATE SET
    can_view_full_history = true,
    can_access_programs = true,
    can_view_snapshot = true,
    can_receive_ai_summary = true,
    can_export_reports = true,
    updated_at = now();

  -- Mark pending grant as redeemed
  UPDATE public.pending_comp_grants
  SET redeemed_at = now(), redeemed_by_user_id = NEW.user_id
  WHERE id = pending.id;

  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_attach_pending_comp ON public.profiles;
CREATE TRIGGER trg_attach_pending_comp
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.attach_pending_comp();

-- =============================================
-- 2) Harden all admin RPCs — use RAISE EXCEPTION 'not_authorized'
-- =============================================

-- am_i_admin: already correct (SECURITY DEFINER, search_path, delegates to is_super_admin)
-- No change needed.

-- get_comp_admin_list: already correct. Re-state for explicit RAISE message.
CREATE OR REPLACE FUNCTION public.get_comp_admin_list(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  plan text,
  status text,
  source text,
  comp_reason text,
  comp_tag text,
  comp_granted_by uuid,
  comp_granted_at timestamptz,
  current_period_end timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    s.user_id,
    p.email,
    p.display_name,
    s.plan,
    s.status,
    s.source,
    s.comp_reason,
    s.comp_tag,
    s.comp_granted_by,
    s.comp_granted_at,
    s.current_period_end,
    s.revoked_at,
    s.revoked_by
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.source = 'comp'
  ORDER BY s.comp_granted_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- get_comp_stats
CREATE OR REPLACE FUNCTION public.get_comp_stats()
RETURNS TABLE(
  active_comp_count bigint,
  grants_last_7d bigint,
  pending_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.subscriptions WHERE source = 'comp' AND status = 'comped' AND revoked_at IS NULL AND current_period_end > now())::bigint,
    (SELECT count(*) FROM public.subscriptions WHERE source = 'comp' AND comp_granted_at > now() - interval '7 days')::bigint,
    (SELECT count(*) FROM public.pending_comp_grants WHERE redeemed_at IS NULL)::bigint;
END;
$function$;

-- get_pending_comp_grants
CREATE OR REPLACE FUNCTION public.get_pending_comp_grants()
RETURNS TABLE(
  id uuid,
  email text,
  reason text,
  tag text,
  days integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT pcg.id, pcg.email, pcg.reason, pcg.tag, pcg.days, pcg.created_at
  FROM public.pending_comp_grants pcg
  WHERE pcg.redeemed_at IS NULL
  ORDER BY pcg.created_at DESC;
END;
$function$;
