-- Create workout_templates table (personal templates)
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT CHECK (tier IN ('rec', 'rep', 'elite')) DEFAULT 'rep',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create workout_template_days table
CREATE TABLE public.workout_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id UUID REFERENCES public.workout_templates(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workout_template_id, day_of_week)
);

-- Create workout_template_tasks table
CREATE TABLE public.workout_template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_day_id UUID REFERENCES public.workout_template_days(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL,
  task_type TEXT CHECK (task_type IN ('shooting', 'conditioning', 'mobility', 'recovery', 'prep', 'other')) NOT NULL,
  label TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('reps', 'seconds', 'minutes', 'none')) DEFAULT 'none',
  target_value INT,
  shot_type TEXT CHECK (shot_type IN ('wrist', 'snap', 'slap', 'backhand', 'mixed', 'none')) DEFAULT 'none',
  shots_expected INT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create team_week_plans table
CREATE TABLE public.team_week_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  tier TEXT CHECK (tier IN ('rec', 'rep', 'elite')) DEFAULT 'rep',
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  use_tier_scaling BOOLEAN DEFAULT true,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create team_week_plan_days table
CREATE TABLE public.team_week_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_week_plan_id UUID REFERENCES public.team_week_plans(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_week_plan_id, date)
);

-- Create team_week_plan_tasks table
CREATE TABLE public.team_week_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_week_plan_day_id UUID REFERENCES public.team_week_plan_days(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL,
  task_type TEXT CHECK (task_type IN ('shooting', 'conditioning', 'mobility', 'recovery', 'prep', 'other')) NOT NULL,
  label TEXT NOT NULL,
  target_type TEXT CHECK (target_type IN ('reps', 'seconds', 'minutes', 'none')) DEFAULT 'none',
  target_value INT,
  shot_type TEXT CHECK (shot_type IN ('wrist', 'snap', 'slap', 'backhand', 'mixed', 'none')) DEFAULT 'none',
  shots_expected INT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_week_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_week_plan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_templates (personal to user)
CREATE POLICY "Users can view own templates"
  ON public.workout_templates FOR SELECT
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can create templates"
  ON public.workout_templates FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.workout_templates FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.workout_templates FOR DELETE
  USING (created_by_user_id = auth.uid());

-- RLS Policies for workout_template_days
CREATE POLICY "Users can view own template days"
  ON public.workout_template_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates wt
    WHERE wt.id = workout_template_days.workout_template_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can create template days"
  ON public.workout_template_days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_templates wt
    WHERE wt.id = workout_template_days.workout_template_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own template days"
  ON public.workout_template_days FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates wt
    WHERE wt.id = workout_template_days.workout_template_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own template days"
  ON public.workout_template_days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workout_templates wt
    WHERE wt.id = workout_template_days.workout_template_id
    AND wt.created_by_user_id = auth.uid()
  ));

-- RLS Policies for workout_template_tasks
CREATE POLICY "Users can view own template tasks"
  ON public.workout_template_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_template_days wtd
    JOIN public.workout_templates wt ON wt.id = wtd.workout_template_id
    WHERE wtd.id = workout_template_tasks.workout_template_day_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can create template tasks"
  ON public.workout_template_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_template_days wtd
    JOIN public.workout_templates wt ON wt.id = wtd.workout_template_id
    WHERE wtd.id = workout_template_tasks.workout_template_day_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own template tasks"
  ON public.workout_template_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workout_template_days wtd
    JOIN public.workout_templates wt ON wt.id = wtd.workout_template_id
    WHERE wtd.id = workout_template_tasks.workout_template_day_id
    AND wt.created_by_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own template tasks"
  ON public.workout_template_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workout_template_days wtd
    JOIN public.workout_templates wt ON wt.id = wtd.workout_template_id
    WHERE wtd.id = workout_template_tasks.workout_template_day_id
    AND wt.created_by_user_id = auth.uid()
  ));

-- RLS Policies for team_week_plans (team assets)
CREATE POLICY "Team adults can view week plans"
  ON public.team_week_plans FOR SELECT
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can create week plans"
  ON public.team_week_plans FOR INSERT
  WITH CHECK (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can update week plans"
  ON public.team_week_plans FOR UPDATE
  USING (is_team_adult(team_id, auth.uid()));

CREATE POLICY "Team adults can delete week plans"
  ON public.team_week_plans FOR DELETE
  USING (is_team_adult(team_id, auth.uid()));

-- RLS Policies for team_week_plan_days
CREATE POLICY "Team adults can view week plan days"
  ON public.team_week_plan_days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plans twp
    WHERE twp.id = team_week_plan_days.team_week_plan_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can create week plan days"
  ON public.team_week_plan_days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_week_plans twp
    WHERE twp.id = team_week_plan_days.team_week_plan_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can update week plan days"
  ON public.team_week_plan_days FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plans twp
    WHERE twp.id = team_week_plan_days.team_week_plan_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can delete week plan days"
  ON public.team_week_plan_days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plans twp
    WHERE twp.id = team_week_plan_days.team_week_plan_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

-- RLS Policies for team_week_plan_tasks
CREATE POLICY "Team adults can view week plan tasks"
  ON public.team_week_plan_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plan_days twpd
    JOIN public.team_week_plans twp ON twp.id = twpd.team_week_plan_id
    WHERE twpd.id = team_week_plan_tasks.team_week_plan_day_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can create week plan tasks"
  ON public.team_week_plan_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_week_plan_days twpd
    JOIN public.team_week_plans twp ON twp.id = twpd.team_week_plan_id
    WHERE twpd.id = team_week_plan_tasks.team_week_plan_day_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can update week plan tasks"
  ON public.team_week_plan_tasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plan_days twpd
    JOIN public.team_week_plans twp ON twp.id = twpd.team_week_plan_id
    WHERE twpd.id = team_week_plan_tasks.team_week_plan_day_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));

CREATE POLICY "Team adults can delete week plan tasks"
  ON public.team_week_plan_tasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.team_week_plan_days twpd
    JOIN public.team_week_plans twp ON twp.id = twpd.team_week_plan_id
    WHERE twpd.id = team_week_plan_tasks.team_week_plan_day_id
    AND is_team_adult(twp.team_id, auth.uid())
  ));