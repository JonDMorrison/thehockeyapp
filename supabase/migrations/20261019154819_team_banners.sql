CREATE TABLE public.team_banners (
 team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
 preset text NOT NULL DEFAULT 'rink' CHECK(preset IN ('rink','equipment','original','upload')),
 storage_path text,
 focal_x integer NOT NULL DEFAULT 50 CHECK(focal_x BETWEEN 0 AND 100),
 focal_y integer NOT NULL DEFAULT 50 CHECK(focal_y BETWEEN 0 AND 100),
 CHECK ((preset='upload' AND storage_path IS NOT NULL AND storage_path ~ ('^'||team_id::text||'/[0-9a-f-]+\.(jpg|png|webp)$')) OR (preset<>'upload' AND storage_path IS NULL))
);
ALTER TABLE public.team_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team staff read banner" ON public.team_banners FOR SELECT TO authenticated USING(public.is_team_adult(team_id,auth.uid()));
CREATE POLICY "Team staff create banner" ON public.team_banners FOR INSERT TO authenticated WITH CHECK(public.is_team_adult(team_id,auth.uid()));
CREATE POLICY "Team staff edit banner" ON public.team_banners FOR UPDATE TO authenticated USING(public.is_team_adult(team_id,auth.uid())) WITH CHECK(public.is_team_adult(team_id,auth.uid()));
GRANT SELECT,INSERT,UPDATE ON public.team_banners TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('team-banners','team-banners',false,5242880,ARRAY['image/jpeg','image/png','image/webp']);
CREATE POLICY "Staff read team banner files" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='team-banners' AND EXISTS(SELECT 1 FROM public.team_roles r WHERE r.user_id=auth.uid() AND r.team_id::text=(storage.foldername(name))[1]));
CREATE POLICY "Staff upload team banner files" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='team-banners' AND EXISTS(SELECT 1 FROM public.team_roles r WHERE r.user_id=auth.uid() AND r.team_id::text=(storage.foldername(name))[1]));
CREATE POLICY "Staff remove team banner files" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='team-banners' AND EXISTS(SELECT 1 FROM public.team_roles r WHERE r.user_id=auth.uid() AND r.team_id::text=(storage.foldername(name))[1]));
