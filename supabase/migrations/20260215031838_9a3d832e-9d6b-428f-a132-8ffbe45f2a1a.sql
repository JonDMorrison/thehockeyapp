
-- Parent Weekly Summary table (completely separate from team summaries)
CREATE TABLE public.parent_week_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  summary_text text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id, week_start)
);

-- RLS: parent-only access, no coach visibility
ALTER TABLE public.parent_week_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own summaries"
ON public.parent_week_summaries
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_player_guardian(player_id, auth.uid())
);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Inserts happen via service role (edge function) only

-- RPC to fetch a parent week summary
CREATE OR REPLACE FUNCTION public.get_parent_week_summary(p_player_id uuid, p_week_start date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify parent/guardian access
  IF NOT public.is_player_owner(p_player_id, v_user_id)
     AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT summary_text, stats, created_at
  INTO v_result
  FROM public.parent_week_summaries
  WHERE player_id = p_player_id
    AND week_start = p_week_start
    AND (user_id = v_user_id OR public.is_player_guardian(p_player_id, v_user_id))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No summary found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'summary_text', v_result.summary_text,
    'stats', v_result.stats,
    'created_at', v_result.created_at
  );
END;
$$;
