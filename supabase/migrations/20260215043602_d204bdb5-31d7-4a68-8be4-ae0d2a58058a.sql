
-- ═══ Trigger: auto-invoke send-admin-activity-email for urgent events ═══
-- We use pg_net to call the edge function when an urgent event is logged
CREATE OR REPLACE FUNCTION public.notify_urgent_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.severity = 'urgent' AND NEW.emailed_at IS NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-admin-activity-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object('event_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_urgent_admin_event
  AFTER INSERT ON public.admin_activity_log
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_admin_event();

-- ═══ Log join_team_completed when team_memberships row is inserted ═══
CREATE OR REPLACE FUNCTION public.log_join_team_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_user_id uuid;
  v_team_name text;
BEGIN
  SELECT owner_user_id INTO v_owner_user_id FROM public.players WHERE id = NEW.player_id;
  SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
  
  PERFORM public.log_admin_event(
    'join_team_completed',
    'info',
    v_owner_user_id,
    NEW.team_id,
    NEW.player_id,
    NULL,
    jsonb_build_object('team_name', v_team_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_join_team
  AFTER INSERT ON public.team_memberships
  FOR EACH ROW EXECUTE FUNCTION public.log_join_team_event();
