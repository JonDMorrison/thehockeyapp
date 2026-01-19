-- Address linter warning: overly-permissive INSERT policy with WITH CHECK (true)
-- Keep the contact form public, but require non-empty fields.

DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
WITH CHECK (
  length(trim(coalesce(email, ''))) > 3
  AND position('@' in email) > 1
  AND length(trim(coalesce(name, ''))) > 0
  AND length(trim(coalesce(message, ''))) > 0
);
