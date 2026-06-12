ALTER TABLE public.practice_tasks ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.practice_tasks DROP CONSTRAINT IF EXISTS practice_tasks_task_type_check;
ALTER TABLE public.practice_tasks ADD CONSTRAINT practice_tasks_task_type_check
  CHECK (task_type IN ('shooting','conditioning','mobility','recovery','prep','other','video'));
