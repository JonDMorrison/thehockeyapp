-- Make team-media bucket public so uploaded images are accessible
UPDATE storage.buckets 
SET public = true 
WHERE id = 'team-media';

-- Add a public SELECT policy so anyone can view team media (logos/photos should be public)
CREATE POLICY "Anyone can view team media"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-media');