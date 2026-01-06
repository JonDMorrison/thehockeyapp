-- Drop the old overly restrictive constraints
ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_completed_by_check;
ALTER TABLE public.task_completions DROP CONSTRAINT IF EXISTS task_completions_source_check;

-- Add updated source constraint that includes 'solo'
ALTER TABLE public.task_completions 
ADD CONSTRAINT task_completions_source_check 
CHECK (source = ANY (ARRAY['online'::text, 'offline_sync'::text, 'solo'::text, 'coach'::text, 'guardian'::text]));

-- Note: completed_by should store user_id (UUID), not a role string, so we remove that constraint entirely
-- The completed_by field is already used to store UUIDs in the codebase