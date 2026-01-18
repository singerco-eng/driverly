-- =============================================================================
-- COMBINED MIGRATION: 007 + 008 + 009
-- Run this in Supabase SQL Editor to apply pending migrations
-- =============================================================================

-- =============================================================================
-- PREREQUISITE: Helper Function (from migration 006)
-- =============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION 007: Driver Applications
-- =============================================================================

-- Add 'draft' to application_status check constraint
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_application_status_check;
ALTER TABLE drivers ADD CONSTRAINT drivers_application_status_check 
  CHECK (application_status IN ('draft', 'pending', 'under_review', 'approved', 'rejected', 'withdrawn'));

-- Add application-specific columns
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_front_url TEXT,
  ADD COLUMN IF NOT EXISTS license_back_url TEXT,
  ADD COLUMN IF NOT EXISTS experience_notes TEXT,
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS can_reapply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eula_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eula_version VARCHAR(50);

-- Index for application submitted date
CREATE INDEX IF NOT EXISTS idx_drivers_application_submitted_at 
  ON drivers(application_submitted_at DESC);

-- Create application_drafts table
CREATE TABLE IF NOT EXISTS application_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT application_drafts_user_company_unique UNIQUE(user_id, company_id)
);

-- Index for drafts
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_company 
  ON application_drafts(user_id, company_id);

-- Updated at trigger for drafts
DROP TRIGGER IF EXISTS update_application_drafts_updated_at ON application_drafts;
CREATE TRIGGER update_application_drafts_updated_at
  BEFORE UPDATE ON application_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on application_drafts
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_drafts (use DO blocks to avoid duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can view own drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can view own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can create own drafts"
      ON application_drafts FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can create own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can create own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can update own drafts"
      ON application_drafts FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can update own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can update own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can delete own drafts"
      ON application_drafts FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can delete own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can delete own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view company drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Admins can view company drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      );
    RAISE NOTICE 'Created policy: Admins can view company drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Admins can view company drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Super admins can view all drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Super admins can view all drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
    RAISE NOTICE 'Created policy: Super admins can view all drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Super admins can view all drafts';
  END IF;
END $$;

-- Additional driver RLS policies for applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create own driver application' 
    AND tablename = 'drivers'
  ) THEN
    CREATE POLICY "Users can create own driver application"
      ON drivers FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can create own driver application';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can create own driver application';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Rejected drivers can reapply' 
    AND tablename = 'drivers'
  ) THEN
    CREATE POLICY "Rejected drivers can reapply"
      ON drivers FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid()
        AND application_status = 'rejected'
        AND can_reapply_at IS NOT NULL
        AND can_reapply_at <= NOW()
      )
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Rejected drivers can reapply';
  ELSE
    RAISE NOTICE 'Policy already exists: Rejected drivers can reapply';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 008: Public Company Access
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can view active companies' 
    AND tablename = 'companies'
  ) THEN
    CREATE POLICY "Public can view active companies"
      ON companies FOR SELECT
      TO anon
      USING (status = 'active');
    RAISE NOTICE 'Created policy: Public can view active companies';
  ELSE
    RAISE NOTICE 'Policy already exists: Public can view active companies';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 009: Credential Storage Bucket
-- =============================================================================

-- Create the storage bucket for credential documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'credential-documents',
  'credential-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload to own application folder' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload to own application folder"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'credential-documents' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can upload to own application folder';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can upload to own application folder';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can view own uploads"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can view own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update own uploads"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can update own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can update own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own uploads"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can delete own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can delete own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view company credential documents' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can view company credential documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND EXISTS (
          SELECT 1 FROM drivers d
          JOIN users u ON d.user_id = u.id
          WHERE u.id::text = (storage.foldername(name))[1]
            AND d.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
        )
      );
    RAISE NOTICE 'Created policy: Admins can view company credential documents';
  ELSE
    RAISE NOTICE 'Policy already exists: Admins can view company credential documents';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Super admins can view all credential documents' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Super admins can view all credential documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      );
    RAISE NOTICE 'Created policy: Super admins can view all credential documents';
  ELSE
    RAISE NOTICE 'Policy already exists: Super admins can view all credential documents';
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'Migrations 007, 008, and 009 applied successfully!' as status;

-- Verify tables exist
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'application_drafts') as application_drafts_exists;

-- Verify bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'credential-documents';

-- Verify key policies
SELECT policyname FROM pg_policies WHERE tablename IN ('application_drafts', 'companies', 'drivers') ORDER BY tablename, policyname;
