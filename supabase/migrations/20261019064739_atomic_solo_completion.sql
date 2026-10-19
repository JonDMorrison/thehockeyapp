-- Record a solo task and its derived session status together, including undo.
CREATE OR REPLACE FUNCTION public.set_personal_task_completion(p_player_id uuid,p_task_id uuid,p_completed boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid:=auth.uid(); v_card uuid; v_count integer; v_total integer; v_status text;
BEGIN
  IF v_user IS NULL OR (NOT public.is_player_guardian(p_player_id,v_user) AND NOT EXISTS(SELECT 1 FROM public.players WHERE id=p_player_id AND owner_user_id=v_user)) THEN
    RAISE EXCEPTION 'You cannot manage this player' USING ERRCODE='42501';
  END IF;
  IF p_completed IS NULL THEN RAISE EXCEPTION 'Choose a completion state' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.players WHERE id=p_player_id FOR UPDATE;
  SELECT card.id INTO v_card FROM public.personal_practice_cards card JOIN public.personal_practice_tasks task ON task.personal_practice_card_id=card.id
    WHERE task.id=p_task_id AND card.player_id=p_player_id FOR UPDATE OF card,task;
  IF v_card IS NULL THEN RAISE EXCEPTION 'This activity is unavailable for this player' USING ERRCODE='42501'; END IF;
  IF p_completed THEN
    UPDATE public.personal_task_completions SET completed=true,completed_at=coalesce(completed_at,now()),completed_by=v_user::text,source='solo'
      WHERE player_id=p_player_id AND personal_practice_task_id=p_task_id;
    IF NOT FOUND THEN
      INSERT INTO public.personal_task_completions(player_id,personal_practice_task_id,completed,completed_at,completed_by,source)
        VALUES(p_player_id,p_task_id,true,now(),v_user::text,'solo');
    END IF;
  ELSE
    DELETE FROM public.personal_task_completions WHERE player_id=p_player_id AND personal_practice_task_id=p_task_id;
  END IF;
  SELECT count(*) INTO v_total FROM public.personal_practice_tasks WHERE personal_practice_card_id=v_card;
  SELECT count(DISTINCT task.id) INTO v_count FROM public.personal_practice_tasks task JOIN public.personal_task_completions completion ON completion.personal_practice_task_id=task.id
    WHERE task.personal_practice_card_id=v_card AND completion.player_id=p_player_id AND completion.completed;
  v_status:=CASE WHEN v_total>0 AND v_count=v_total THEN 'complete' WHEN v_count>0 THEN 'partial' ELSE 'none' END;
  INSERT INTO public.personal_session_completions(player_id,personal_practice_card_id,status,completed_at)
    VALUES(p_player_id,v_card,v_status,CASE WHEN v_status='complete' THEN now() END)
    ON CONFLICT(player_id,personal_practice_card_id) DO UPDATE SET status=excluded.status,completed_at=excluded.completed_at;
  RETURN jsonb_build_object('success',true,'completed',p_completed,'session_status',v_status,'completed_count',v_count,'total_count',v_total);
END $$;
REVOKE ALL ON FUNCTION public.set_personal_task_completion(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_personal_task_completion(uuid,uuid,boolean) TO authenticated;
