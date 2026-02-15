
-- ═══ admin_activity_log ═══
CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  actor_user_id uuid NULL,
  team_id uuid NULL,
  player_id uuid NULL,
  email text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  emailed_at timestamptz NULL,
  email_message_id text NULL
);

-- Indexes
CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_admin_activity_log_event_type ON public.admin_activity_log (event_type, created_at DESC);
CREATE INDEX idx_admin_activity_log_unemailed ON public.admin_activity_log (emailed_at) WHERE emailed_at IS NULL;

-- RLS: deny all for anon/auth, service role bypasses RLS automatically
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated roles. Service role bypasses RLS.

-- ═══ admin_digest_runs (idempotency for daily digest) ═══
CREATE TABLE public.admin_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date date NOT NULL UNIQUE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  events_included int NOT NULL DEFAULT 0,
  email_message_id text NULL
);

ALTER TABLE public.admin_digest_runs ENABLE ROW LEVEL SECURITY;
-- No policies = service role only

-- ═══ Severity validation trigger (instead of CHECK constraint) ═══
CREATE OR REPLACE FUNCTION public.validate_admin_activity_severity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity NOT IN ('info', 'important', 'urgent') THEN
    RAISE EXCEPTION 'Invalid severity: %. Must be info, important, or urgent.', NEW.severity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_admin_activity_severity
  BEFORE INSERT OR UPDATE ON public.admin_activity_log
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_activity_severity();

-- ═══ log_admin_event helper function ═══
CREATE OR REPLACE FUNCTION public.log_admin_event(
  p_event_type text,
  p_severity text DEFAULT 'info',
  p_actor uuid DEFAULT NULL,
  p_team uuid DEFAULT NULL,
  p_player uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.admin_activity_log (event_type, severity, actor_user_id, team_id, player_id, email, metadata)
  VALUES (p_event_type, p_severity, p_actor, p_team, p_player, p_email, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- ═══ Signup logging trigger ═══
-- Fires when a new profile is created (which happens on auth signup via handle_new_user)
CREATE OR REPLACE FUNCTION public.log_new_signup_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.log_admin_event(
    'new_signup_parent',
    'info',
    NEW.user_id,
    NULL,
    NULL,
    NEW.email,
    jsonb_build_object('display_name', NEW.display_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_new_signup_event();
