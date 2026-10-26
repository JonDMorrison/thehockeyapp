-- Reuse the authenticated admin dispatch pipeline, retaining failed deliveries for retry.
CREATE OR REPLACE FUNCTION public.log_contact_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.log_admin_event('contact_submission', 'urgent', auth.uid(), NULL, NULL,
    NEW.email, jsonb_build_object('name', left(NEW.name, 100), 'submission_id', NEW.id));
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_contact_submission() FROM PUBLIC, anon, authenticated;
