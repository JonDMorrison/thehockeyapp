
-- ============================================================
-- ROLLBACK: Restore practice_cards to team_id model
-- Recreate personal_* tables, restore RLS & RPCs
-- ============================================================

-- Step 1: Drop ALL new RLS policies created by the previous migration
DROP POLICY IF EXISTS "practice_cards_select" ON public.practice_cards;
DROP POLICY IF EXISTS "practice_cards_insert" ON public.practice_cards;
DROP POLICY IF EXISTS "practice_cards_update" ON public.practice_cards;
DROP POLICY IF EXISTS "practice_cards_delete" ON public.practice_cards;

DROP POLICY IF EXISTS "practice_tasks_select" ON public.practice_tasks;
DROP POLICY IF EXISTS "practice_tasks_insert" ON public.practice_tasks;
DROP POLICY IF EXISTS "practice_tasks_update" ON public.practice_tasks;
DROP POLICY IF EXISTS "practice_tasks_delete" ON public.practice_tasks;

DROP POLICY IF EXISTS "task_completions_select" ON public.task_completions;
DROP POLICY IF EXISTS "task_completions_insert" ON public.task_completions;
DROP POLICY IF EXISTS "task_completions_update" ON public.task_completions;
DROP POLICY IF EXISTS "task_completions_delete" ON public.task_completions;

DROP POLICY IF EXISTS "session_completions_select" ON public.session_completions;
DROP POLICY IF EXISTS "session_completions_insert" ON public.session_completions;
DROP POLICY IF EXISTS "session_completions_update" ON public.session_completions;
DROP POLICY IF EXISTS "session_completions_delete" ON public.session_completions;

DROP POLICY IF EXISTS "session_photos_select" ON public.session_photos;

-- Step 2: Restore team_id on practice_cards
ALTER TABLE public.practice_cards ADD COLUMN team_id uuid;
UPDATE public.practice_cards SET team_id = context_id WHERE context_type = 'team';
-- Remove any solo rows (no data existed)
DELETE FROM public.practice_cards WHERE context_type = 'solo';
ALTER TABLE public.practice_cards ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.practice_cards ADD CONSTRAINT practice_cards_team_id_fkey 
  FOREIGN KEY (team_id) REFERENCES public.teams(id);

-- Drop context columns and indexes
DROP INDEX IF EXISTS idx_practice_cards_context;
DROP INDEX IF EXISTS idx_practice_cards_context_date;
ALTER TABLE public.practice_cards DROP CONSTRAINT IF EXISTS practice_cards_context_type_check;
ALTER TABLE public.practice_cards DROP COLUMN context_type;
ALTER TABLE public.practice_cards DROP COLUMN context_id;
ALTER TABLE public.practice_cards DROP COLUMN program_id;

-- Step 3: Restore original FK constraints (remove CASCADE)
ALTER TABLE public.practice_tasks DROP CONSTRAINT practice_tasks_practice_card_id_fkey;
ALTER TABLE public.practice_tasks ADD CONSTRAINT practice_tasks_practice_card_id_fkey 
  FOREIGN KEY (practice_card_id) REFERENCES public.practice_cards(id);

ALTER TABLE public.session_completions DROP CONSTRAINT session_completions_practice_card_id_fkey;
ALTER TABLE public.session_completions ADD CONSTRAINT session_completions_practice_card_id_fkey 
  FOREIGN KEY (practice_card_id) REFERENCES public.practice_cards(id);

ALTER TABLE public.task_completions DROP CONSTRAINT task_completions_practice_task_id_fkey;
ALTER TABLE public.task_completions ADD CONSTRAINT task_completions_practice_task_id_fkey 
  FOREIGN KEY (practice_task_id) REFERENCES public.practice_tasks(id);

