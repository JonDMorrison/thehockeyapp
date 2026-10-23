-- Team members can view every team leaderboard, including challenges they did not enter.
-- Keep guardian/ownership authorization and team visibility; logging eligibility is unchanged.
CREATE OR REPLACE FUNCTION hockey_private.list_shooting(p_team uuid,p_player uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to view challenges' USING ERRCODE='42501'; END IF;
 IF p_player IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.players p WHERE p.id=p_player AND
 (p.owner_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.player_guardians g WHERE g.player_id=p.id AND g.user_id=auth.uid()))) THEN
   RAISE EXCEPTION 'Player unavailable' USING ERRCODE='42501';
 END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.end_date DESC,c.created_at DESC) FROM (
   SELECT c.id,c.name,c.team_id,c.start_date,c.end_date,c.timezone,c.created_at,
   CASE WHEN (now() AT TIME ZONE c.timezone)::date<c.start_date THEN 'Scheduled'
   WHEN (now() AT TIME ZONE c.timezone)::date>c.end_date THEN 'Finished' ELSE 'Live' END AS status
   FROM public.shooting_challenges c WHERE hockey_private.can_read_shooting(c.team_id)
   AND (p_team IS NULL OR c.team_id=p_team)
   AND (p_player IS NULL OR EXISTS(SELECT 1 FROM public.team_memberships m
     WHERE m.team_id=c.team_id AND m.player_id=p_player AND m.status='active'))
 )c),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION hockey_private.list_shooting(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hockey_private.list_shooting(uuid,uuid) TO authenticated;
