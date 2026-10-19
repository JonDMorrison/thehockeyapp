-- Mirror the visibility policies against disposable local objects and records.
ALTER TABLE public.session_photos ADD COLUMN player_id uuid REFERENCES public.players(id),ADD COLUMN visibility text DEFAULT 'parent_only',ADD COLUMN caption text,ADD COLUMN storage_path text;
ALTER TABLE public.session_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated select access paths" ON public.session_photos FOR SELECT TO authenticated USING (public.is_player_guardian(player_id,auth.uid()) OR EXISTS(SELECT 1 FROM public.practice_cards card WHERE card.id=session_photos.practice_card_id AND public.is_team_adult(card.team_id,auth.uid())));
GRANT SELECT ON public.session_photos,public.practice_cards TO authenticated;
CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO authenticated,anon;
CREATE TABLE storage.objects(name text PRIMARY KEY,bucket_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT,DELETE ON storage.objects TO authenticated;
CREATE FUNCTION storage.foldername(p_name text) RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT (string_to_array(p_name,'/'))[1:array_length(string_to_array(p_name,'/'),1)-1]; $$;
CREATE POLICY "Session rows allow image reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='session-photos' AND EXISTS(SELECT 1 FROM public.session_photos photo WHERE photo.storage_path=objects.name));
\ir ../../supabase/migrations/20261019070518_parent_only_session_photos.sql
DO $$ DECLARE v_coach uuid:=current_setting('test.user_id')::uuid;v_parent uuid:=gen_random_uuid();v_player uuid:=gen_random_uuid();v_team uuid;v_card uuid:=gen_random_uuid();v_photo uuid:=gen_random_uuid();v_path text;BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_coach::text,true);
  INSERT INTO auth.users VALUES(v_parent);
  INSERT INTO public.players(id,owner_user_id,first_name) VALUES(v_player,v_parent,'PhotoPolicyQA');
  INSERT INTO public.player_guardians(player_id,user_id) VALUES(v_player,v_parent);
  v_team:=(public.create_team_with_owner('Disposable Photo Policy QA')->>'team_id')::uuid;
  INSERT INTO public.practice_cards(id,team_id,date,mode,tier,published_at) VALUES(v_card,v_team,current_date,'normal','rep',now());
  v_path:='sessions/'||v_card||'/'||v_player||'/photo.png';
  INSERT INTO public.session_photos(id,practice_card_id,player_id,visibility,caption,storage_path) VALUES(v_photo,v_card,v_player,'parent_only','Family private',v_path);
  INSERT INTO storage.objects VALUES(v_path,'session-photos');
  PERFORM set_config('test.photo_parent',v_parent::text,true);PERFORM set_config('test.photo_id',v_photo::text,true);PERFORM set_config('test.photo_path',v_path,true);
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid)
    OR EXISTS(SELECT 1 FROM storage.objects WHERE name=current_setting('test.photo_path')) THEN RAISE EXCEPTION 'Coach can access parent-only photo'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.photo_parent'),true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid)
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE name=current_setting('test.photo_path')) THEN RAISE EXCEPTION 'Family lost its private photo'; END IF;
END $$;
RESET ROLE;
UPDATE public.session_photos SET visibility='team_adults' WHERE id=current_setting('test.photo_id')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.session_photos WHERE id=current_setting('test.photo_id')::uuid)
    OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE name=current_setting('test.photo_path')) THEN RAISE EXCEPTION 'Shared photo is unavailable to authorized coach'; END IF;
END $$;
RESET ROLE;
