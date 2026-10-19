CREATE SCHEMA IF NOT EXISTS hockey_private;
GRANT USAGE ON SCHEMA hockey_private TO authenticated;
-- Consent is recorded per guardian; a shared photo must have its uploader's active permission.
CREATE OR REPLACE FUNCTION hockey_private.session_photo_consent(p_player uuid,p_guardian uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_player_guardian(p_player,p_guardian) AND EXISTS(
    SELECT 1 FROM public.player_consents consent
    WHERE consent.player_id=p_player AND consent.guardian_user_id=p_guardian
      AND consent.relationship_confirmed AND consent.withdrawn_at IS NULL AND consent.photo_sharing_allowed
  );
$$;
REVOKE ALL ON FUNCTION hockey_private.session_photo_consent(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hockey_private.session_photo_consent(uuid,uuid) TO authenticated;
ALTER POLICY "Authenticated select access paths" ON public.session_photos USING (
  public.is_player_guardian(player_id,(SELECT auth.uid()))
  OR (visibility='team_adults' AND hockey_private.session_photo_consent(player_id,uploaded_by_user_id) AND EXISTS(
    SELECT 1 FROM public.practice_cards card
    WHERE card.id=session_photos.practice_card_id AND public.is_team_adult(card.team_id,(SELECT auth.uid()))
  ))
);
CREATE POLICY "Photo uploads identify the signed-in guardian" ON public.session_photos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_user_id=(SELECT auth.uid()));
CREATE POLICY "Only the uploader changes photo sharing" ON public.session_photos AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (uploaded_by_user_id=(SELECT auth.uid())) WITH CHECK (uploaded_by_user_id=(SELECT auth.uid()));
