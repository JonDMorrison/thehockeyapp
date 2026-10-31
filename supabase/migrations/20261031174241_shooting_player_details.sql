-- Team-only player questionnaire and counted daily totals. Raw extra practice remains private.
CREATE OR REPLACE FUNCTION hockey_private.shooting_player_details(p_challenge uuid, p_player uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.shooting_challenges; result jsonb;
BEGIN
 SELECT * INTO c FROM public.shooting_challenges WHERE id=p_challenge;
 IF auth.uid() IS NULL OR c.id IS NULL OR NOT hockey_private.can_read_shooting(c.team_id)
 OR NOT EXISTS(SELECT 1 FROM public.shooting_challenge_players WHERE challenge_id=c.id AND player_id=p_player) THEN
 RAISE EXCEPTION 'Player unavailable' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('profile',jsonb_build_object(
 'profile_photo_url',p.profile_photo_url,'position',p.position,'shoots',p.shoots,
 'fav_nhl_city',p.fav_nhl_city,'fav_nhl_player',p.fav_nhl_player,
 'hockey_love',p.hockey_love,'season_goals',p.season_goals),
 'days',coalesce((SELECT jsonb_agg(jsonb_build_object('shot_date',d.shot_date,
 'shots',CASE WHEN c.daily_cap=0 THEN d.shots ELSE least(d.shots,coalesce(c.daily_cap,300)) END)
 ORDER BY d.shot_date DESC) FROM public.shooting_challenge_days d
 WHERE d.challenge_id=c.id AND d.player_id=p.id),'[]'::jsonb)) INTO result
 FROM public.players p WHERE p.id=p_player;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION hockey_private.shooting_player_details(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION hockey_private.shooting_player_details(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_shooting_player_details(p_challenge uuid,p_player uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT hockey_private.shooting_player_details(p_challenge,p_player);
$$;
REVOKE ALL ON FUNCTION public.get_shooting_player_details(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_shooting_player_details(uuid,uuid) TO authenticated;
