-- Create user privacy settings for widgets and lock screen
CREATE TABLE public.user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lock_screen_show_player_name boolean DEFAULT false,
  lock_screen_show_team_name boolean DEFAULT false,
  allow_lock_screen_actions boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view own privacy settings"
  ON public.user_privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON public.user_privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON public.user_privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create get_today_snapshot function for fast widget data
CREATE OR REPLACE FUNCTION public.get_today_snapshot(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_player record;
  v_team record;
  v_active_team_id uuid;
  v_today date;
  v_game_day_enabled boolean;
  v_mode text;
  v_practice_card record;
  v_completed_count int;
  v_total_required int;
  v_next_task record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is guardian of player
  IF NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this player');
  END IF;

  v_today := CURRENT_DATE;

  -- Get player info
  SELECT id, first_name, last_initial INTO v_player
  FROM public.players
  WHERE id = p_player_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  -- Get active team
  SELECT active_team_id INTO v_active_team_id
  FROM public.player_team_preferences
  WHERE player_id = p_player_id;

  IF v_active_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active team');
  END IF;

  -- Get team info
  SELECT id, name, palette_id INTO v_team
  FROM public.teams
  WHERE id = v_active_team_id;

  -- Check if game day
  SELECT COALESCE(enabled, false) INTO v_game_day_enabled
  FROM public.team_game_days
  WHERE team_id = v_active_team_id AND date = v_today;

  v_mode := CASE WHEN v_game_day_enabled THEN 'game_day' ELSE 'normal' END;

  -- Get practice card (prefer game_day if enabled, fallback to normal)
  IF v_game_day_enabled THEN
    SELECT pc.id, pc.tier, pc.title, pc.mode INTO v_practice_card
    FROM public.practice_cards pc
    WHERE pc.team_id = v_active_team_id 
      AND pc.date = v_today 
      AND pc.mode = 'game_day'
      AND pc.published_at IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_practice_card IS NULL THEN
    SELECT pc.id, pc.tier, pc.title, pc.mode INTO v_practice_card
    FROM public.practice_cards pc
    WHERE pc.team_id = v_active_team_id 
      AND pc.date = v_today 
      AND pc.mode = 'normal'
      AND pc.published_at IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_practice_card IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'player_id', p_player_id,
      'player_display', v_player.first_name || ' ' || COALESCE(v_player.last_initial, ''),
      'team_id', v_active_team_id,
      'team_name', v_team.name,
      'palette_id', v_team.palette_id,
      'date', v_today,
      'mode', v_mode,
      'has_card', false,
      'progress', jsonb_build_object('completed', 0, 'total_required', 0),
      'next_task', null
    );
  END IF;

  -- Count completed required tasks
  SELECT COUNT(*) INTO v_total_required
  FROM public.practice_tasks
  WHERE practice_card_id = v_practice_card.id AND is_required = true;

  SELECT COUNT(*) INTO v_completed_count
  FROM public.practice_tasks pt
  JOIN public.task_completions tc ON tc.practice_task_id = pt.id
  WHERE pt.practice_card_id = v_practice_card.id 
    AND pt.is_required = true
    AND tc.player_id = p_player_id
    AND tc.completed = true;

  -- Get next incomplete required task
  SELECT pt.id, pt.label, pt.task_type, 
    CASE 
      WHEN pt.target_type = 'reps' AND pt.target_value IS NOT NULL THEN pt.target_value || ' reps'
      WHEN pt.target_type = 'seconds' AND pt.target_value IS NOT NULL THEN pt.target_value || 's'
      WHEN pt.target_type = 'minutes' AND pt.target_value IS NOT NULL THEN pt.target_value || ' min'
      ELSE ''
    END as target_display
  INTO v_next_task
  FROM public.practice_tasks pt
  LEFT JOIN public.task_completions tc ON tc.practice_task_id = pt.id AND tc.player_id = p_player_id
  WHERE pt.practice_card_id = v_practice_card.id 
    AND pt.is_required = true
    AND (tc.completed IS NULL OR tc.completed = false)
  ORDER BY pt.sort_order
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'player_display', v_player.first_name || ' ' || COALESCE(v_player.last_initial, ''),
    'team_id', v_active_team_id,
    'team_name', v_team.name,
    'palette_id', v_team.palette_id,
    'date', v_today,
    'mode', v_practice_card.mode,
    'tier', v_practice_card.tier,
    'card_id', v_practice_card.id,
    'has_card', true,
    'progress', jsonb_build_object(
      'completed', v_completed_count,
      'total_required', v_total_required
    ),
    'next_task', CASE WHEN v_next_task.id IS NOT NULL THEN jsonb_build_object(
      'practice_task_id', v_next_task.id,
      'label', v_next_task.label,
      'task_type', v_next_task.task_type,
      'target', v_next_task.target_display
    ) ELSE null END
  );
