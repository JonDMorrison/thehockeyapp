
-- Fix the urgent event trigger to use direct URL instead of current_setting
CREATE OR REPLACE FUNCTION public.notify_urgent_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity = 'urgent' AND NEW.emailed_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://muwlroahtkdylxwguzyr.supabase.co/functions/v1/send-admin-activity-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d2xyb2FodGtkeWx4d2d1enlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjY5NjQsImV4cCI6MjA4Mjk0Mjk2NH0._tLahUox88BYOAXbWrj96S9DT-a-p7rgD73HVqTuFo0"}'::jsonb,
      body := jsonb_build_object('event_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
