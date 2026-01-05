-- Drop and recreate the INSERT policy for teams to ensure it's for authenticated users
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

CREATE POLICY "Authenticated users can create teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (created_by_user_id = auth.uid());