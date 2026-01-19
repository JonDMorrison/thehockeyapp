-- Drop the existing check constraint
ALTER TABLE practice_cards DROP CONSTRAINT practice_cards_mode_check;

-- Add the updated check constraint with 'challenge' as a valid mode
ALTER TABLE practice_cards ADD CONSTRAINT practice_cards_mode_check 
  CHECK (mode = ANY (ARRAY['normal'::text, 'game_day'::text, 'challenge'::text]));