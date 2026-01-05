-- Add coach_notes column to practice_tasks table
ALTER TABLE public.practice_tasks 
ADD COLUMN coach_notes TEXT;