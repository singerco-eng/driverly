-- The plaintext token should never be stored. Only token_hash is used for lookups.
-- Making token nullable allows invitation inserts to succeed without persisting secrets.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invitations'
      AND column_name = 'token'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN token DROP NOT NULL;
    ALTER TABLE public.invitations ALTER COLUMN token SET DEFAULT NULL;
  END IF;
END $$;
