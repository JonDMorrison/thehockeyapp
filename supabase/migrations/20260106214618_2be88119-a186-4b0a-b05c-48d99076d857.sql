-- Create solo_schedule_sources table for player calendar connections
CREATE TABLE public.solo_schedule_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'teamsnap_ical',
  ical_url TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  auto_game_day BOOLEAN DEFAULT true,
  include_practices BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, source_type)
);

-- Create solo_events table for synced calendar events
CREATE TABLE public.solo_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  external_event_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'game', 'practice', 'other'
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, source_type, external_event_id)
);

-- Enable RLS on both tables
ALTER TABLE public.solo_schedule_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for solo_schedule_sources
CREATE POLICY "Players can view their own schedule sources"
ON public.solo_schedule_sources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_schedule_sources.player_id
    AND p.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Players can create their own schedule sources"
ON public.solo_schedule_sources
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_schedule_sources.player_id
    AND p.owner_user_id = auth.uid()
  )
  AND created_by_user_id = auth.uid()
);

CREATE POLICY "Players can update their own schedule sources"
ON public.solo_schedule_sources
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_schedule_sources.player_id
    AND p.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Players can delete their own schedule sources"
ON public.solo_schedule_sources
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_schedule_sources.player_id
    AND p.owner_user_id = auth.uid()
  )
);

-- RLS Policies for solo_events
CREATE POLICY "Players can view their own events"
ON public.solo_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_events.player_id
    AND p.owner_user_id = auth.uid()
  )
);

CREATE POLICY "System can insert events during sync"
ON public.solo_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_events.player_id
    AND p.owner_user_id = auth.uid()
  )
);

CREATE POLICY "System can update events during sync"
ON public.solo_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_events.player_id
    AND p.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Players can delete their own events"
ON public.solo_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = solo_events.player_id
    AND p.owner_user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_solo_schedule_sources_player_id ON public.solo_schedule_sources(player_id);
CREATE INDEX idx_solo_events_player_id ON public.solo_events(player_id);
CREATE INDEX idx_solo_events_start_time ON public.solo_events(start_time);
CREATE INDEX idx_solo_events_event_type ON public.solo_events(event_type);