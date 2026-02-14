
-- =============================================
-- 1) Create team_subscriptions table
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  max_players integer NOT NULL DEFAULT 24,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only accessible via SECURITY DEFINER functions and service role
-- No direct RLS policies needed (edge functions use service role)

-- Unique constraint: one active subscription per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_subscriptions_team_id ON public.team_subscriptions(team_id);

-- Trigger for updated_at
CREATE TRIGGER update_team_subscriptions_updated_at
  BEFORE UPDATE ON public.team_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2) Update is_pro() to include team plan coverage
-- =============================================
CREATE OR REPLACE FUNCTION public.is_pro(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND plan = 'pro'
      AND (
        -- Paid or trial subscription
        (status = 'active' AND source IN ('paid', 'trial') AND (current_period_end IS NULL OR current_period_end > now()))
        OR
        -- Comped subscription
        (status = 'comped' AND source = 'comp' AND revoked_at IS NULL AND current_period_end > now())
      )
  )
  OR EXISTS (
    -- Team plan: user has a player on a team with active team subscription
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
  );
$function$;

-- =============================================
-- 3) Update sync_entitlements_from_subscription to also check team subs
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_entitlements_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_pro boolean;
BEGIN
  -- Check individual subscription
  v_is_pro := (NEW.plan = 'pro' AND NEW.status = 'active'
               AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()));

  -- Also check comped status
  IF NOT v_is_pro THEN
    v_is_pro := (NEW.plan = 'pro' AND NEW.status = 'comped' AND NEW.source = 'comp'
                 AND NEW.revoked_at IS NULL
                 AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()));
  END IF;

  -- Also check team subscription coverage
  IF NOT v_is_pro THEN
    v_is_pro := EXISTS (
      SELECT 1
      FROM public.team_subscriptions ts
      JOIN public.team_memberships tm ON tm.team_id = ts.team_id AND tm.status = 'active'
      JOIN public.players p ON p.id = tm.player_id
      WHERE ts.status = 'active'
        AND ts.current_period_end > now()
        AND (p.owner_user_id = NEW.user_id OR EXISTS (
          SELECT 1 FROM public.player_guardians pg
          WHERE pg.player_id = p.id AND pg.user_id = NEW.user_id
        ))
    );
  END IF;

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
-- 4) Admin RPC to check team subscription (for Settings display)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_team_coverage_for_user(p_user_id uuid)
RETURNS TABLE(
  team_id uuid,
  team_name text,
  status text,
  current_period_end timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
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
  LIMIT 1;
END;
$function$;
