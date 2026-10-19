-- Grant INSERT deliberately: the row policy must still enforce the true owner boundary.
ALTER TABLE public.player_guardians ADD COLUMN guardian_role text DEFAULT 'guardian';
CREATE FUNCTION public.is_player_owner(p_player uuid,p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.players WHERE id=p_player AND owner_user_id=p_user); $$;
ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can insert guardians" ON public.player_guardians FOR INSERT TO authenticated WITH CHECK (public.is_player_owner(player_id,auth.uid()) OR user_id=auth.uid());
GRANT INSERT ON public.player_guardians TO authenticated;
\ir ../../supabase/migrations/20261019065515_guardian_grant_ownership.sql
DO $$ DECLARE v_owner uuid:=current_setting('test.user_id')::uuid; v_other uuid:=gen_random_uuid(); v_player uuid:=gen_random_uuid(); BEGIN
  INSERT INTO auth.users VALUES(v_other);
  INSERT INTO public.players(id,owner_user_id,first_name) VALUES(v_player,v_owner,'GuardianPolicyQA');
  PERFORM set_config('test.guardian_player',v_player::text,true); PERFORM set_config('test.guardian_other',v_other::text,true);
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('test.guardian_other'),true);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.player_guardians(player_id,user_id,guardian_role) VALUES(current_setting('test.guardian_player')::uuid,auth.uid(),'owner');
    RAISE EXCEPTION 'Self-granted guardianship unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.user_id'),true);
INSERT INTO public.player_guardians(player_id,user_id,guardian_role) VALUES(current_setting('test.guardian_player')::uuid,current_setting('test.guardian_other')::uuid,'guardian');
RESET ROLE;
