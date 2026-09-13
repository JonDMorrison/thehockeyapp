-- The consolidated preview accepts either a short code or a token and returns
-- display fields only. Keep the legacy function for internal compatibility, but
-- stop exposing it because its response contains the underlying invite token.
REVOKE ALL ON FUNCTION public.preview_team_by_short_code(text) FROM PUBLIC, anon, authenticated;