-- Step 4: Recreate personal_* tables
CREATE TABLE public.personal_practice_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text,
  tier text DEFAULT 'base',
  mode text DEFAULT 'solo',
  notes text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.personal_practice_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_practice_card_id uuid NOT NULL REFERENCES public.personal_practice_cards(id) ON DELETE CASCADE,
  label text NOT NULL,
  task_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  shots_expected integer,
  target_value integer,
  target_type text DEFAULT 'none',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.personal_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id),
  personal_practice_task_id uuid NOT NULL REFERENCES public.personal_practice_tasks(id) ON DELETE CASCADE,
  completed boolean DEFAULT true,
  completed_at timestamptz,
  completed_by text,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.personal_session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id),
  personal_practice_card_id uuid NOT NULL REFERENCES public.personal_practice_cards(id) ON DELETE CASCADE,
  status text DEFAULT 'none',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, personal_practice_card_id)
);

-- Step 5: Enable RLS on personal tables
ALTER TABLE public.personal_practice_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_practice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_session_completions ENABLE ROW LEVEL SECURITY;

-- Personal practice cards RLS
CREATE POLICY "Players can view own cards" ON public.personal_practice_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can create own cards" ON public.personal_practice_cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can update own cards" ON public.personal_practice_cards FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can delete own cards" ON public.personal_practice_cards FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);

-- Personal practice tasks RLS
CREATE POLICY "Players can view own tasks" ON public.personal_practice_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.personal_practice_cards ppc JOIN public.players p ON p.id = ppc.player_id WHERE ppc.id = personal_practice_card_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(ppc.player_id, auth.uid())))
);
CREATE POLICY "Players can create own tasks" ON public.personal_practice_tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.personal_practice_cards ppc JOIN public.players p ON p.id = ppc.player_id WHERE ppc.id = personal_practice_card_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(ppc.player_id, auth.uid())))
);
CREATE POLICY "Players can update own tasks" ON public.personal_practice_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.personal_practice_cards ppc JOIN public.players p ON p.id = ppc.player_id WHERE ppc.id = personal_practice_card_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(ppc.player_id, auth.uid())))
);
CREATE POLICY "Players can delete own tasks" ON public.personal_practice_tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.personal_practice_cards ppc JOIN public.players p ON p.id = ppc.player_id WHERE ppc.id = personal_practice_card_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(ppc.player_id, auth.uid())))
);

-- Personal task completions RLS
CREATE POLICY "Players can view own completions" ON public.personal_task_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can create own completions" ON public.personal_task_completions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can delete own completions" ON public.personal_task_completions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);

-- Personal session completions RLS
CREATE POLICY "Players can view own sessions" ON public.personal_session_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can create own sessions" ON public.personal_session_completions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);
CREATE POLICY "Players can update own sessions" ON public.personal_session_completions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND (p.owner_user_id = auth.uid() OR public.is_player_guardian(player_id, auth.uid())))
);

-- Step 6: Restore original practice_cards RLS policies
CREATE POLICY "Team adults can view all practice cards" ON public.practice_cards FOR SELECT USING (
  public.is_team_adult(team_id, auth.uid())
);
CREATE POLICY "Guardians can view published cards for their player teams" ON public.practice_cards FOR SELECT USING (
  published_at IS NOT NULL AND public.is_guardian_of_team_player(team_id, auth.uid())
);
CREATE POLICY "Team adults can create practice cards" ON public.practice_cards FOR INSERT WITH CHECK (
  public.is_team_adult(team_id, auth.uid())
);
CREATE POLICY "Team adults can update practice cards" ON public.practice_cards FOR UPDATE USING (
  public.is_team_adult(team_id, auth.uid())
);
CREATE POLICY "Team adults can delete unpublished cards" ON public.practice_cards FOR DELETE USING (
  public.is_team_adult(team_id, auth.uid())
);
CREATE POLICY "Team members can view published cards" ON public.practice_cards FOR SELECT USING (
  published_at IS NOT NULL AND public.user_has_player_on_team(team_id, auth.uid())
);

-- Restore practice_tasks RLS
CREATE POLICY "Team adults can view all tasks" ON public.practice_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);
CREATE POLICY "Guardians can view tasks for published cards" ON public.practice_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND pc.published_at IS NOT NULL AND public.is_guardian_of_team_player(pc.team_id, auth.uid()))
);
CREATE POLICY "Team adults can create tasks" ON public.practice_tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);
CREATE POLICY "Team adults can update tasks" ON public.practice_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);
CREATE POLICY "Team adults can delete tasks" ON public.practice_tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);

