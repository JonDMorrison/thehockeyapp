BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(21);

SELECT has_table('public', 'associations', 'association workspaces exist');
SELECT has_table('public', 'association_roles', 'association roles exist');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'associations'),
  'association workspaces have RLS enabled'
);
SELECT ok(NOT has_table_privilege('anon', 'public.player_guardian_invites', 'SELECT'), 'guardian invites are not anonymous-listable');
SELECT ok(NOT has_table_privilege('anon', 'public.team_adult_invites', 'SELECT'), 'team staff invites are not anonymous-listable');
SELECT ok(NOT has_table_privilege('anon', 'public.solo_referral_invites', 'SELECT'), 'solo referral invites are not anonymous-listable');
SELECT ok(NOT has_table_privilege('authenticated', 'public.team_roles', 'INSERT'), 'team roles cannot be self-assigned');
SELECT ok(NOT has_table_privilege('authenticated', 'public.team_memberships', 'INSERT'), 'roster rows require an authorized RPC');
SELECT ok(has_function_privilege('anon', 'public.preview_guardian_invite(text)', 'EXECUTE'), 'anonymous users can preview one guardian token');
SELECT ok(NOT has_function_privilege('anon', 'public.redeem_guardian_invite(text,boolean)', 'EXECUTE'), 'anonymous users cannot redeem guardian access');

INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', '{}'::jsonb, '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'staff@example.com', '{}'::jsonb, '{}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'outsider@example.com', '{}'::jsonb, '{}'::jsonb),
  ('44444444-4444-4444-4444-444444444444', 'guardian@example.com', '{}'::jsonb, '{}'::jsonb);

INSERT INTO public.teams (id, name, created_by_user_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Team', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Unrelated Team', '33333333-3333-3333-3333-333333333333');
INSERT INTO public.team_roles (team_id, user_id, role)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'head_coach'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'head_coach');

INSERT INTO public.associations (id, name, slug, created_by_user_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Association', 'test-association', '11111111-1111-1111-1111-111111111111');
INSERT INTO public.association_roles (association_id, user_id, role)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'owner');
INSERT INTO public.association_teams (association_id, team_id, added_by_user_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111');

INSERT INTO public.team_adult_invites (
  team_id, invited_email, role, token, expires_at, created_by_user_id
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'staff@example.com', 'assistant_coach',
  'adult-secret', now() + interval '1 day', '11111111-1111-1111-1111-111111111111'
);

INSERT INTO public.players (id, owner_user_id, first_name, birth_year)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Alex', 2014);
INSERT INTO public.player_guardians (player_id, user_id, guardian_role)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'owner');
INSERT INTO public.player_guardian_invites (
  player_id, invited_email, token, expires_at, created_by_user_id
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd', 'guardian@example.com',
  'guardian-secret', now() + interval '1 day', '11111111-1111-1111-1111-111111111111'
);

SET LOCAL ROLE anon;
SELECT is(
  public.preview_guardian_invite('guardian-secret')->>'player_name',
  'Alex',
  'token preview reveals the intended player only'
);
SELECT ok(
  NOT (public.preview_guardian_invite('guardian-secret') ? 'invited_email'),
  'token preview does not reveal the invited email address'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT public.get_association_dashboard('cccccccc-cccc-cccc-cccc-cccccccccccc', 7) $$,
  '42501', 'Association access required',
  'unrelated users cannot open association reporting'
);
SELECT is(
  (public.redeem_team_adult_invite('adult-secret')->>'success')::boolean,
  false,
  'a team staff invite cannot be redeemed from the wrong email account'
);
SELECT is(
  (public.redeem_guardian_invite('guardian-secret', true)->>'success')::boolean,
  false,
  'a guardian invite cannot be redeemed from the wrong email account'
);

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT lives_ok(
  $$ SELECT public.get_association_dashboard('cccccccc-cccc-cccc-cccc-cccccccccccc', 7) $$,
  'association members can open aggregate reporting'
);

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is(
  (public.redeem_team_adult_invite('adult-secret')->>'success')::boolean,
  true,
  'the invited staff account can redeem its role'
);
RESET ROLE;
SELECT ok(
  EXISTS (SELECT 1 FROM public.team_roles WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND user_id = '22222222-2222-2222-2222-222222222222'),
  'redeeming a staff invite creates the intended team role'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SELECT is(
  (public.redeem_guardian_invite('guardian-secret', true)->>'success')::boolean,
  true,
  'the invited guardian account can accept with explicit confirmation'
);
RESET ROLE;
SELECT ok(
  EXISTS (SELECT 1 FROM public.player_consents
    WHERE player_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
      AND guardian_user_id = '44444444-4444-4444-4444-444444444444'
      AND relationship_confirmed),
  'guardian acceptance records versioned consent'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT public.add_my_player_to_team('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  '42501', 'A team invitation is required',
  'a guardian cannot place a player on an unrelated roster'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
