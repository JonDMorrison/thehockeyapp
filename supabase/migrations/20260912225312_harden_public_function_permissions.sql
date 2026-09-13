-- SECURITY: PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- This exposed every SECURITY DEFINER helper through PostgREST, including
-- internal notification and admin-log writers. Start closed, then grant only
-- the RPCs the browser is expected to call.

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Anonymous users only need enough information to validate a team invite.
GRANT EXECUTE ON FUNCTION public.preview_team_by_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_team_by_short_code(text) TO anon, authenticated;

-- Authenticated browser RPCs. Each of these performs its own ownership or role
-- check using auth.uid(). Internal/trigger functions remain service-role only.
GRANT EXECUTE ON FUNCTION public.am_i_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_offline_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quick_action(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_goal_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_player_challenges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comp_admin_list(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comp_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_access_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_week_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_comp_grants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_season_report(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_solo_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_dashboard_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_team_with_invite(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_guardian_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_adult_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_team_invite(uuid) TO authenticated;

-- RLS policies call these relationship predicates as the signed-in user.
GRANT EXECUTE ON FUNCTION public.is_guardian_of_team_player(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_guardian(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_player_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_adult(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_head_coach(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teammate_of_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_player_on_team(uuid, uuid) TO authenticated;

-- Contact messages previously had a SELECT policy for every authenticated
-- account. They contain email addresses and must only be read server-side.
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.contact_submissions;

DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(name)) BETWEEN 1 AND 100
  AND length(trim(email)) BETWEEN 5 AND 255
  AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND length(trim(message)) BETWEEN 1 AND 4000
);

-- Make the intent durable for functions created after this migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Surface new support/privacy requests in the existing admin digest without
-- exposing the submissions table to signed-in users.
CREATE OR REPLACE FUNCTION public.log_contact_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.log_admin_event(
    'contact_submission',
    'important',
    auth.uid(),
    NULL,
    NULL,
    NEW.email,
    jsonb_build_object('name', left(NEW.name, 100))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_contact_submission ON public.contact_submissions;
CREATE TRIGGER trg_log_contact_submission
AFTER INSERT ON public.contact_submissions
FOR EACH ROW EXECUTE FUNCTION public.log_contact_submission();

REVOKE EXECUTE ON FUNCTION public.log_contact_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_contact_submission() TO service_role;

-- Session photos are private. The original storage rules allowed every signed-in
-- account to read every object, while the UI attempted to use public URLs that
-- cannot work for a private bucket.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'session-photos';

DROP POLICY IF EXISTS "Guardians can upload session photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their uploaded photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded photos" ON storage.objects;

CREATE POLICY "Authorized users can view session photo objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'session-photos'
  AND EXISTS (
    SELECT 1
    FROM public.session_photos sp
    WHERE sp.storage_path = storage.objects.name
  )
);

CREATE POLICY "Guardians can upload session photo objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session-photos'
  AND (storage.foldername(name))[1] = 'sessions'
  AND public.is_player_guardian(((storage.foldername(name))[3])::uuid, auth.uid())
);

CREATE POLICY "Guardians can delete session photo objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'session-photos'
  AND EXISTS (
    SELECT 1
    FROM public.session_photos sp
    WHERE sp.storage_path = storage.objects.name
      AND public.is_player_guardian(sp.player_id, auth.uid())
  )
);