-- Restore task_completions team-adult policy
CREATE POLICY "Team adults can view completions for their team" ON public.task_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practice_tasks pt JOIN public.practice_cards pc ON pc.id = pt.practice_card_id WHERE pt.id = practice_task_id AND public.is_team_adult(pc.team_id, auth.uid()))
);

-- Restore session_completions team-adult policy
CREATE POLICY "Team adults can view session completions for their team" ON public.session_completions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);

-- Restore session_photos team-adult policy
CREATE POLICY "Team adults can view shared photos" ON public.session_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.practice_cards pc WHERE pc.id = practice_card_id AND public.is_team_adult(pc.team_id, auth.uid()))
);

-- Step 7: Restore RPCs to use original table references

-- get_solo_dashboard: uses personal_practice_cards
CREATE OR REPLACE FUNCTION public.get_solo_dashboard(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_player record;
  v_plan record;
  v_today date;
  v_today_card record;
  v_today_status text;
  v_streak jsonb;
  v_recent_workouts jsonb;
  v_week_activity jsonb;
  v_total_workouts int;
  v_total_shots int;
  v_badges_earned int;
  v_badges_total int;
BEGIN
  v_user_id := auth.uid();
  v_today := CURRENT_DATE;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;

  SELECT id, first_name, last_initial, profile_photo_url, owner_user_id INTO v_player FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  IF v_player.owner_user_id != v_user_id AND NOT public.is_player_guardian(p_player_id, v_user_id) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); 
  END IF;

  SELECT id, name, tier, training_focus, days_per_week INTO v_plan 
  FROM public.personal_training_plans WHERE player_id = p_player_id AND is_active = true LIMIT 1;

  -- Today's card from personal_practice_cards
  SELECT ppc.id, ppc.title, ppc.tier, ppc.mode,
    (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id) as task_count,
    (SELECT COUNT(*) FROM public.personal_practice_tasks ppt 
     JOIN public.personal_task_completions ptc ON ptc.personal_practice_task_id = ppt.id 
     WHERE ppt.personal_practice_card_id = ppc.id AND ptc.player_id = p_player_id AND ptc.completed = true) as completed_count
  INTO v_today_card
  FROM public.personal_practice_cards ppc WHERE ppc.player_id = p_player_id AND ppc.date = v_today LIMIT 1;

  IF v_today_card.id IS NULL THEN v_today_status := 'no_workout';
  ELSIF v_today_card.completed_count >= v_today_card.task_count THEN v_today_status := 'complete';
  ELSIF v_today_card.completed_count > 0 THEN v_today_status := 'in_progress';
  ELSE v_today_status := 'not_started'; END IF;

  v_streak := public.calculate_solo_streak(p_player_id);

  SELECT jsonb_agg(w ORDER BY w.date DESC) INTO v_recent_workouts FROM (
    SELECT ppc.id, ppc.title, ppc.date, ppc.tier,
      (SELECT COUNT(*) FROM public.personal_practice_tasks WHERE personal_practice_card_id = ppc.id) as task_count
    FROM public.personal_practice_cards ppc 
    JOIN public.personal_session_completions psc ON psc.personal_practice_card_id = ppc.id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete' ORDER BY ppc.date DESC LIMIT 5
  ) w;

  SELECT jsonb_agg(jsonb_build_object(
    'date', d.date, 
    'has_workout', EXISTS (SELECT 1 FROM public.personal_practice_cards ppc WHERE ppc.player_id = p_player_id AND ppc.date = d.date), 
    'completed', EXISTS (SELECT 1 FROM public.personal_session_completions psc JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id WHERE ppc.player_id = p_player_id AND ppc.date = d.date AND psc.status = 'complete')
  ) ORDER BY d.date)
  INTO v_week_activity FROM (SELECT generate_series(date_trunc('week', v_today)::date, date_trunc('week', v_today)::date + 6, '1 day'::interval)::date as date) d;

  SELECT COUNT(*) INTO v_total_workouts FROM public.personal_session_completions psc 
  JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id 
  WHERE ppc.player_id = p_player_id AND psc.status = 'complete';

  SELECT COALESCE(SUM(ppt.shots_expected), 0) INTO v_total_shots 
  FROM public.personal_task_completions ptc 
  JOIN public.personal_practice_tasks ppt ON ppt.id = ptc.personal_practice_task_id 
  JOIN public.personal_practice_cards ppc ON ppc.id = ppt.personal_practice_card_id 
  WHERE ppc.player_id = p_player_id AND ptc.completed = true;

  SELECT COUNT(*) INTO v_badges_earned FROM public.player_badges WHERE player_id = p_player_id;
  SELECT COUNT(*) INTO v_badges_total FROM public.challenges WHERE is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'player', jsonb_build_object('id', v_player.id, 'first_name', v_player.first_name, 'last_initial', v_player.last_initial, 'photo_url', v_player.profile_photo_url),
    'plan', CASE WHEN v_plan.id IS NOT NULL THEN jsonb_build_object('id', v_plan.id, 'name', v_plan.name, 'tier', v_plan.tier, 'focus', v_plan.training_focus, 'days_per_week', v_plan.days_per_week) ELSE NULL END,
    'today', jsonb_build_object('date', v_today, 'status', v_today_status, 'card_id', v_today_card.id, 'title', v_today_card.title, 'task_count', COALESCE(v_today_card.task_count, 0), 'completed_count', COALESCE(v_today_card.completed_count, 0)),
    'streak', v_streak,
    'recent_workouts', COALESCE(v_recent_workouts, '[]'::jsonb),
    'week_activity', COALESCE(v_week_activity, '[]'::jsonb),
    'stats', jsonb_build_object('total_workouts', v_total_workouts, 'total_shots', v_total_shots, 'badges_earned', v_badges_earned, 'badges_total', v_badges_total)
  );
