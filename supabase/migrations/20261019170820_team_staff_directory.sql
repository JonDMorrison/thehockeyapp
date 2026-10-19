-- Return only colleagues in an explicitly authorized team; do not broaden profile-table RLS.
CREATE FUNCTION public.list_team_staff(p_team_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_team_adult(p_team_id,auth.uid()) THEN
  RAISE EXCEPTION 'Only team staff can view this staff directory' USING ERRCODE='42501';
 END IF;
 RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',r.id,'user_id',r.user_id,'role',r.role,
  'profiles',jsonb_build_object('display_name',COALESCE(NULLIF(p.display_name,''),NULLIF(u.raw_user_meta_data->>'display_name',''),split_part(u.email,'@',1)),
   'email',u.email)) ORDER BY CASE WHEN r.role='head_coach' THEN 0 ELSE 1 END,r.created_at),'[]'::jsonb)
  FROM public.team_roles r JOIN auth.users u ON u.id=r.user_id
  LEFT JOIN public.profiles p ON p.user_id=r.user_id WHERE r.team_id=p_team_id);
END; $$;
REVOKE ALL ON FUNCTION public.list_team_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_team_staff(uuid) TO authenticated;
