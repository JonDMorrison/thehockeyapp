-- Create team_schedule_sources table for storing iCal sync configuration
CREATE TABLE public.team_schedule_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  source_type text CHECK (source_type IN ('teamsnap_ical')) NOT NULL,
  ical_url text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  auto_game_day boolean DEFAULT true,
  include_practices boolean DEFAULT true,
  last_synced_at timestamptz,
  sync_status text CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')) DEFAULT 'pending',
  sync_error text,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, source_type)
);

-- Create team_events table for storing synced calendar events
CREATE TABLE public.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  external_event_id text NOT NULL,
  source_type text CHECK (source_type IN ('teamsnap_ical')) NOT NULL,
  event_type text CHECK (event_type IN ('game', 'practice', 'other')) NOT NULL,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  is_cancelled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, source_type, external_event_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_team_events_team_date ON public.team_events(team_id, start_time);
CREATE INDEX idx_team_events_type ON public.team_events(team_id, event_type, start_time);
CREATE INDEX idx_team_schedule_sources_sync ON public.team_schedule_sources(last_synced_at);

-- Enable RLS
ALTER TABLE public.team_schedule_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

-- RLS for team_schedule_sources: team adults only
CREATE POLICY "Team adults can view schedule sources"
  ON public.team_schedule_sources FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create schedule sources"
  ON public.team_schedule_sources FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update schedule sources"
  ON public.team_schedule_sources FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can delete schedule sources"
  ON public.team_schedule_sources FOR DELETE
  USING (is_team_adult(team_id, auth.uid()));

-- RLS for team_events: team adults + guardians of team players (read-only)
CREATE POLICY "Team adults can view team events"
  ON public.team_events FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Guardians can view team events for their player teams"
  ON public.team_events FOR SELECT
  USING (is_guardian_of_team_player(team_id, auth.uid()));

-- Function to check for games today and auto-enable game day
CREATE OR REPLACE FUNCTION public.check_and_enable_game_days()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_source RECORD;
  v_event_date date;
BEGIN
  -- Find all games happening today where auto_game_day is enabled
  FOR v_event IN 
    SELECT te.team_id, te.start_time, tss.timezone
    FROM public.team_events te
    JOIN public.team_schedule_sources tss ON tss.team_id = te.team_id AND tss.source_type = te.source_type
    WHERE te.event_type = 'game'
    AND te.is_cancelled = false
    AND tss.auto_game_day = true
    AND (te.start_time AT TIME ZONE tss.timezone)::date = (now() AT TIME ZONE tss.timezone)::date
  LOOP
    v_event_date := (v_event.start_time AT TIME ZONE v_event.timezone)::date;
    
    -- Insert or update game day for this team/date
    INSERT INTO public.team_game_days (team_id, date, enabled, created_by_user_id, notes)
    SELECT 
      v_event.team_id, 
      v_event_date, 
      true, 
      (SELECT created_by_user_id FROM public.team_schedule_sources WHERE team_id = v_event.team_id LIMIT 1),
      'Auto-enabled from schedule sync'
    ON CONFLICT (team_id, date) DO UPDATE SET
      enabled = true,
      updated_at = now();
  END LOOP;
END;
$$;

-- Add unique constraint to team_game_days if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_game_days_team_id_date_key'
  ) THEN
    ALTER TABLE public.team_game_days ADD CONSTRAINT team_game_days_team_id_date_key UNIQUE (team_id, date);
  END IF;
END $$;