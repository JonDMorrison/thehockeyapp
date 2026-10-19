\ir ../../supabase/migrations/20261019073853_session_photo_storage_identity.sql
DO $$ DECLARE v_user uuid:=current_setting('test.user_id')::uuid;v_team uuid;v_player uuid;v_card uuid:=gen_random_uuid();v_photo uuid;v_path text;BEGIN
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  v_team:=(public.create_team_with_owner('Disposable Photo Path QA')->>'team_id')::uuid;
  v_player:=(public.create_managed_player('PhotoPathKid',2014)->>'player_id')::uuid;
  PERFORM public.add_my_player_to_team(v_team,v_player);
  PERFORM public.save_team_practice_card(v_card,v_team,current_date,'rep','Photo path scope','','[{"label":"Path drill","task_type":"mobility"}]',true);
  v_path:='sessions/'||v_card||'/'||v_player||'/image.png';
  INSERT INTO public.session_photos(practice_card_id,player_id,uploaded_by_user_id,storage_path) VALUES(v_card,v_player,v_user,v_path) RETURNING id INTO v_photo;
  BEGIN UPDATE public.session_photos SET storage_path='sessions/'||gen_random_uuid()||'/'||gen_random_uuid()||'/private.png' WHERE id=v_photo; RAISE EXCEPTION 'Foreign photo path was accepted'; EXCEPTION WHEN check_violation THEN NULL;END;
  BEGIN UPDATE public.session_photos SET storage_path='sessions/'||v_card||'/'||v_player||'/../private.png' WHERE id=v_photo; RAISE EXCEPTION 'Nested photo path was accepted'; EXCEPTION WHEN check_violation THEN NULL;END;
  IF NOT EXISTS(SELECT 1 FROM public.session_photos WHERE id=v_photo AND storage_path=v_path) THEN RAISE EXCEPTION 'Failed path edit changed the original photo';END IF;
END $$;
