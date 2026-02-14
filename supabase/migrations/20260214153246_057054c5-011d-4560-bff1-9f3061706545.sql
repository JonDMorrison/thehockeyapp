
-- ============================================================
-- notification_log: rate-limiting + idempotency for automated notifications
-- ============================================================
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own log (for debugging), no client writes
CREATE POLICY "Users can view own notification log"
  ON public.notification_log FOR SELECT
  USING (user_id = auth.uid());

-- Indexes for rate-limit queries
CREATE INDEX idx_notification_log_user_type_created 
  ON public.notification_log (user_id, notification_type, created_at DESC);

CREATE INDEX idx_notification_log_idempotency 
  ON public.notification_log (idempotency_key);

-- ============================================================
-- Helper: check_notification_rate_limit
-- Returns true if user has NOT exceeded rate limit for this type
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_notification_rate_limit(
  p_user_id uuid,
  p_notification_type text,
  p_window_hours int DEFAULT 24
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.notification_log
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type
      AND created_at > now() - (p_window_hours || ' hours')::interval
  )
$$;

-- ============================================================
-- Helper: insert_notification_with_log
-- Inserts notification + log entry atomically, returns false if duplicate
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_notification_with_log(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_notification_type text,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Idempotency check
  IF EXISTS (SELECT 1 FROM public.notification_log WHERE idempotency_key = p_idempotency_key) THEN
    RETURN false;
  END IF;

  -- Rate limit check (1 per type per 20 hours)
  IF NOT public.check_notification_rate_limit(p_user_id, p_notification_type, 20) THEN
    RETURN false;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, notification_type, metadata)
  VALUES (p_user_id, p_title, p_message, p_notification_type, p_metadata);

  -- Insert log entry
  INSERT INTO public.notification_log (user_id, notification_type, idempotency_key)
  VALUES (p_user_id, p_notification_type, p_idempotency_key);

  RETURN true;
EXCEPTION WHEN unique_violation THEN
  -- Another concurrent request already inserted
  RETURN false;
END;
$$;
