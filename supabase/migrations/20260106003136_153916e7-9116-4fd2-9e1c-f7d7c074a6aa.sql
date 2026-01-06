-- Add reward columns to team_goals table
ALTER TABLE public.team_goals 
ADD COLUMN reward_type TEXT,
ADD COLUMN reward_description TEXT;