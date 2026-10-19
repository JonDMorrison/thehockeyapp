-- Self-identification is not permission to access a child. Invite redemption is separately authorized.
ALTER POLICY "Owners can insert guardians" ON public.player_guardians
  WITH CHECK (public.is_player_owner(player_id, (SELECT auth.uid())));
