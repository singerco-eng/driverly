-- =============================================================================
-- Migration: 008_public_company_access.sql
-- Description: Adds public read access to companies table for driver application
--              flow. Allows unauthenticated users to fetch company info by slug.
-- Reference: AD-001 requires public access to /apply/:companySlug
-- =============================================================================

-- Allow public (anon) users to view active companies
-- This is required for the driver application wizard at /apply/:companySlug
CREATE POLICY "Public can view active companies"
  ON companies FOR SELECT
  TO anon
  USING (status = 'active');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON POLICY "Public can view active companies" ON companies IS 
  'Allows unauthenticated users to view active company info for driver applications. Required for /apply/:slug route.';
