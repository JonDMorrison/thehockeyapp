-- Repoint notify_urgent_admin_event() at the new Supabase project.
-- A prior migration (20260215043621) hardcoded the OLD project's URL + anon key
-- (muwlroahtkdylxwguzyr); on this project that fired urgent-admin emails at the
-- wrong project. Use this project's own URL + anon key.
CREATE OR REPLACE FUNCTION public.notify_urgent_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity = 'urgent' AND NEW.emailed_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://xonpnkzkvqxarbxpinhm.supabase.co/functions/v1/send-admin-activity-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvbnBua3prdnF4YXJieHBpbmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODUyNTYsImV4cCI6MjA5Njg2MTI1Nn0.eWq-Kequ-adaZBXQwbZqRk2rtj_HAwvm3GGDQgdeNM0"}'::jsonb,
      body := jsonb_build_object('event_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
