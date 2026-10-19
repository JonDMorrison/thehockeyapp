-- A family-private photo must not become readable merely because someone coaches the team.
ALTER POLICY "Authenticated select access paths" ON public.session_photos USING (
  public.is_player_guardian(player_id,(SELECT auth.uid()))
  OR (visibility='team_adults' AND EXISTS(
    SELECT 1 FROM public.practice_cards card
    WHERE card.id=session_photos.practice_card_id AND public.is_team_adult(card.team_id,(SELECT auth.uid()))
  ))
);
-- Upload cleanup must work even if creating the session-photo record fails.
CREATE POLICY "Guardians can access their session uploads" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='session-photos' AND (storage.foldername(name))[1]='sessions'
  AND public.is_player_guardian(((storage.foldername(name))[3])::uuid,(SELECT auth.uid()))
);
CREATE POLICY "Guardians can remove their session uploads" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id='session-photos' AND (storage.foldername(name))[1]='sessions'
  AND public.is_player_guardian(((storage.foldername(name))[3])::uuid,(SELECT auth.uid()))
);
