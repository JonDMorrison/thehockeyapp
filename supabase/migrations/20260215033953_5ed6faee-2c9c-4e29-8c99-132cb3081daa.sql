
-- ── Metrics table for parent weekly summary system ──
CREATE TABLE public.parent_weekly_summary_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(metric_date, metric_name)
);

ALTER TABLE public.parent_weekly_summary_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only read (no client writes — edge functions use service role)
CREATE POLICY "Admins can view metrics"
  ON public.parent_weekly_summary_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_config
      WHERE key = 'admin_user_ids'
      AND value LIKE '%' || auth.uid()::text || '%'
    )
  );

-- ── Daily stats RPC ──
CREATE OR REPLACE FUNCTION public.get_parent_summary_system_stats(
  p_start_date date DEFAULT (CURRENT_DATE - interval '30 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
    'totals', (
      SELECT jsonb_object_agg(metric_name, total_value)
      FROM (
        SELECT metric_name, sum(metric_value) AS total_value
        FROM parent_weekly_summary_metrics
        WHERE metric_date BETWEEN p_start_date AND p_end_date
        GROUP BY metric_name
      ) agg
    ),
    'daily', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', metric_date,
          'metrics', day_metrics
        )
        ORDER BY metric_date DESC
      )
      FROM (
        SELECT metric_date, jsonb_object_agg(metric_name, metric_value) AS day_metrics
        FROM parent_weekly_summary_metrics
        WHERE metric_date BETWEEN p_start_date AND p_end_date
        GROUP BY metric_date
      ) daily
    ),
    'active_parents', (
      SELECT count(DISTINCT user_id)
      FROM parent_weekly_summaries
      WHERE created_at >= (p_end_date - interval '30 days')
    ),
    'churned_parents', (
      SELECT count(DISTINCT user_id)
      FROM parent_weekly_summaries
      WHERE user_id NOT IN (
        SELECT DISTINCT user_id
        FROM parent_weekly_summaries
        WHERE created_at >= (p_end_date - interval '14 days')
      )
      AND created_at >= (p_end_date - interval '60 days')
      AND created_at < (p_end_date - interval '14 days')
    )
  );
$$;
