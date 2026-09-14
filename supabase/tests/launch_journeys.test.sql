BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(19);

SELECT has_function(
  'public', 'replace_personal_training_program',
  ARRAY['uuid', 'text', 'text', 'integer', 'text[]', 'jsonb'],
  'private programs have one atomic save function'
);
SELECT has_function(
  'public', 'replace_team_practice_card',
  ARRAY['uuid', 'date', 'boolean', 'text', 'text', 'jsonb'],
  'quick assign has one atomic save function'
);
SELECT has_function(
  'public', 'create_team_training_program',
  ARRAY['uuid', 'text', 'date', 'date', 'text', 'integer', 'text[]', 'integer', 'text', 'text', 'jsonb'],
  'multi-week programs have one atomic save function'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.replace_personal_training_program(uuid,text,text,integer,text[],jsonb)', 'EXECUTE'),
  'anonymous users cannot save private programs'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.replace_personal_training_program(uuid,text,text,integer,text[],jsonb)', 'EXECUTE'),
  'authenticated guardians can use the private program function'
);
SELECT is(
  (SELECT permissive FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_cards' AND policyname = 'Private legacy parent cards'),
  'RESTRICTIVE',
  'legacy parent card privacy is a restrictive policy'
);
SELECT is(
  (SELECT permissive FROM pg_policies WHERE schemaname = 'public' AND tablename = 'practice_tasks' AND policyname = 'Private legacy parent tasks'),
  'RESTRICTIVE',
  'legacy parent task privacy is a restrictive policy'
);

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('51111111-1111-1111-1111-111111111111', 'launch-owner@example.com', '{}'::jsonb, '{}'::jsonb),
  ('52222222-2222-2222-2222-222222222222', 'launch-outsider@example.com', '{}'::jsonb, '{}'::jsonb);

INSERT INTO public.players (id, owner_user_id, first_name, birth_year)
VALUES ('5ddddddd-dddd-dddd-dddd-dddddddddddd', '51111111-1111-1111-1111-111111111111', 'Taylor', 2013);
INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
VALUES ('5ddddddd-dddd-dddd-dddd-dddddddddddd', '51111111-1111-1111-1111-111111111111', 'owner');

INSERT INTO public.teams (id, name, created_by_user_id)
VALUES ('5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Launch Test Hawks', '51111111-1111-1111-1111-111111111111');
INSERT INTO public.team_roles (team_id, user_id, role)
VALUES ('5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '51111111-1111-1111-1111-111111111111', 'head_coach');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT lives_ok(
  $$ SELECT public.replace_personal_training_program(
    '5ddddddd-dddd-dddd-dddd-dddddddddddd',
    'Taylor Home Plan', 'rep', 3, ARRAY['shooting'],
    jsonb_build_array(jsonb_build_object(
      'date', (current_date + 1)::text,
      'title', 'Wrist shot day',
      'tasks', jsonb_build_array(jsonb_build_object(
        'label', 'Wrist shots', 'task_type', 'shooting', 'sort_order', 0,
        'target_type', 'reps', 'target_value', 25, 'shot_type', 'wrist',
        'shots_expected', 25, 'is_required', true,
        'video_url', 'https://www.youtube.com/watch?v=sakcM2OYxdI'
      ))
    ))
  ) $$,
  'a guardian can atomically create a private program'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.personal_practice_cards WHERE player_id = '5ddddddd-dddd-dddd-dddd-dddddddddddd'),
  1,
  'private program creates one player-specific card'
);
SELECT is(
  (SELECT video_url FROM public.personal_practice_tasks task
   JOIN public.personal_practice_cards card ON card.id = task.personal_practice_card_id
   WHERE card.player_id = '5ddddddd-dddd-dddd-dddd-dddddddddddd'),
  'https://www.youtube.com/watch?v=sakcM2OYxdI',
  'private program keeps its recommended coaching video'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"52222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT public.replace_personal_training_program(
    '5ddddddd-dddd-dddd-dddd-dddddddddddd', 'Stolen plan', 'rep', 1,
    ARRAY['shooting'], '[]'::jsonb
  ) $$,
  '42501', 'You cannot manage this player',
  'an unrelated account cannot replace a player program'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT lives_ok(
  $$ SELECT public.replace_team_practice_card(
    '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, true, 'rep', 'Launch workout',
    '[{"label":"Wrist shots","task_type":"shooting","sort_order":0,"target_type":"reps","target_value":25,"shot_type":"wrist","shots_expected":25,"is_required":true}]'::jsonb
  ) $$,
  'team staff can atomically publish a quick workout'
);
SELECT throws_ok(
  $$ SELECT public.replace_team_practice_card(
    '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, true, 'rep', 'Broken replacement',
    '[{"label":"Impossible task","task_type":"not-valid","sort_order":0}]'::jsonb
  ) $$,
  '23514',
  NULL,
  'an invalid replacement rolls back instead of erasing the workout'
);
RESET ROLE;

SELECT is(
  (SELECT title FROM public.practice_cards
   WHERE team_id = '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND date = current_date + 1 AND program_source = 'team'),
  'Launch workout',
  'the original card survives a failed replacement'
);
SELECT is(
  (SELECT count(*)::integer FROM public.practice_tasks task
   JOIN public.practice_cards card ON card.id = task.practice_card_id
   WHERE card.team_id = '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND card.date = current_date + 1),
  1,
  'the original task survives a failed replacement'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT lives_ok(
  $$ SELECT public.create_team_training_program(
    '5aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Four Week Focus', current_date + 7, current_date + 35,
    'rep', 3, ARRAY['shooting'], 25, 'team_event', 'Pizza night',
    jsonb_build_array(jsonb_build_object(
      'weekNumber', 1, 'startDate', (current_date + 7)::text,
      'days', jsonb_build_array(jsonb_build_object(
        'date', (current_date + 7)::text, 'title', 'Release day',
        'tasks', jsonb_build_array(jsonb_build_object(
          'label', 'Quick release', 'task_type', 'shooting', 'sort_order', 0,
          'target_type', 'reps', 'target_value', 30, 'shot_type', 'wrist',
          'shots_expected', 30, 'is_required', true,
          'video_url', 'https://www.youtube.com/watch?v=iHHmFJ17m58'
        ))
      ))
    ))
  ) $$,
  'a team program and all nested weeks save atomically'
);
RESET ROLE;

SELECT is(
  (SELECT reward_description FROM public.training_programs WHERE name = 'Four Week Focus'),
  'Pizza night',
  'the selected team reward is retained'
);
SELECT is(
  (SELECT status FROM public.team_week_plans WHERE name = 'Four Week Focus - Week 1'),
  'draft',
  'generated weeks are explicit reviewable drafts'
);
SELECT is(
  (SELECT task.video_url FROM public.team_week_plan_tasks task
   JOIN public.team_week_plan_days day ON day.id = task.team_week_plan_day_id
   JOIN public.team_week_plans plan_row ON plan_row.id = day.team_week_plan_id
   WHERE plan_row.name = 'Four Week Focus - Week 1'),
  'https://www.youtube.com/watch?v=iHHmFJ17m58',
  'generated team tasks retain coaching videos'
);

SELECT * FROM finish();
ROLLBACK;
