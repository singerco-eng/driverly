-- =============================================================================
-- COMBINED MIGRATION: 008 + 009
-- Run this in Supabase SQL Editor to apply pending migrations
-- =============================================================================

-- =============================================================================
-- MIGRATION 008: Public Company Access
-- =============================================================================

-- Allow public (anon) users to view active companies
-- This is required for the driver application wizard at /apply/:companySlug
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
  false,  -- private bucket
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for credential-documents bucket
-- Using DO blocks to avoid duplicate policy errors

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

SELECT 'Migrations 008 and 009 applied successfully!' as status;

-- Verify bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'credential-documents';

-- Verify policy exists
SELECT policyname FROM pg_policies WHERE tablename = 'companies' AND policyname LIKE '%Public%';
