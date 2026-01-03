-- Add columns to task_completions for offline sync
ALTER TABLE public.task_completions
ADD COLUMN IF NOT EXISTS local_event_id text,
ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('online','offline_sync')) DEFAULT 'online';

-- Add columns to session_completions for offline sync
ALTER TABLE public.session_completions
ADD COLUMN IF NOT EXISTS local_event_id text,
ADD COLUMN IF NOT EXISTS source text CHECK (source IN ('online','offline_sync')) DEFAULT 'online';

-- Create offline_events table for audit/idempotency
CREATE TABLE public.offline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, local_event_id)
);

-- Enable RLS
ALTER TABLE public.offline_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for offline_events
CREATE POLICY "Users can insert own offline events"
ON public.offline_events FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own offline events"
ON public.offline_events FOR SELECT
USING (user_id = auth.uid());

-- Create the apply_offline_event RPC function
CREATE OR REPLACE FUNCTION public.apply_offline_event(
  p_local_event_id text,
  p_event_type text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_player_id uuid;
  v_practice_task_id uuid;
  v_practice_card_id uuid;
  v_completed boolean;
  v_completed_at timestamptz;
  v_completed_by text;
  v_shots_logged int;
  v_status text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check for duplicate event (idempotency)
  IF EXISTS (SELECT 1 FROM public.offline_events WHERE user_id = v_user_id AND local_event_id = p_local_event_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Event already processed');
  END IF;

  -- Insert event for audit/idempotency tracking
  INSERT INTO public.offline_events (user_id, local_event_id, event_type, payload)
  VALUES (v_user_id, p_local_event_id, p_event_type, p_payload);

  -- Handle different event types
  CASE p_event_type
    WHEN 'task_toggle', 'shots_update' THEN
      v_practice_task_id := (p_payload->>'practice_task_id')::uuid;
      v_player_id := (p_payload->>'player_id')::uuid;
      
      -- Verify user is guardian of player
      IF NOT public.is_player_guardian(v_player_id, v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this player');
      END IF;

      IF p_event_type = 'task_toggle' THEN
        v_completed := (p_payload->>'completed')::boolean;
        v_completed_at := (p_payload->>'completed_at')::timestamptz;
        v_completed_by := COALESCE(p_payload->>'completed_by', 'parent');
        v_shots_logged := COALESCE((p_payload->>'shots_logged')::int, 0);

        INSERT INTO public.task_completions (
          practice_task_id, player_id, completed, completed_at, completed_by, 
          shots_logged, local_event_id, source, updated_at
        )
        VALUES (
          v_practice_task_id, v_player_id, v_completed, v_completed_at, v_completed_by,
          v_shots_logged, p_local_event_id, 'offline_sync', now()
        )
        ON CONFLICT (practice_task_id, player_id) DO UPDATE SET
          completed = EXCLUDED.completed,
          completed_at = EXCLUDED.completed_at,
          completed_by = EXCLUDED.completed_by,
          shots_logged = EXCLUDED.shots_logged,
          local_event_id = EXCLUDED.local_event_id,
          source = EXCLUDED.source,
          updated_at = now();
      ELSE
        -- shots_update
        v_shots_logged := (p_payload->>'shots_logged')::int;

        INSERT INTO public.task_completions (
          practice_task_id, player_id, completed, shots_logged, 
          local_event_id, source, updated_at
        )
        VALUES (
          v_practice_task_id, v_player_id, false, v_shots_logged,
          p_local_event_id, 'offline_sync', now()
        )
        ON CONFLICT (practice_task_id, player_id) DO UPDATE SET
          shots_logged = EXCLUDED.shots_logged,
          local_event_id = EXCLUDED.local_event_id,
          source = EXCLUDED.source,
          updated_at = now();
      END IF;

    WHEN 'session_complete', 'session_partial' THEN
      v_practice_card_id := (p_payload->>'practice_card_id')::uuid;
      v_player_id := (p_payload->>'player_id')::uuid;
      v_status := p_payload->>'status';
      v_completed_at := (p_payload->>'completed_at')::timestamptz;
      v_completed_by := COALESCE(p_payload->>'completed_by', 'parent');
      
      -- Verify user is guardian of player
      IF NOT public.is_player_guardian(v_player_id, v_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this player');
      END IF;

      INSERT INTO public.session_completions (
        practice_card_id, player_id, status, completed_at, completed_by,
        local_event_id, source, updated_at
      )
      VALUES (
        v_practice_card_id, v_player_id, v_status, v_completed_at, v_completed_by,
        p_local_event_id, 'offline_sync', now()
      )
      ON CONFLICT (practice_card_id, player_id) DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        completed_by = EXCLUDED.completed_by,
        local_event_id = EXCLUDED.local_event_id,
        source = EXCLUDED.source,
        updated_at = now();

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown event type');
  END CASE;

  RETURN jsonb_build_object('success', true);
END;
$$;