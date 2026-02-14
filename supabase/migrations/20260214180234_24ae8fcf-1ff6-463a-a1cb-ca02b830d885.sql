ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;