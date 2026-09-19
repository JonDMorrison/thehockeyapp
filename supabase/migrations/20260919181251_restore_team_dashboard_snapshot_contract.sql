-- Restore the response contract consumed by src/hooks/useTeamDashboard.ts.
-- A February migration replaced these keys with a legacy shape, which caused
-- valid roster and activity counts to render as empty on the coach dashboard.
CREATE OR REPLACE FUNCTION public.get_team_dashboard_snapshot(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_team record;
  v_onboarding_completed boolean := false;
  v_preferences_exists boolean := false;
  v_schedule_exists boolean := false;
  v_invite_exists boolean := false;
  v_roster_count integer := 0;
  v_game_day_enabled boolean := false;
  v_game_event_time timestamptz;
  v_game_opponent text;
  v_card_id uuid;
  v_card_title text;
  v_card_tier text;
  v_card_mode text;
  v_card_published_at timestamptz;
  v_active_today integer := 0;
  v_sessions_complete integer := 0;
  v_total_shots integer := 0;
  v_upcoming jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_team_adult(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id, name, palette_id, team_logo_url, team_photo_url, season_label
    INTO v_team
    FROM public.teams
   WHERE id = p_team_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team not found');
  END IF;

  SELECT COALESCE((
    SELECT completed
      FROM public.team_onboarding_state
     WHERE team_id = p_team_id
  ), false) INTO v_onboarding_completed;

  SELECT EXISTS (
    SELECT 1 FROM public.team_training_preferences WHERE team_id = p_team_id
  ) INTO v_preferences_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.team_schedule_sources WHERE team_id = p_team_id
  ) INTO v_schedule_exists;

  SELECT EXISTS (
    SELECT 1
      FROM public.team_invites
     WHERE team_id = p_team_id
       AND status = 'active'
       AND expires_at > now()
  ) INTO v_invite_exists;

  SELECT COUNT(*)::integer
    INTO v_roster_count
    FROM public.team_memberships
   WHERE team_id = p_team_id
     AND status = 'active';

  SELECT COALESCE((
    SELECT enabled
      FROM public.team_game_days
     WHERE team_id = p_team_id
       AND date = v_today
  ), false) INTO v_game_day_enabled;

  SELECT start_time, title
    INTO v_game_event_time, v_game_opponent
    FROM public.team_events
   WHERE team_id = p_team_id
     AND event_type = 'game'
     AND is_cancelled = false
     AND (start_time AT TIME ZONE 'UTC')::date = v_today
   ORDER BY start_time
   LIMIT 1;

  IF v_game_day_enabled THEN
    SELECT id, title, tier, mode, published_at
      INTO v_card_id, v_card_title, v_card_tier, v_card_mode, v_card_published_at
      FROM public.practice_cards
     WHERE team_id = p_team_id
       AND date = v_today
       AND mode = 'game_day'
     LIMIT 1;
  END IF;

  IF v_card_id IS NULL THEN
    SELECT id, title, tier, mode, published_at
      INTO v_card_id, v_card_title, v_card_tier, v_card_mode, v_card_published_at
      FROM public.practice_cards
     WHERE team_id = p_team_id
       AND date = v_today
       AND (mode = 'normal' OR mode IS NULL)
     LIMIT 1;
  END IF;

  IF v_roster_count > 0 AND v_card_id IS NOT NULL THEN
    WITH team_players AS (
      SELECT player_id
        FROM public.team_memberships
       WHERE team_id = p_team_id
         AND status = 'active'
    ),
    today_cards AS (
      SELECT id
        FROM public.practice_cards
       WHERE team_id = p_team_id
         AND date = v_today
         AND published_at IS NOT NULL
    )
    SELECT COUNT(DISTINCT tc.player_id)::integer,
           COALESCE(SUM(tc.shots_logged), 0)::integer
      INTO v_active_today, v_total_shots
      FROM public.task_completions tc
      JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
     WHERE pt.practice_card_id IN (SELECT id FROM today_cards)
       AND tc.player_id IN (SELECT player_id FROM team_players)
       AND tc.completed = true;

    SELECT COUNT(*)::integer
      INTO v_sessions_complete
      FROM public.session_completions sc
     WHERE sc.practice_card_id IN (
             SELECT id
               FROM public.practice_cards
              WHERE team_id = p_team_id
                AND date = v_today
                AND published_at IS NOT NULL
           )
       AND sc.player_id IN (
             SELECT player_id
               FROM public.team_memberships
              WHERE team_id = p_team_id
                AND status = 'active'
           )
       AND sc.status = 'complete';
  END IF;

  SELECT COALESCE(jsonb_agg(event_row ORDER BY event_row.start_time), '[]'::jsonb)
    INTO v_upcoming
    FROM (
      SELECT id, event_type, title, start_time, location
        FROM public.team_events
       WHERE team_id = p_team_id
         AND is_cancelled = false
         AND start_time > now()
       ORDER BY start_time
       LIMIT 5
    ) AS event_row;

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
      'completed', v_onboarding_completed,
      'checklist', jsonb_build_array(
        jsonb_build_object('id', 'set_preferences', 'label', 'Choose training preferences', 'done', v_preferences_exists, 'cta', 'Open'),
        jsonb_build_object('id', 'connect_schedule', 'label', 'Connect TeamSnap schedule', 'done', v_schedule_exists, 'cta', 'Connect'),
        jsonb_build_object('id', 'invite_parents', 'label', 'Create invite link', 'done', v_invite_exists, 'cta', 'Copy link'),
        jsonb_build_object('id', 'add_players', 'label', 'Add players to roster', 'done', v_roster_count > 0, 'cta', 'Invite'),
        jsonb_build_object('id', 'publish_first_card', 'label', 'Publish today''s practice', 'done', v_card_published_at IS NOT NULL, 'cta', 'Publish')
      )
    ),
    'today', jsonb_build_object(
      'date', v_today,
      'mode', CASE WHEN v_game_day_enabled THEN 'game_day' ELSE 'normal' END,
      'game_day', jsonb_build_object(
        'enabled', v_game_day_enabled,
        'event_time', CASE WHEN v_game_event_time IS NULL THEN NULL ELSE to_char(v_game_event_time, 'HH12:MI AM') END,
        'opponent', v_game_opponent
      ),
      'practice_card', jsonb_build_object(
        'exists', v_card_id IS NOT NULL,
        'published', v_card_published_at IS NOT NULL,
        'card_id', v_card_id,
        'title', v_card_title,
        'tier', v_card_tier,
        'mode', v_card_mode
      )
    ),
    'pulse', jsonb_build_object(
      'players_count', v_roster_count,
      'active_today_count', v_active_today,
      'sessions_complete_today', v_sessions_complete,
      'total_shots_today', v_total_shots
    ),
    'upcoming', v_upcoming
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_team_dashboard_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_dashboard_snapshot(uuid) TO authenticated;