END;
$$;

-- Create apply_quick_action function for widget actions
CREATE OR REPLACE FUNCTION public.apply_quick_action(
  p_player_id uuid,
  p_action_type text,
  p_local_event_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_active_team_id uuid;
  v_today date;
  v_game_day_enabled boolean;
  v_practice_card record;
  v_next_task record;
  v_now timestamptz;
BEGIN
  v_user_id := auth.uid();
  v_now := now();
  v_today := CURRENT_DATE;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is guardian of player
  IF NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this player');
  END IF;

  -- Check for duplicate event (idempotency)
  IF EXISTS (SELECT 1 FROM public.offline_events WHERE user_id = v_user_id AND local_event_id = p_local_event_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Action already processed');
  END IF;

  -- Get active team
  SELECT active_team_id INTO v_active_team_id
  FROM public.player_team_preferences
  WHERE player_id = p_player_id;

  IF v_active_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active team');
  END IF;

  -- Check if game day
  SELECT COALESCE(enabled, false) INTO v_game_day_enabled
  FROM public.team_game_days
  WHERE team_id = v_active_team_id AND date = v_today;

  -- Get practice card
  IF v_game_day_enabled THEN
    SELECT pc.id INTO v_practice_card
    FROM public.practice_cards pc
    WHERE pc.team_id = v_active_team_id 
      AND pc.date = v_today 
      AND pc.mode = 'game_day'
      AND pc.published_at IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_practice_card IS NULL THEN
    SELECT pc.id INTO v_practice_card
    FROM public.practice_cards pc
    WHERE pc.team_id = v_active_team_id 
      AND pc.date = v_today 
      AND pc.mode = 'normal'
      AND pc.published_at IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_practice_card IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No practice card for today');
  END IF;

  -- Record event for idempotency
  INSERT INTO public.offline_events (user_id, local_event_id, event_type, payload)
  VALUES (v_user_id, p_local_event_id, p_action_type, jsonb_build_object(
    'player_id', p_player_id,
    'practice_card_id', v_practice_card.id
  ));

  CASE p_action_type
    WHEN 'toggle_next_task' THEN
      -- Get next incomplete required task
      SELECT pt.id INTO v_next_task
      FROM public.practice_tasks pt
      LEFT JOIN public.task_completions tc ON tc.practice_task_id = pt.id AND tc.player_id = p_player_id
      WHERE pt.practice_card_id = v_practice_card.id 
        AND pt.is_required = true
        AND (tc.completed IS NULL OR tc.completed = false)
      ORDER BY pt.sort_order
      LIMIT 1;

      IF v_next_task.id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'All tasks already complete');
      END IF;

      -- Mark task complete
      INSERT INTO public.task_completions (
        practice_task_id, player_id, completed, completed_at, completed_by, 
        local_event_id, source, updated_at
      )
      VALUES (
        v_next_task.id, p_player_id, true, v_now, 'widget',
        p_local_event_id, 'quick_action', v_now
      )
      ON CONFLICT (practice_task_id, player_id) DO UPDATE SET
        completed = true,
        completed_at = v_now,
        completed_by = 'widget',
        local_event_id = EXCLUDED.local_event_id,
        source = 'quick_action',
        updated_at = v_now;

      RETURN jsonb_build_object('success', true, 'action', 'task_completed', 'task_id', v_next_task.id);

    WHEN 'complete_session' THEN
      INSERT INTO public.session_completions (
        practice_card_id, player_id, status, completed_at, completed_by,
        local_event_id, source, updated_at
      )
      VALUES (
        v_practice_card.id, p_player_id, 'complete', v_now, 'widget',
        p_local_event_id, 'quick_action', v_now
      )
      ON CONFLICT (practice_card_id, player_id) DO UPDATE SET
        status = 'complete',
        completed_at = v_now,
        completed_by = 'widget',
        local_event_id = EXCLUDED.local_event_id,
        source = 'quick_action',
        updated_at = v_now;

      RETURN jsonb_build_object('success', true, 'action', 'session_completed');

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown action type');
  END CASE;
END;
$$;