END;
$function$;

-- calculate_solo_streak: uses personal tables
CREATE OR REPLACE FUNCTION public.calculate_solo_streak(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_current_streak int := 0; v_best_streak int := 0; v_temp_streak int := 0; v_prev_date date := NULL; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ppc.date::date as workout_date 
    FROM public.personal_session_completions psc 
    JOIN public.personal_practice_cards ppc ON ppc.id = psc.personal_practice_card_id
    WHERE ppc.player_id = p_player_id AND psc.status = 'complete' ORDER BY ppc.date DESC
  LOOP
    IF v_prev_date IS NULL THEN
      IF v_rec.workout_date >= CURRENT_DATE - interval '1 day' THEN v_temp_streak := 1; v_current_streak := 1; ELSE v_temp_streak := 1; END IF;
    ELSIF v_prev_date - v_rec.workout_date = 1 THEN
      v_temp_streak := v_temp_streak + 1; IF v_current_streak > 0 THEN v_current_streak := v_temp_streak; END IF;
    ELSE
      IF v_temp_streak > v_best_streak THEN v_best_streak := v_temp_streak; END IF; v_temp_streak := 1; IF v_current_streak > 0 THEN v_current_streak := 0; END IF;
    END IF;
    v_prev_date := v_rec.workout_date;
  END LOOP;
  IF v_temp_streak > v_best_streak THEN v_best_streak := v_temp_streak; END IF;
  RETURN jsonb_build_object('current_streak', v_current_streak, 'best_streak', GREATEST(v_best_streak, v_current_streak));
END;
$function$;

-- get_today_snapshot: uses practice_cards.team_id
CREATE OR REPLACE FUNCTION public.get_today_snapshot(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid; v_player record; v_team record; v_active_team_id uuid; v_today date;
  v_game_day_enabled boolean; v_mode text; v_practice_card record; v_completed_count int;
  v_total_required int; v_next_task record;
BEGIN
  v_user_id := auth.uid(); IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF NOT public.is_player_guardian(p_player_id, v_user_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  v_today := CURRENT_DATE;
  SELECT id, first_name, last_initial INTO v_player FROM public.players WHERE id = p_player_id; IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Player not found'); END IF;
  SELECT active_team_id INTO v_active_team_id FROM public.player_team_preferences WHERE player_id = p_player_id; IF v_active_team_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No active team'); END IF;
  SELECT id, name, palette_id INTO v_team FROM public.teams WHERE id = v_active_team_id;
  SELECT COALESCE(enabled, false) INTO v_game_day_enabled FROM public.team_game_days WHERE team_id = v_active_team_id AND date = v_today;
  v_mode := CASE WHEN v_game_day_enabled THEN 'game_day' ELSE 'normal' END;

  IF v_game_day_enabled THEN 
    SELECT pc.id, pc.tier, pc.title, pc.mode INTO v_practice_card 
    FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'game_day' AND pc.published_at IS NOT NULL LIMIT 1; 
  END IF;
  IF v_practice_card IS NULL THEN 
    SELECT pc.id, pc.tier, pc.title, pc.mode INTO v_practice_card 
    FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'normal' AND pc.published_at IS NOT NULL LIMIT 1; 
  END IF;

  IF v_practice_card IS NULL THEN 
    RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'player_display', v_player.first_name || ' ' || COALESCE(v_player.last_initial, ''), 'team_id', v_active_team_id, 'team_name', v_team.name, 'palette_id', v_team.palette_id, 'date', v_today, 'mode', v_mode, 'has_card', false, 'progress', jsonb_build_object('completed', 0, 'total_required', 0), 'next_task', null); 
  END IF;

  SELECT COUNT(*) INTO v_total_required FROM public.practice_tasks WHERE practice_card_id = v_practice_card.id AND is_required = true;
  SELECT COUNT(*) INTO v_completed_count FROM public.practice_tasks pt JOIN public.task_completions tc ON tc.practice_task_id = pt.id WHERE pt.practice_card_id = v_practice_card.id AND pt.is_required = true AND tc.player_id = p_player_id AND tc.completed = true;
  SELECT pt.id, pt.label, pt.task_type, CASE WHEN pt.target_type = 'reps' AND pt.target_value IS NOT NULL THEN pt.target_value || ' reps' WHEN pt.target_type = 'seconds' AND pt.target_value IS NOT NULL THEN pt.target_value || 's' WHEN pt.target_type = 'minutes' AND pt.target_value IS NOT NULL THEN pt.target_value || ' min' ELSE '' END as target_display INTO v_next_task FROM public.practice_tasks pt LEFT JOIN public.task_completions tc ON tc.practice_task_id = pt.id AND tc.player_id = p_player_id WHERE pt.practice_card_id = v_practice_card.id AND pt.is_required = true AND (tc.completed IS NULL OR tc.completed = false) ORDER BY pt.sort_order LIMIT 1;

  RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'player_display', v_player.first_name || ' ' || COALESCE(v_player.last_initial, ''), 'team_id', v_active_team_id, 'team_name', v_team.name, 'palette_id', v_team.palette_id, 'date', v_today, 'mode', v_practice_card.mode, 'tier', v_practice_card.tier, 'card_id', v_practice_card.id, 'has_card', true, 'progress', jsonb_build_object('completed', v_completed_count, 'total_required', v_total_required), 'next_task', CASE WHEN v_next_task.id IS NOT NULL THEN jsonb_build_object('practice_task_id', v_next_task.id, 'label', v_next_task.label, 'task_type', v_next_task.task_type, 'target', v_next_task.target_display) ELSE null END);
END;
$function$;

-- apply_quick_action: uses practice_cards.team_id
CREATE OR REPLACE FUNCTION public.apply_quick_action(p_player_id uuid, p_action_type text, p_local_event_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid; v_active_team_id uuid; v_today date; v_game_day_enabled boolean; v_practice_card record; v_next_task record; v_now timestamptz;
BEGIN
  v_user_id := auth.uid(); v_now := now(); v_today := CURRENT_DATE;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF NOT public.is_player_guardian(p_player_id, v_user_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;
  IF EXISTS (SELECT 1 FROM public.offline_events WHERE user_id = v_user_id AND local_event_id = p_local_event_id) THEN RETURN jsonb_build_object('success', true, 'message', 'Already processed'); END IF;

  SELECT active_team_id INTO v_active_team_id FROM public.player_team_preferences WHERE player_id = p_player_id;
  IF v_active_team_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No active team'); END IF;
  SELECT COALESCE(enabled, false) INTO v_game_day_enabled FROM public.team_game_days WHERE team_id = v_active_team_id AND date = v_today;

  IF v_game_day_enabled THEN SELECT pc.id INTO v_practice_card FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'game_day' AND pc.published_at IS NOT NULL LIMIT 1; END IF;
  IF v_practice_card IS NULL THEN SELECT pc.id INTO v_practice_card FROM public.practice_cards pc WHERE pc.team_id = v_active_team_id AND pc.date = v_today AND pc.mode = 'normal' AND pc.published_at IS NOT NULL LIMIT 1; END IF;
  IF v_practice_card IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No practice card for today'); END IF;

  INSERT INTO public.offline_events (user_id, local_event_id, event_type, payload) VALUES (v_user_id, p_local_event_id, p_action_type, jsonb_build_object('player_id', p_player_id, 'practice_card_id', v_practice_card.id));

  CASE p_action_type
    WHEN 'toggle_next_task' THEN
      SELECT pt.id INTO v_next_task FROM public.practice_tasks pt LEFT JOIN public.task_completions tc ON tc.practice_task_id = pt.id AND tc.player_id = p_player_id WHERE pt.practice_card_id = v_practice_card.id AND pt.is_required = true AND (tc.completed IS NULL OR tc.completed = false) ORDER BY pt.sort_order LIMIT 1;
      IF v_next_task.id IS NULL THEN RETURN jsonb_build_object('success', true, 'message', 'All tasks complete'); END IF;
      INSERT INTO public.task_completions (practice_task_id, player_id, completed, completed_at, completed_by, local_event_id, source, updated_at) VALUES (v_next_task.id, p_player_id, true, v_now, 'widget', p_local_event_id, 'quick_action', v_now) ON CONFLICT (practice_task_id, player_id) DO UPDATE SET completed = true, completed_at = v_now, completed_by = 'widget', local_event_id = EXCLUDED.local_event_id, source = 'quick_action', updated_at = v_now;
      RETURN jsonb_build_object('success', true, 'action', 'task_completed', 'task_id', v_next_task.id);
    WHEN 'complete_session' THEN
      INSERT INTO public.session_completions (practice_card_id, player_id, status, completed_at, completed_by, local_event_id, source, updated_at) VALUES (v_practice_card.id, p_player_id, 'complete', v_now, 'widget', p_local_event_id, 'quick_action', v_now) ON CONFLICT (practice_card_id, player_id) DO UPDATE SET status = 'complete', completed_at = v_now, completed_by = 'widget', local_event_id = EXCLUDED.local_event_id, source = 'quick_action', updated_at = v_now;
      RETURN jsonb_build_object('success', true, 'action', 'session_completed');
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Unknown action type');
  END CASE;
END;
$function$;

-- get_team_dashboard_snapshot: uses practice_cards.team_id
CREATE OR REPLACE FUNCTION public.get_team_dashboard_snapshot(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_user_id uuid; v_team record; v_today date; v_game_day record; v_practice_card record;
  v_preferences_exists boolean; v_schedule_exists boolean; v_invite_exists boolean;
  v_roster_count int; v_active_today int; v_sessions_complete int; v_total_shots int;
  v_upcoming jsonb; v_onboarding record; v_game_event record; v_practice_card_found boolean := false;
BEGIN
  v_user_id := auth.uid(); v_today := CURRENT_DATE;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF NOT public.is_team_adult(p_team_id, v_user_id) THEN RETURN jsonb_build_object('success', false, 'error', 'Not authorized'); END IF;

  SELECT id, name, palette_id, team_logo_url, team_photo_url, season_label INTO v_team FROM public.teams WHERE id = p_team_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Team not found'); END IF;

  SELECT completed, last_step_completed INTO v_onboarding FROM public.team_onboarding_state WHERE team_id = p_team_id;
  SELECT EXISTS (SELECT 1 FROM public.team_training_preferences WHERE team_id = p_team_id) INTO v_preferences_exists;
  SELECT EXISTS (SELECT 1 FROM public.team_schedule_sources WHERE team_id = p_team_id) INTO v_schedule_exists;
  SELECT EXISTS (SELECT 1 FROM public.team_invites WHERE team_id = p_team_id AND status = 'active') INTO v_invite_exists;
  SELECT COUNT(*) INTO v_roster_count FROM public.team_memberships WHERE team_id = p_team_id AND status = 'active';
  SELECT enabled, notes INTO v_game_day FROM public.team_game_days WHERE team_id = p_team_id AND date = v_today;
  SELECT event_type, title, start_time, location INTO v_game_event FROM public.team_events WHERE team_id = p_team_id AND event_type = 'game' AND is_cancelled = false AND (start_time AT TIME ZONE 'UTC')::date = v_today ORDER BY start_time LIMIT 1;

  IF COALESCE(v_game_day.enabled, false) THEN
    SELECT id, title, tier, mode, published_at INTO v_practice_card FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND mode = 'game_day' LIMIT 1;
    IF FOUND THEN v_practice_card_found := true; END IF;
  END IF;
  IF NOT v_practice_card_found THEN
    SELECT id, title, tier, mode, published_at INTO v_practice_card FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND (mode = 'normal' OR mode IS NULL) LIMIT 1;
    IF FOUND THEN v_practice_card_found := true; END IF;
  END IF;

  IF v_roster_count > 0 AND v_practice_card_found THEN
    WITH team_players AS (SELECT player_id FROM public.team_memberships WHERE team_id = p_team_id AND status = 'active'),
    today_cards AS (SELECT id FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND published_at IS NOT NULL)
    SELECT COUNT(DISTINCT tc.player_id), COALESCE(SUM(tc.shots_logged), 0) INTO v_active_today, v_total_shots
    FROM public.task_completions tc JOIN public.practice_tasks pt ON pt.id = tc.practice_task_id
    WHERE pt.practice_card_id IN (SELECT id FROM today_cards) AND tc.player_id IN (SELECT player_id FROM team_players) AND tc.completed = true;
    SELECT COUNT(*) INTO v_sessions_complete FROM public.session_completions sc
    WHERE sc.practice_card_id IN (SELECT id FROM public.practice_cards WHERE team_id = p_team_id AND date = v_today AND published_at IS NOT NULL)
    AND sc.player_id IN (SELECT player_id FROM public.team_memberships WHERE team_id = p_team_id AND status = 'active') AND sc.status = 'complete';
  ELSE v_active_today := 0; v_total_shots := 0; v_sessions_complete := 0; END IF;

  SELECT jsonb_agg(e ORDER BY e.start_time) INTO v_upcoming FROM (SELECT id, event_type, title, start_time, location FROM public.team_events WHERE team_id = p_team_id AND is_cancelled = false AND start_time > now() ORDER BY start_time LIMIT 5) e;

  RETURN jsonb_build_object(
    'success', true,
    'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'palette_id', v_team.palette_id, 'logo_url', v_team.team_logo_url, 'photo_url', v_team.team_photo_url, 'season_label', v_team.season_label),
    'onboarding', jsonb_build_object('completed', COALESCE(v_onboarding.completed, false), 'last_step', v_onboarding.last_step_completed, 'has_preferences', v_preferences_exists, 'has_schedule', v_schedule_exists, 'has_invite', v_invite_exists, 'roster_count', v_roster_count),
    'game_day', jsonb_build_object('enabled', COALESCE(v_game_day.enabled, false), 'notes', v_game_day.notes, 'game_event', CASE WHEN v_game_event.event_type IS NOT NULL THEN jsonb_build_object('title', v_game_event.title, 'start_time', v_game_event.start_time, 'location', v_game_event.location) ELSE null END),
    'today', jsonb_build_object('has_card', v_practice_card_found, 'card_id', v_practice_card.id, 'title', v_practice_card.title, 'tier', v_practice_card.tier, 'mode', v_practice_card.mode, 'published', v_practice_card.published_at IS NOT NULL),
    'pulse', jsonb_build_object('roster_count', v_roster_count, 'active_today', COALESCE(v_active_today, 0), 'sessions_complete', COALESCE(v_sessions_complete, 0), 'total_shots', COALESCE(v_total_shots, 0)),
    'upcoming_events', COALESCE(v_upcoming, '[]'::jsonb)
  );
END;
$function$;

-- Drop helper functions that were created by the bad migration
DROP FUNCTION IF EXISTS public.can_access_practice_card(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.can_manage_practice_card(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_card_context(uuid);
