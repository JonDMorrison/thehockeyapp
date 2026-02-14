
-- Ensure user_id is unique on subscriptions for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure entitlements can be upserted by service role (webhook uses service role key)
-- The existing RLS only allows SELECT for users. Service role bypasses RLS, so no policy changes needed.
