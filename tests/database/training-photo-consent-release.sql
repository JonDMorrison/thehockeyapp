ALTER TABLE public.session_photos ADD COLUMN uploaded_by_user_id uuid;
CREATE TABLE public.player_consents(player_id uuid,guardian_user_id uuid,relationship_confirmed boolean,photo_sharing_allowed boolean,withdrawn_at timestamptz,PRIMARY KEY(player_id,guardian_user_id));
UPDATE public.session_photos SET uploaded_by_user_id=current_setting('test.photo_parent')::uuid WHERE id=current_setting('test.photo_id')::uuid;
INSERT INTO public.player_consents SELECT player_id,uploaded_by_user_id,true,false,NULL FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid;
\ir ../../supabase/migrations/20261019072051_enforce_training_photo_consent.sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid)
     OR EXISTS(SELECT 1 FROM storage.objects WHERE name=current_setting('test.photo_path')) THEN RAISE EXCEPTION 'Staff access ignored disabled guardian photo consent'; END IF;
END $$;
RESET ROLE;
UPDATE public.player_consents SET photo_sharing_allowed=true;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid)
     OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE name=current_setting('test.photo_path')) THEN RAISE EXCEPTION 'Active guardian permission did not allow shared photo'; END IF;
END $$;
RESET ROLE;
UPDATE public.player_consents SET withdrawn_at=now();
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid) THEN RAISE EXCEPTION 'Withdrawn guardian consent still shared a photo'; END IF;
END $$;
RESET ROLE;
UPDATE public.player_consents SET withdrawn_at=NULL;
GRANT INSERT ON public.session_photos TO authenticated;
CREATE POLICY "Guardian photo insert fixture" ON public.session_photos FOR INSERT TO authenticated WITH CHECK(public.is_player_guardian(player_id,auth.uid()));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.photo_parent'),true);
DO $$ DECLARE v_player uuid;v_card uuid;BEGIN
  SELECT player_id,practice_card_id INTO v_player,v_card FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid;
  BEGIN
    INSERT INTO public.session_photos(practice_card_id,player_id,uploaded_by_user_id) VALUES(v_card,v_player,current_setting('test.user_id')::uuid);
    RAISE EXCEPTION 'A guardian impersonated another uploader';
  EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  INSERT INTO public.session_photos(practice_card_id,player_id,uploaded_by_user_id) VALUES(v_card,v_player,auth.uid());
END $$;
RESET ROLE;
