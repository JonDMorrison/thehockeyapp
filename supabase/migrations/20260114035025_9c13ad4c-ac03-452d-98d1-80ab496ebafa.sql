-- Add missing guardian SELECT policies for team-related tables
-- This ensures player owners/guardians have the same view access as players would

-- team_week_summaries: Guardians should see team summaries
CREATE POLICY "Guardians can view team summaries"
ON public.team_week_summaries FOR SELECT
USING (is_guardian_of_team_player(team_id, auth.uid()));

-- team_week_plans: Guardians should see week plans for their player teams
CREATE POLICY "Guardians can view week plans"
ON public.team_week_plans FOR SELECT
USING (is_guardian_of_team_player(team_id, auth.uid()));

-- team_week_plan_days: Guardians should see plan days
CREATE POLICY "Guardians can view week plan days"
ON public.team_week_plan_days FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_week_plans twp
  WHERE twp.id = team_week_plan_days.team_week_plan_id
  AND is_guardian_of_team_player(twp.team_id, auth.uid())
));

-- team_week_plan_tasks: Guardians should see plan tasks
CREATE POLICY "Guardians can view week plan tasks"
ON public.team_week_plan_tasks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM team_week_plan_days twpd
  JOIN team_week_plans twp ON twp.id = twpd.team_week_plan_id
  WHERE twpd.id = team_week_plan_tasks.team_week_plan_day_id
  AND is_guardian_of_team_player(twp.team_id, auth.uid())
));

-- team_goal_contributions: Add policy for viewing own player contributions (not just leaderboard)
CREATE POLICY "Guardians can view own player contributions"
ON public.team_goal_contributions FOR SELECT
USING (is_player_guardian(player_id, auth.uid()));