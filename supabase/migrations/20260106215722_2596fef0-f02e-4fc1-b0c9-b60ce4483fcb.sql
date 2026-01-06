-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own player photos
CREATE POLICY "Users can upload player photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'player-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM players WHERE owner_user_id = auth.uid()
  )
);

-- Allow authenticated users to update their own player photos
CREATE POLICY "Users can update player photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'player-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM players WHERE owner_user_id = auth.uid()
  )
);

-- Allow public read access to player photos
CREATE POLICY "Player photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'player-photos');