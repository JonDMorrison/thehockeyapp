-- Photo metadata must never authorize an image stored for an unrelated child or workout.
CREATE OR REPLACE FUNCTION hockey_private.validate_session_photo_path()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_prefix text;v_file text;
BEGIN
  v_prefix:='sessions/'||NEW.practice_card_id::text||'/'||NEW.player_id::text||'/';
  v_file:=substring(NEW.storage_path FROM char_length(v_prefix)+1);
  IF NEW.storage_path IS NULL OR v_prefix IS NULL OR left(NEW.storage_path,char_length(v_prefix))<>v_prefix
     OR v_file IS NULL OR v_file IN ('','.','..') OR v_file ~ '[/\\]' THEN
    RAISE EXCEPTION 'This photo does not belong to the selected player and workout' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION hockey_private.validate_session_photo_path() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hockey_private.validate_session_photo_path() TO authenticated;
CREATE TRIGGER validate_photo_storage_identity BEFORE INSERT OR UPDATE ON public.session_photos FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_session_photo_path();
