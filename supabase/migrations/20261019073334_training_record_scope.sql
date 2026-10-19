-- Completion ownership is not enough: the referenced workout must also belong to that player/team.
CREATE OR REPLACE FUNCTION hockey_private.validate_training_record_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_card uuid;v_owner uuid;v_team uuid;v_source text;v_creator uuid;v_published timestamptz;
BEGIN
  IF TG_TABLE_NAME='personal_task_completions' THEN
    SELECT card.player_id INTO v_owner FROM public.personal_practice_tasks task JOIN public.personal_practice_cards card ON card.id=task.personal_practice_card_id WHERE task.id=NEW.personal_practice_task_id;
    IF v_owner IS DISTINCT FROM NEW.player_id THEN RAISE EXCEPTION 'This personal activity belongs to another player' USING ERRCODE='23514'; END IF;
  ELSIF TG_TABLE_NAME='personal_session_completions' THEN
    SELECT player_id INTO v_owner FROM public.personal_practice_cards WHERE id=NEW.personal_practice_card_id;
    IF v_owner IS DISTINCT FROM NEW.player_id THEN RAISE EXCEPTION 'This personal workout belongs to another player' USING ERRCODE='23514'; END IF;
  ELSE
    IF TG_TABLE_NAME='task_completions' THEN
      SELECT practice_card_id INTO v_card FROM public.practice_tasks WHERE id=NEW.practice_task_id;
    ELSE
      v_card:=NEW.practice_card_id;
    END IF;
    SELECT team_id,program_source::text,created_by_user_id,published_at INTO v_team,v_source,v_creator,v_published FROM public.practice_cards WHERE id=v_card;
    IF NEW.player_id IS NULL OR v_card IS NULL OR v_published IS NULL OR NOT (
      (v_source='team' AND EXISTS(SELECT 1 FROM public.team_memberships WHERE team_id=v_team AND player_id=NEW.player_id AND status='active'))
      OR (v_source='parent' AND public.is_player_guardian(NEW.player_id,v_creator))
    ) THEN
      RAISE EXCEPTION 'This player is not assigned to the published workout' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION hockey_private.validate_training_record_scope() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hockey_private.validate_training_record_scope() TO authenticated;
CREATE TRIGGER validate_task_completion_scope BEFORE INSERT OR UPDATE ON public.task_completions FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_training_record_scope();
CREATE TRIGGER validate_session_completion_scope BEFORE INSERT OR UPDATE ON public.session_completions FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_training_record_scope();
CREATE TRIGGER validate_session_photo_scope BEFORE INSERT OR UPDATE ON public.session_photos FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_training_record_scope();
CREATE TRIGGER validate_personal_task_completion_scope BEFORE INSERT OR UPDATE ON public.personal_task_completions FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_training_record_scope();
CREATE TRIGGER validate_personal_session_completion_scope BEFORE INSERT OR UPDATE ON public.personal_session_completions FOR EACH ROW EXECUTE FUNCTION hockey_private.validate_training_record_scope();
CREATE UNIQUE INDEX personal_task_completions_player_task_unique ON public.personal_task_completions(player_id,personal_practice_task_id);
ALTER TABLE public.task_completions ADD CONSTRAINT task_completion_shot_range CHECK (shots_logged IS NULL OR shots_logged BETWEEN 0 AND 10000);
