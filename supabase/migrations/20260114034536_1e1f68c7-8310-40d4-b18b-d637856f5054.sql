-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- No INSERT policy needed - triggers use SECURITY DEFINER which bypasses RLS