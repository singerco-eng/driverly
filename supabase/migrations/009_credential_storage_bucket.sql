-- =============================================================================
-- Migration: 009_credential_storage_bucket.sql
-- Description: Creates the credential-documents storage bucket and RLS policies
--              for license photo uploads during driver applications.
-- Reference: AD-001 Driver Applications
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

-- =============================================================================
-- RLS Policies for credential-documents bucket
-- =============================================================================

-- Allow authenticated users to upload to their own folder
-- Path format: {user_id}/application/license-{front|back}.{ext}
CREATE POLICY "Users can upload to own application folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'credential-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to view their own uploads
CREATE POLICY "Users can view own uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow admins to view credential documents for their company's drivers
-- This requires joining through drivers table to check company_id
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

-- Allow super admins to view all credential documents
CREATE POLICY "Super admins can view all credential documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "Users can upload to own application folder" ON storage.objects IS 
  'Allows applicants to upload license photos to their own folder during the application process.';

COMMENT ON POLICY "Admins can view company credential documents" ON storage.objects IS 
  'Allows company admins to review license photos for driver applications in their company.';
