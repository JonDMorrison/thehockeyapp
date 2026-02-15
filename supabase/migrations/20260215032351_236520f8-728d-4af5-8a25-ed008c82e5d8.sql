
-- Add updated_at column
ALTER TABLE public.parent_week_summaries
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Index on player_id for faster guardian lookups
CREATE INDEX IF NOT EXISTS idx_parent_week_summaries_player_id
  ON public.parent_week_summaries (player_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_parent_week_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_parent_week_summaries_updated_at ON public.parent_week_summaries;
CREATE TRIGGER trg_parent_week_summaries_updated_at
  BEFORE UPDATE ON public.parent_week_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_week_summaries_updated_at();

-- Replace RPC to include updated_at
CREATE OR REPLACE FUNCTION public.get_parent_week_summary(
  p_player_id uuid,
  p_week_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_summary_text text;
  v_stats jsonb;
  v_created_at timestamptz;
  v_updated_at timestamptz;
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

  SELECT pws.summary_text, pws.stats, pws.created_at, pws.updated_at
  INTO v_summary_text, v_stats, v_created_at, v_updated_at
  FROM public.parent_week_summaries pws
  WHERE pws.player_id = p_player_id
    AND pws.week_start = p_week_start
    AND (pws.user_id = v_user_id OR public.is_player_guardian(p_player_id, v_user_id))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No summary found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'summary_text', v_summary_text,
    'stats', v_stats,
    'created_at', v_created_at,
    'updated_at', v_updated_at
  );
END;
$$;
