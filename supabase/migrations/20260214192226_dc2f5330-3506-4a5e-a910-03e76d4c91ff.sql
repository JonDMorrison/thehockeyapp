
-- Update is_super_admin to check against a hardcoded approach using an RPC
-- that edge functions will call, or we store admin emails in a small config table
CREATE TABLE IF NOT EXISTS public.admin_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- No public access - only via SECURITY DEFINER functions

-- Update is_super_admin to read from admin_config table
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_emails text;
  user_email text;
BEGIN
  SELECT value INTO admin_emails FROM public.admin_config WHERE key = 'super_admin_emails';
  IF admin_emails IS NULL OR admin_emails = '' THEN
    RETURN false;
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = p_user_id;
  IF user_email IS NULL THEN
    RETURN false;
  END IF;

  RETURN lower(user_email) = ANY(string_to_array(lower(admin_emails), ','));
END;
$function$;
