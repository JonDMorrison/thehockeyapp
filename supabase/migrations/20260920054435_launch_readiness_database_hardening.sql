-- Launch-readiness database hardening.
--
-- This migration preserves the existing access model while addressing the
-- database advisor's actionable findings:
--   * index foreign keys used by joins and cascading deletes;
--   * evaluate auth.uid() once per statement in RLS policies;
--   * combine overlapping permissive policies without changing their OR logic;
--   * enforce authorization inside two SECURITY DEFINER mutation RPCs.

-- Foreign-key indexes -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_ai_generations_team_id
  ON public.ai_generations (team_id);
CREATE INDEX IF NOT EXISTS idx_association_audit_log_actor_user_id
  ON public.association_audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_association_invites_accepted_by_user_id
  ON public.association_invites (accepted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_association_invites_created_by_user_id
  ON public.association_invites (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_association_teams_added_by_user_id
  ON public.association_teams (added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_associations_created_by_user_id
  ON public.associations (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_client_error_events_user_id
  ON public.client_error_events (user_id);
CREATE INDEX IF NOT EXISTS idx_personal_practice_tasks_card_id
  ON public.personal_practice_tasks (personal_practice_card_id);
CREATE INDEX IF NOT EXISTS idx_personal_session_completions_card_id
  ON public.personal_session_completions (personal_practice_card_id);
CREATE INDEX IF NOT EXISTS idx_personal_task_completions_task_id
  ON public.personal_task_completions (personal_practice_task_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_challenge_id
  ON public.player_badges (challenge_id);
CREATE INDEX IF NOT EXISTS idx_player_challenge_progress_challenge_id
  ON public.player_challenge_progress (challenge_id);
CREATE INDEX IF NOT EXISTS idx_player_consents_guardian_user_id
  ON public.player_consents (guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_player_guardian_invites_created_by_user_id
  ON public.player_guardian_invites (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_player_guardian_invites_player_id
  ON public.player_guardian_invites (player_id);
CREATE INDEX IF NOT EXISTS idx_player_guardians_user_id
  ON public.player_guardians (user_id);
CREATE INDEX IF NOT EXISTS idx_player_team_preferences_active_team_id
  ON public.player_team_preferences (active_team_id);
CREATE INDEX IF NOT EXISTS idx_player_week_summaries_team_id
  ON public.player_week_summaries (team_id);
CREATE INDEX IF NOT EXISTS idx_players_owner_user_id
  ON public.players (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_practice_card_id
  ON public.practice_tasks (practice_card_id);
CREATE INDEX IF NOT EXISTS idx_session_photos_player_id
  ON public.session_photos (player_id);
CREATE INDEX IF NOT EXISTS idx_session_photos_practice_card_id
  ON public.session_photos (practice_card_id);
CREATE INDEX IF NOT EXISTS idx_solo_referral_invites_plan_id
  ON public.solo_referral_invites (plan_id);
CREATE INDEX IF NOT EXISTS idx_solo_referral_invites_referrer_player_id
  ON public.solo_referral_invites (referrer_player_id);
CREATE INDEX IF NOT EXISTS idx_team_adult_invites_created_by_user_id
  ON public.team_adult_invites (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_team_adult_invites_team_id
  ON public.team_adult_invites (team_id);
CREATE INDEX IF NOT EXISTS idx_team_cheers_from_player_id
  ON public.team_cheers (from_player_id);
CREATE INDEX IF NOT EXISTS idx_team_cheers_from_user_id
  ON public.team_cheers (from_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_created_by_user_id
  ON public.team_invites (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id
  ON public.team_invites (team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_player_id
  ON public.team_memberships (player_id);
CREATE INDEX IF NOT EXISTS idx_team_roles_user_id
  ON public.team_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_team_week_plan_tasks_day_id
  ON public.team_week_plan_tasks (team_week_plan_day_id);
CREATE INDEX IF NOT EXISTS idx_team_week_plans_program_id
  ON public.team_week_plans (program_id);
CREATE INDEX IF NOT EXISTS idx_team_week_plans_team_id
  ON public.team_week_plans (team_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by_user_id
  ON public.teams (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_team_id
  ON public.training_programs (team_id);
CREATE INDEX IF NOT EXISTS idx_workout_template_tasks_day_id
  ON public.workout_template_tasks (workout_template_day_id);

-- RLS auth-call optimization ------------------------------------------------
-- PostgreSQL can turn (SELECT auth.uid()) into a single InitPlan. Calling
-- auth.uid() directly in a policy can re-evaluate it for every candidate row.
-- Protect already-optimized expressions with a placeholder before replacing
-- the remaining direct calls.

DO $$
DECLARE
  policy_row record;
  roles_sql text;
  using_sql text;
  check_sql text;
  alter_sql text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        COALESCE(qual, '') LIKE '%auth.uid()%'
        OR COALESCE(with_check, '') LIKE '%auth.uid()%'
      )
  LOOP
    SELECT string_agg(quote_ident(role_name), ', ' ORDER BY role_name)
    INTO roles_sql
    FROM unnest(policy_row.roles) AS role_name;

    using_sql := policy_row.qual;
    check_sql := policy_row.with_check;

    IF using_sql IS NOT NULL THEN
      using_sql := replace(using_sql, '( SELECT auth.uid() AS uid)', '__RLS_AUTH_UID_INITPLAN__');
      using_sql := replace(using_sql, 'auth.uid()', '(SELECT auth.uid())');
      using_sql := replace(using_sql, '__RLS_AUTH_UID_INITPLAN__', '(SELECT auth.uid())');
    END IF;

    IF check_sql IS NOT NULL THEN
      check_sql := replace(check_sql, '( SELECT auth.uid() AS uid)', '__RLS_AUTH_UID_INITPLAN__');
      check_sql := replace(check_sql, 'auth.uid()', '(SELECT auth.uid())');
      check_sql := replace(check_sql, '__RLS_AUTH_UID_INITPLAN__', '(SELECT auth.uid())');
    END IF;

    alter_sql := format(
      'ALTER POLICY %I ON %I.%I TO %s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      roles_sql
    );

    IF using_sql IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', using_sql);
    END IF;
    IF check_sql IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', check_sql);
    END IF;

    EXECUTE alter_sql;
  END LOOP;
END;
$$;

-- Preserve the existing OR semantics while reducing duplicate policy work.
-- Every public-schema group below requires a signed-in user's identity, so the
-- replacement is explicitly scoped to authenticated instead of PUBLIC.

CREATE TEMP TABLE launch_policy_merges (
  schema_name text NOT NULL,
  table_name text NOT NULL,
  command_name text NOT NULL,
  expected_count integer NOT NULL
) ON COMMIT DROP;

INSERT INTO launch_policy_merges (schema_name, table_name, command_name, expected_count)
VALUES
  ('public', 'player_badges', 'SELECT', 2),
  ('public', 'player_challenge_progress', 'SELECT', 2),
  ('public', 'player_week_summaries', 'SELECT', 2),
  ('public', 'players', 'SELECT', 3),
  ('public', 'practice_cards', 'SELECT', 3),
  ('public', 'practice_tasks', 'SELECT', 2),
  ('public', 'session_completions', 'SELECT', 2),
  ('public', 'session_photos', 'SELECT', 2),
  ('public', 'task_completions', 'SELECT', 2),
  ('public', 'team_cheers', 'INSERT', 2),
  ('public', 'team_cheers', 'SELECT', 3),
  ('public', 'team_events', 'SELECT', 2),
  ('public', 'team_game_days', 'SELECT', 2),
  ('public', 'team_goal_contributions', 'SELECT', 3),
  ('public', 'team_memberships', 'SELECT', 4),
  ('public', 'team_settings', 'SELECT', 2),
  ('public', 'team_week_plan_days', 'SELECT', 2),
  ('public', 'team_week_plan_tasks', 'SELECT', 2),
  ('public', 'team_week_plans', 'SELECT', 2),
  ('public', 'team_week_summaries', 'SELECT', 2),
  ('public', 'teams', 'SELECT', 3);

DO $$
DECLARE
  merge_row record;
  source_names text[];
  source_name text;
  using_sql text;
  check_sql text;
  target_name text;
BEGIN
  FOR merge_row IN SELECT * FROM launch_policy_merges
  LOOP
    SELECT
      array_agg(policyname ORDER BY policyname),
      string_agg(format('(%s)', qual), ' OR ' ORDER BY policyname),
      string_agg(format('(%s)', with_check), ' OR ' ORDER BY policyname)
    INTO source_names, using_sql, check_sql
    FROM pg_policies
    WHERE schemaname = merge_row.schema_name
      AND tablename = merge_row.table_name
      AND cmd = merge_row.command_name
      AND permissive = 'PERMISSIVE'
      AND (
        roles = ARRAY['public']::name[]
        OR (
          merge_row.table_name = 'teams'
          AND merge_row.command_name = 'SELECT'
          AND roles = ARRAY['authenticated']::name[]
        )
      );

    IF cardinality(source_names) IS DISTINCT FROM merge_row.expected_count THEN
      RAISE EXCEPTION
        'Policy merge safety check failed for %.% %: expected %, found %',
        merge_row.schema_name,
        merge_row.table_name,
        merge_row.command_name,
        merge_row.expected_count,
        cardinality(source_names);
    END IF;

    FOREACH source_name IN ARRAY source_names
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON %I.%I',
        source_name,
        merge_row.schema_name,
        merge_row.table_name
      );
    END LOOP;

    target_name := format('Authenticated %s access paths', lower(merge_row.command_name));

    IF merge_row.command_name = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (%s)',
        target_name,
        merge_row.schema_name,
        merge_row.table_name,
        using_sql
      );
    ELSIF merge_row.command_name = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)',
        target_name,
        merge_row.schema_name,
        merge_row.table_name,
        check_sql
      );
    ELSE
      RAISE EXCEPTION 'Unsupported merge command: %', merge_row.command_name;
    END IF;
  END LOOP;
END;
$$;

-- Storage policies used both PUBLIC and authenticated for the same actions.
-- Public reads remain limited to the intentionally public team-media bucket;
-- all identity-dependent paths are consolidated under authenticated.

DO $$
DECLARE
  command_name text;
  expected_count integer;
  source_names text[];
  source_name text;
  using_sql text;
  check_sql text;
BEGIN
  FOR command_name, expected_count IN
    VALUES ('SELECT', 7), ('INSERT', 6), ('UPDATE', 5), ('DELETE', 6)
  LOOP
    SELECT
      array_agg(policyname ORDER BY policyname),
      string_agg(format('(%s)', qual), ' OR ' ORDER BY policyname)
        FILTER (WHERE qual IS NOT NULL),
      string_agg(format('(%s)', COALESCE(with_check, qual)), ' OR ' ORDER BY policyname)
        FILTER (WHERE COALESCE(with_check, qual) IS NOT NULL)
    INTO source_names, using_sql, check_sql
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = command_name
      AND permissive = 'PERMISSIVE'
      AND roles IN (ARRAY['public']::name[], ARRAY['authenticated']::name[]);

    IF cardinality(source_names) IS DISTINCT FROM expected_count THEN
      RAISE EXCEPTION
        'Storage policy merge safety check failed for %: expected %, found %',
        command_name,
        expected_count,
        cardinality(source_names);
    END IF;

    FOREACH source_name IN ARRAY source_names
    LOOP
      EXECUTE format('DROP POLICY %I ON storage.objects', source_name);
    END LOOP;

    IF command_name = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (%s)',
        'Authenticated users can view allowed media',
        using_sql
      );
    ELSIF command_name = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR INSERT TO authenticated WITH CHECK (%s)',
        'Authenticated users can upload allowed media',
        check_sql
      );
    ELSIF command_name = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
        'Authenticated users can update allowed media',
        using_sql,
        check_sql
      );
    ELSIF command_name = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (%s)',
        'Authenticated users can delete allowed media',
        using_sql
      );
    END IF;
  END LOOP;

  CREATE POLICY "Anonymous users can view public team media"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'team-media');
END;
$$;

-- SECURITY DEFINER authorization -------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_goal_progress(p_goal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_goal record;
  v_total integer := 0;
  v_player record;
  v_player_value integer;
BEGIN
  SELECT * INTO v_goal FROM public.team_goals WHERE id = p_goal_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Goal not found');
  END IF;

  IF v_user_id IS NULL OR NOT public.is_team_adult(v_goal.team_id, v_user_id) THEN
    RAISE EXCEPTION 'Not authorized to refresh this team goal'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.team_goal_contributions WHERE goal_id = p_goal_id;

  FOR v_player IN
    SELECT tm.player_id
    FROM public.team_memberships tm
    WHERE tm.team_id = v_goal.team_id AND tm.status = 'active'
  LOOP
    v_player_value := 0;

    CASE v_goal.goal_type
      WHEN 'sessions' THEN
        SELECT COUNT(*) INTO v_player_value
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = v_player.player_id
          AND sc.status = 'complete'
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;

      WHEN 'shots' THEN
        SELECT COALESCE(SUM(tc.shots_logged), 0) INTO v_player_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        JOIN public.practice_cards pc ON pc.id = pt.practice_card_id
        WHERE tc.player_id = v_player.player_id
          AND pc.date >= v_goal.start_date
          AND pc.date <= v_goal.end_date;

      WHEN 'badges' THEN
        SELECT COUNT(*) INTO v_player_value
        FROM public.player_badges pb
        WHERE pb.player_id = v_player.player_id
          AND pb.awarded_at >= v_goal.start_date
          AND pb.awarded_at <= v_goal.end_date + interval '1 day';

      ELSE
        v_player_value := 0;
    END CASE;

    IF v_player_value > 0 THEN
      INSERT INTO public.team_goal_contributions (goal_id, player_id, contribution_value)
      VALUES (p_goal_id, v_player.player_id, v_player_value);
    END IF;

    v_total := v_total + v_player_value;
  END LOOP;

  IF v_goal.goal_type = 'participation' THEN
    SELECT COUNT(DISTINCT sc.player_id) * 100 / GREATEST(
      (SELECT COUNT(*) FROM public.team_memberships WHERE team_id = v_goal.team_id AND status = 'active'),
      1
    ) INTO v_total
    FROM public.session_completions sc
    JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
    WHERE pc.team_id = v_goal.team_id
      AND sc.status = 'complete'
      AND pc.date >= v_goal.start_date
      AND pc.date <= v_goal.end_date;
  END IF;

  UPDATE public.team_goals
  SET current_value = v_total,
      status = CASE
        WHEN v_total >= target_value THEN 'completed'
        WHEN end_date < CURRENT_DATE AND v_total < target_value THEN 'failed'
        ELSE status
      END,
      completed_at = CASE
        WHEN v_total >= target_value AND completed_at IS NULL THEN now()
        ELSE completed_at
      END,
      updated_at = now()
  WHERE id = p_goal_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_value', v_total,
    'completed', v_total >= v_goal.target_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_player_challenges(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_challenge record;
  v_current_value integer;
  v_badges_awarded integer := 0;
  v_is_opted_in boolean;
  v_team_challenges_enabled boolean;
BEGIN
  IF v_user_id IS NULL OR NOT (
    public.is_player_owner(p_player_id, v_user_id)
    OR public.is_player_guardian(p_player_id, v_user_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to evaluate this player'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(national_challenges_opt_in, false) INTO v_is_opted_in
  FROM public.player_privacy_settings
  WHERE player_id = p_player_id;

  SELECT COALESCE(ts.challenges_enabled, false) INTO v_team_challenges_enabled
  FROM public.player_team_preferences ptp
  LEFT JOIN public.team_settings ts ON ts.team_id = ptp.active_team_id
  WHERE ptp.player_id = p_player_id;

  IF NOT COALESCE(v_is_opted_in, false)
     AND NOT COALESCE(v_team_challenges_enabled, false) THEN
    RETURN jsonb_build_object(
      'success', true,
      'badges_awarded', 0,
      'reason', 'not_opted_in'
    );
  END IF;

  FOR v_challenge IN
    SELECT *
    FROM public.challenges
    WHERE is_active = true
      AND (
        (scope = 'global' AND (
          COALESCE(v_is_opted_in, false)
          OR COALESCE(v_team_challenges_enabled, false)
        ))
        OR (scope = 'team' AND COALESCE(v_team_challenges_enabled, false))
      )
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.player_badges
      WHERE player_id = p_player_id
        AND challenge_id = v_challenge.id
    ) THEN
      CONTINUE;
    END IF;

    CASE v_challenge.metric_type
      WHEN 'total_shots' THEN
        SELECT COALESCE(SUM(shots_logged), 0) INTO v_current_value
        FROM public.task_completions
        WHERE player_id = p_player_id;

      WHEN 'sessions_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions
        WHERE player_id = p_player_id AND status = 'complete';

      WHEN 'game_day_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.session_completions sc
        JOIN public.practice_cards pc ON pc.id = sc.practice_card_id
        WHERE sc.player_id = p_player_id
          AND sc.status = 'complete'
          AND pc.mode = 'game_day';

      WHEN 'prep_tasks_completed' THEN
        SELECT COUNT(*) INTO v_current_value
        FROM public.task_completions tc
        JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
        WHERE tc.player_id = p_player_id
          AND tc.completed = true
          AND pt.task_type = 'prep';

      ELSE
        v_current_value := 0;
    END CASE;

    INSERT INTO public.player_challenge_progress (
      player_id,
      challenge_id,
      current_value,
      updated_at
    )
    VALUES (p_player_id, v_challenge.id, v_current_value, now())
    ON CONFLICT (player_id, challenge_id) DO UPDATE
    SET current_value = GREATEST(player_challenge_progress.current_value, v_current_value),
        updated_at = now();

    IF v_current_value >= v_challenge.target_value THEN
      UPDATE public.player_challenge_progress
      SET completed = true, completed_at = now()
      WHERE player_id = p_player_id
        AND challenge_id = v_challenge.id
        AND completed = false;

      INSERT INTO public.player_badges (player_id, challenge_id)
      VALUES (p_player_id, v_challenge.id)
      ON CONFLICT (player_id, challenge_id) DO NOTHING;

      IF FOUND THEN
        v_badges_awarded := v_badges_awarded + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'badges_awarded', v_badges_awarded);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_goal_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.evaluate_player_challenges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_goal_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_player_challenges(uuid) TO authenticated;
