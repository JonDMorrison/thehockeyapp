-- Phase 3: Program Templates
-- A library of reusable multi-week, per-day task templates that coaches can
-- materialize into draft practice_cards for their team.

CREATE TABLE public.program_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  age_divisions text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  weeks int NOT NULL DEFAULT 1,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates readable by authenticated"
  ON public.program_templates
  FOR SELECT
  TO authenticated
  USING (is_active);

-- ---------------------------------------------------------------------------
-- Seed data
-- `tasks` is a jsonb array of objects:
--   { "day": <1-based absolute day index, 1..weeks*7>,
--     "label": text,
--     "task_type": shooting|conditioning|mobility|recovery|prep|other|video,
--     "target_type": reps|seconds|minutes|none,
--     "target_value": int|null,
--     "shot_type": wrist|snap|slap|backhand|mixed|none,
--     "shots_expected": int|null }
-- Days with no entry = rest.
-- ---------------------------------------------------------------------------

-- (a) U11 Rep In-Season (1 week)
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  'U11 Rep In-Season',
  'A balanced one-week in-season maintenance plan for U11 rep skaters. Mixes daily shot work with quick-feet conditioning, puck skills, and mobility to keep hands and legs sharp between games.',
  ARRAY['U11'],
  ARRAY['Rep','A'],
  1,
  '[
    {"day":1,"label":"Stickhandling","task_type":"other","target_type":"minutes","target_value":10,"shot_type":"none","shots_expected":null},
    {"day":1,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":50},
    {"day":2,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":2,"label":"Backhand shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"backhand","shots_expected":25},
    {"day":3,"label":"Light stretch","task_type":"mobility","target_type":"minutes","target_value":5,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Toe drags","task_type":"other","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":50},
    {"day":5,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":10,"shot_type":"none","shots_expected":null},
    {"day":6,"label":"Shooting accuracy","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":40}
  ]'::jsonb
);

-- (b) 30-Day Shooting Challenge (4 weeks)
-- Daily shots ramp: wk1 25/day, wk2 50/day, wk3 75/day, wk4 100/day.
-- Two rest days per week (Wed = day 3,10,17,24 and Sun = day 7,14,21,28).
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  '30-Day Shooting Challenge',
  'A progressive four-week shooting program that ramps volume each week (25 to 100 shots/day) across all shot types. Two rest days per week keep it sustainable while building a serious shot count.',
  ARRAY['U11','U13','U15','U18'],
  ARRAY['Rep','A','AA','AAA'],
  4,
  '[
    {"day":1,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":25},
    {"day":2,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":25},
    {"day":4,"label":"Backhand shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"backhand","shots_expected":25},
    {"day":5,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":25},
    {"day":6,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":25},
    {"day":8,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":50},
    {"day":9,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":50},
    {"day":11,"label":"Backhand shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"backhand","shots_expected":50},
    {"day":12,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":50},
    {"day":13,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":50},
    {"day":15,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":75},
    {"day":16,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":75},
    {"day":18,"label":"Backhand shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"backhand","shots_expected":75},
    {"day":19,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":75},
    {"day":20,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":75},
    {"day":22,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":100},
    {"day":23,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":100},
    {"day":25,"label":"Backhand shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"backhand","shots_expected":100},
    {"day":26,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":100},
    {"day":27,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":100}
  ]'::jsonb
);

-- (c) U7/U9 Foundations (1 week)
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  'U7/U9 Foundations',
  'Fun fundamentals for the youngest skaters. Short, playful sessions building stickhandling, balance, agility and a first taste of shooting. Low volume by design — keep it positive.',
  ARRAY['U7','U9'],
  ARRAY['House','Rep'],
  1,
  '[
    {"day":1,"label":"Stickhandling fun","task_type":"other","target_type":"minutes","target_value":5,"shot_type":"none","shots_expected":null},
    {"day":2,"label":"Balance & edges","task_type":"conditioning","target_type":"minutes","target_value":5,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Light wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":15},
    {"day":5,"label":"Agility hops","task_type":"conditioning","target_type":"minutes","target_value":5,"shot_type":"none","shots_expected":null},
    {"day":6,"label":"Easy stretch","task_type":"mobility","target_type":"minutes","target_value":4,"shot_type":"none","shots_expected":null}
  ]'::jsonb
);

-- (d) U13 In-Season Maintenance (1 week)
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  'U13 In-Season Maintenance',
  'A moderate one-week routine to keep U13 skaters sharp during the season. Balances shot volume, quick-feet conditioning and mobility without over-loading game weeks.',
  ARRAY['U13'],
  ARRAY['Rep','A','AA'],
  1,
  '[
    {"day":1,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":40},
    {"day":1,"label":"Stickhandling","task_type":"other","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":2,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":10,"shot_type":"none","shots_expected":null},
    {"day":3,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":40},
    {"day":5,"label":"Conditioning intervals","task_type":"conditioning","target_type":"minutes","target_value":12,"shot_type":"none","shots_expected":null},
    {"day":6,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":50}
  ]'::jsonb
);

-- (e) U15/U18 Competitive Off-Season (4 weeks)
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  'U15/U18 Competitive Off-Season',
  'A demanding four-week off-season block for competitive U15 and U18 skaters. Progressive shooting volume paired with conditioning and mobility to build power, capacity and a heavy shot count.',
  ARRAY['U15','U18'],
  ARRAY['A','AA','AAA'],
  4,
  '[
    {"day":1,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":60},
    {"day":1,"label":"Conditioning intervals","task_type":"conditioning","target_type":"minutes","target_value":15,"shot_type":"none","shots_expected":null},
    {"day":2,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":60},
    {"day":2,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":12,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":60},
    {"day":4,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":12,"shot_type":"none","shots_expected":null},
    {"day":6,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":50},
    {"day":8,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":75},
    {"day":8,"label":"Conditioning intervals","task_type":"conditioning","target_type":"minutes","target_value":18,"shot_type":"none","shots_expected":null},
    {"day":9,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":75},
    {"day":9,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":12,"shot_type":"none","shots_expected":null},
    {"day":11,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":75},
    {"day":11,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":14,"shot_type":"none","shots_expected":null},
    {"day":13,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":60},
    {"day":15,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":90},
    {"day":15,"label":"Conditioning intervals","task_type":"conditioning","target_type":"minutes","target_value":20,"shot_type":"none","shots_expected":null},
    {"day":16,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":90},
    {"day":16,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":15,"shot_type":"none","shots_expected":null},
    {"day":18,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":90},
    {"day":18,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":16,"shot_type":"none","shots_expected":null},
    {"day":20,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":70},
    {"day":22,"label":"Wrist shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"wrist","shots_expected":100},
    {"day":22,"label":"Conditioning intervals","task_type":"conditioning","target_type":"minutes","target_value":22,"shot_type":"none","shots_expected":null},
    {"day":23,"label":"Mixed shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"mixed","shots_expected":100},
    {"day":23,"label":"Mobility flow","task_type":"mobility","target_type":"minutes","target_value":15,"shot_type":"none","shots_expected":null},
    {"day":25,"label":"Snap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"snap","shots_expected":100},
    {"day":25,"label":"Quick-feet ladder","task_type":"conditioning","target_type":"minutes","target_value":18,"shot_type":"none","shots_expected":null},
    {"day":27,"label":"Slap shots","task_type":"shooting","target_type":"none","target_value":null,"shot_type":"slap","shots_expected":80}
  ]'::jsonb
);

-- (f) Goalie Basics (1 week)
INSERT INTO public.program_templates (title, description, age_divisions, levels, weeks, tasks)
VALUES (
  'Goalie Basics',
  'A one-week introduction to goalie movement and reactions. Focuses on lateral pushes, reaction drills, butterfly recovery and hip mobility. Off-ice friendly for young keepers.',
  ARRAY['U9','U11','U13'],
  ARRAY['House','Rep','A'],
  1,
  '[
    {"day":1,"label":"Lateral T-pushes","task_type":"conditioning","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":2,"label":"Reaction ball drills","task_type":"other","target_type":"minutes","target_value":10,"shot_type":"none","shots_expected":null},
    {"day":3,"label":"Hip mobility","task_type":"mobility","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":4,"label":"Butterfly recovery","task_type":"other","target_type":"minutes","target_value":10,"shot_type":"none","shots_expected":null},
    {"day":5,"label":"Quick-feet shuffle","task_type":"conditioning","target_type":"minutes","target_value":8,"shot_type":"none","shots_expected":null},
    {"day":6,"label":"Reaction & tracking","task_type":"other","target_type":"minutes","target_value":12,"shot_type":"none","shots_expected":null}
  ]'::jsonb
);
