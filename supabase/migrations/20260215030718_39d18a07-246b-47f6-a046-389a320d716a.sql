
-- 1. Create enum type
CREATE TYPE public.program_source AS ENUM ('team', 'parent');

-- 2. Add column to practice_cards (default 'team' for existing rows)
ALTER TABLE public.practice_cards
  ADD COLUMN program_source public.program_source NOT NULL DEFAULT 'team';

-- 3. Add column to practice_tasks (default 'team')
ALTER TABLE public.practice_tasks
  ADD COLUMN program_source public.program_source NOT NULL DEFAULT 'team';

-- 4. Add column to session_completions (default 'team')
ALTER TABLE public.session_completions
  ADD COLUMN program_source public.program_source NOT NULL DEFAULT 'team';

-- 5. RLS: Block coach roles from accessing parent-sourced practice_cards
CREATE POLICY "Coaches cannot access parent practice cards"
  ON public.practice_cards
  FOR ALL
  USING (
    NOT (
      program_source = 'parent'
      AND EXISTS (
        SELECT 1 FROM public.team_roles tr
        WHERE tr.user_id = auth.uid()
        AND tr.team_id = practice_cards.team_id
      )
      AND NOT public.is_player_guardian(
        (SELECT tm.player_id FROM public.team_memberships tm
         JOIN public.players p ON p.id = tm.player_id
         WHERE tm.team_id = practice_cards.team_id
         AND p.owner_user_id = auth.uid()
         LIMIT 1),
        auth.uid()
      )
    )
  );

-- 6. RLS: Block coach roles from accessing parent-sourced practice_tasks
CREATE POLICY "Coaches cannot access parent practice tasks"
  ON public.practice_tasks
  FOR ALL
  USING (
    NOT (
      program_source = 'parent'
      AND EXISTS (
        SELECT 1 FROM public.practice_cards pc
        JOIN public.team_roles tr ON tr.team_id = pc.team_id AND tr.user_id = auth.uid()
        WHERE pc.id = practice_tasks.practice_card_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.practice_cards pc
        JOIN public.team_memberships tm ON tm.team_id = pc.team_id
        JOIN public.players p ON p.id = tm.player_id AND p.owner_user_id = auth.uid()
        WHERE pc.id = practice_tasks.practice_card_id
      )
    )
  );

-- 7. RLS: Block coach roles from accessing parent-sourced session_completions
CREATE POLICY "Coaches cannot access parent session completions"
  ON public.session_completions
  FOR ALL
  USING (
    NOT (
      program_source = 'parent'
      AND EXISTS (
        SELECT 1 FROM public.practice_cards pc
        JOIN public.team_roles tr ON tr.team_id = pc.team_id AND tr.user_id = auth.uid()
        WHERE pc.id = session_completions.practice_card_id
      )
      AND NOT public.is_player_guardian(session_completions.player_id, auth.uid())
    )
  );
