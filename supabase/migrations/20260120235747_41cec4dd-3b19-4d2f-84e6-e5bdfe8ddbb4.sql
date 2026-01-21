-- Add custom color columns to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS custom_primary text,
ADD COLUMN IF NOT EXISTS custom_secondary text,
ADD COLUMN IF NOT EXISTS custom_tertiary text;