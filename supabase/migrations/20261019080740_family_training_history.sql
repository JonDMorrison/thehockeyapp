-- Family history remains their own record when a team membership ends.
CREATE OR REPLACE FUNCTION public.get_player_training_history(p_player_id uuid,p_before date DEFAULT NULL,p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_before date:=coalesce(p_before,current_date+1);v_start date;v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_player_guardian(p_player_id,auth.uid()) THEN RAISE EXCEPTION 'Only this player''s family can view training history' USING ERRCODE='42501';END IF;
  IF p_days IS NULL OR p_days NOT BETWEEN 7 AND 90 THEN RAISE EXCEPTION 'Choose 7 to 90 days' USING ERRCODE='22023';END IF;
  v_before:=least(v_before,current_date+1);v_start:=v_before-p_days;
  WITH candidates AS (
    SELECT c.id,c.date,c.title,c.tier::text tier,'team'::text source,t.name team_name,
      NOT EXISTS(SELECT 1 FROM team_memberships m WHERE m.player_id=p_player_id AND m.team_id=c.team_id AND m.status='active') is_archived
    FROM practice_cards c LEFT JOIN teams t ON t.id=c.team_id
    WHERE c.published_at IS NOT NULL AND c.date<v_before AND c.program_source='team' AND (
      EXISTS(SELECT 1 FROM team_memberships m WHERE m.player_id=p_player_id AND m.team_id=c.team_id AND m.status='active')
      OR EXISTS(SELECT 1 FROM session_completions s WHERE s.player_id=p_player_id AND s.practice_card_id=c.id)
      OR EXISTS(SELECT 1 FROM task_completions x JOIN practice_tasks task ON task.id=x.practice_task_id WHERE x.player_id=p_player_id AND task.practice_card_id=c.id AND (x.completed OR x.shots_logged>0)))
    UNION ALL
    SELECT c.id,c.date,c.title,c.tier::text,'home'::text,NULL::text,false FROM personal_practice_cards c
    WHERE c.player_id=p_player_id AND c.published_at IS NOT NULL AND c.date<v_before
  ), entries AS (
    SELECT c.*,
      CASE WHEN c.source='team' THEN (SELECT count(*) FROM practice_tasks task WHERE task.practice_card_id=c.id)
        ELSE (SELECT count(*) FROM personal_practice_tasks task WHERE task.personal_practice_card_id=c.id) END task_count,
      CASE WHEN c.source='team' THEN (SELECT count(*) FROM task_completions x JOIN practice_tasks task ON task.id=x.practice_task_id WHERE x.player_id=p_player_id AND x.completed AND task.practice_card_id=c.id)
        ELSE (SELECT count(*) FROM personal_task_completions x JOIN personal_practice_tasks task ON task.id=x.personal_practice_task_id WHERE x.player_id=p_player_id AND x.completed AND task.personal_practice_card_id=c.id) END completed_count,
      CASE WHEN c.source='team' THEN coalesce((SELECT sum(x.shots_logged) FROM task_completions x JOIN practice_tasks task ON task.id=x.practice_task_id WHERE x.player_id=p_player_id AND task.practice_card_id=c.id),0)
        ELSE coalesce((SELECT sum(task.shots_expected) FROM personal_task_completions x JOIN personal_practice_tasks task ON task.id=x.personal_practice_task_id WHERE x.player_id=p_player_id AND x.completed AND task.personal_practice_card_id=c.id),0) END shots_logged,
      CASE WHEN c.source='team' THEN (SELECT s.status::text FROM session_completions s WHERE s.player_id=p_player_id AND s.practice_card_id=c.id LIMIT 1)
        ELSE (SELECT s.status::text FROM personal_session_completions s WHERE s.player_id=p_player_id AND s.personal_practice_card_id=c.id LIMIT 1) END session_status
    FROM candidates c WHERE c.date>=v_start
  )
  SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(e)||jsonb_build_object('status',coalesce(e.session_status,CASE WHEN e.completed_count>0 OR e.shots_logged>0 THEN 'partial' ELSE 'none' END)) ORDER BY e.date DESC,e.source,e.id) FROM entries e),'[]'::jsonb),'has_more',EXISTS(SELECT 1 FROM candidates WHERE date<v_start),'next_before',v_start) INTO v_result;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.get_player_training_history(uuid,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_player_training_history(uuid,date,integer) TO authenticated;
