-- Create the get_team_dashboard_snapshot function
CREATE OR REPLACE FUNCTION public.get_team_dashboard_snapshot(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_team record;
  v_today date;
  v_game_day record;
  v_practice_card record;
  v_preferences_exists boolean;
  v_schedule_exists boolean;
  v_invite_exists boolean;
  v_roster_count int;
  v_active_today int;
  v_sessions_complete int;
  v_total_shots int;
  v_upcoming jsonb;
  v_onboarding record;
  v_game_event record;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is team adult
  IF NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get team info
  SELECT id, name, palette_id, team_logo_url, team_photo_url, season_label
  INTO v_team
  FROM public.teams
  WHERE id = p_team_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Get onboarding state
  SELECT completed, last_step_completed INTO v_onboarding
  FROM public.team_onboarding_state
  WHERE team_id = p_team_id;

  -- Check setup checklist items
  SELECT EXISTS (SELECT 1 FROM public.team_training_preferences WHERE team_id = p_team_id) INTO v_preferences_exists;
  SELECT EXISTS (SELECT 1 FROM public.team_schedule_sources WHERE team_id = p_team_id) INTO v_schedule_exists;
  SELECT EXISTS (SELECT 1 FROM public.team_invites WHERE team_id = p_team_id AND status = 'active') INTO v_invite_exists;
  
  -- Count roster
  SELECT COUNT(*) INTO v_roster_count
  FROM public.team_memberships
  WHERE team_id = p_team_id AND status = 'active';

  -- Get game day status
  SELECT enabled, notes INTO v_game_day
  FROM public.team_game_days
  WHERE team_id = p_team_id AND date = v_today;

  -- Get game event for today if exists
  SELECT event_type, title, start_time, location INTO v_game_event
  FROM public.team_events
  WHERE team_id = p_team_id 
    AND event_type = 'game'
    AND is_cancelled = false
    AND (start_time AT TIME ZONE 'UTC')::date = v_today
  ORDER BY start_time
  LIMIT 1;

  -- Get today's practice card (prefer game_day mode if enabled)
  IF COALESCE(v_game_day.enabled, false) THEN
    SELECT id, title, tier, mode, published_at INTO v_practice_card
    FROM public.practice_cards
    WHERE team_id = p_team_id AND date = v_today AND mode = 'game_day'
    LIMIT 1;
  END IF;

  IF v_practice_card.id IS NULL THEN
    SELECT id, title, tier, mode, published_at INTO v_practice_card
    FROM public.practice_cards
    WHERE team_id = p_team_id AND date = v_today AND mode = 'normal'
    LIMIT 1;
  END IF;

  -- Calculate pulse stats
  IF v_roster_count > 0 THEN
    -- Get player IDs for this team
    WITH team_players AS (
      SELECT player_id FROM public.team_memberships WHERE team_id = p_team_id AND status = 'active'
    ),
    today_cards AS (
      SELECT id FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND published_at IS NOT NULL
    )
    SELECT 
      COUNT(DISTINCT tc.player_id),
      COALESCE(SUM(tc.shots_logged), 0)
    INTO v_active_today, v_total_shots
    FROM public.task_completions tc
    JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
    WHERE pt.practice_card_id IN (SELECT id FROM today_cards)
      AND tc.player_id IN (SELECT player_id FROM team_players)
      AND tc.completed = true;

    -- Count complete sessions
    SELECT COUNT(*) INTO v_sessions_complete
    FROM public.session_completions sc
    WHERE sc.practice_card_id IN (SELECT id FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND published_at IS NOT NULL)
      AND sc.player_id IN (SELECT player_id FROM public.team_memberships WHERE team_id = p_team_id AND status = 'active')
      AND sc.status = 'complete';
  ELSE
    v_active_today := 0;
    v_total_shots := 0;
    v_sessions_complete := 0;
  END IF;

  -- Get upcoming events
  SELECT jsonb_agg(e ORDER BY e.start_time) INTO v_upcoming
  FROM (
    SELECT id, event_type, title, start_time, location
    FROM public.team_events
    WHERE team_id = p_team_id
      AND is_cancelled = false
      AND start_time > now()
    ORDER BY start_time
    LIMIT 5
  ) e;

  RETURN jsonb_build_object(
    'success', true,
    'team', jsonb_build_object(
      'id', v_team.id,
      'name', v_team.name,
      'palette_id', v_team.palette_id,
      'logo_url', v_team.team_logo_url,
      'photo_url', v_team.team_photo_url,
      'season_label', v_team.season_label
    ),
    'onboarding', jsonb_build_object(
      'completed', COALESCE(v_onboarding.completed, false),
      'checklist', jsonb_build_array(
        jsonb_build_object(
          'id', 'set_preferences',
          'label', 'Choose training preferences',
          'done', v_preferences_exists,
          'cta', 'Open'
        ),
        jsonb_build_object(
          'id', 'connect_schedule',
          'label', 'Connect TeamSnap schedule',
          'done', v_schedule_exists,
          'cta', 'Connect'
        ),
        jsonb_build_object(
          'id', 'invite_parents',
          'label', 'Create invite link',
          'done', v_invite_exists,
          'cta', 'Copy link'
        ),
        jsonb_build_object(
          'id', 'add_players',
          'label', 'Add players to roster',
          'done', v_roster_count > 0,
          'cta', 'Invite'
        ),
        jsonb_build_object(
          'id', 'publish_first_card',
          'label', 'Publish today''s practice',
          'done', v_practice_card.published_at IS NOT NULL,
          'cta', 'Publish'
        )
      )
    ),
    'today', jsonb_build_object(
      'date', v_today,
      'mode', CASE WHEN COALESCE(v_game_day.enabled, false) THEN 'game_day' ELSE 'normal' END,
      'game_day', jsonb_build_object(
        'enabled', COALESCE(v_game_day.enabled, false),
        'event_time', CASE WHEN v_game_event.start_time IS NOT NULL THEN to_char(v_game_event.start_time, 'HH12:MI AM') ELSE null END,
        'opponent', v_game_event.title
      ),
      'practice_card', jsonb_build_object(
        'exists', v_practice_card.id IS NOT NULL,
        'published', v_practice_card.published_at IS NOT NULL,
        'card_id', v_practice_card.id,
        'title', v_practice_card.title,
        'tier', v_practice_card.tier,
        'mode', v_practice_card.mode
      )
    ),
    'pulse', jsonb_build_object(
      'players_count', v_roster_count,
      'active_today_count', COALESCE(v_active_today, 0),
      'sessions_complete_today', COALESCE(v_sessions_complete, 0),
      'total_shots_today', COALESCE(v_total_shots, 0)
    ),
    'upcoming', COALESCE(v_upcoming, '[]'::jsonb)
  );
END;
$$;