-- =============================================================================
-- Migration: 007_driver_applications.sql
-- Description: Extends drivers table for application workflow and creates
--              application_drafts table for auto-save functionality.
-- Reference: CODEX-TASK-007, AD-001 Driver Applications
-- =============================================================================

-- =============================================================================
-- 1. EXTEND DRIVERS TABLE FOR APPLICATIONS
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

-- =============================================================================
-- 2. APPLICATION DRAFTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS application_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One draft per user per company
  UNIQUE(user_id, company_id)
);

-- Indexes for drafts
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_company 
  ON application_drafts(user_id, company_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_application_drafts_updated_at ON application_drafts;
CREATE TRIGGER update_application_drafts_updated_at
  BEFORE UPDATE ON application_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. RLS POLICIES FOR APPLICATION_DRAFTS
-- =============================================================================

ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own drafts
CREATE POLICY "Users can view own drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own drafts"
  ON application_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own drafts"
  ON application_drafts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own drafts"
  ON application_drafts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view drafts for their company (for support purposes)
CREATE POLICY "Admins can view company drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Super admins can view all drafts
CREATE POLICY "Super admins can view all drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- 4. ADDITIONAL RLS FOR DRIVER SELF-INSERT (Applications)
-- =============================================================================

-- Allow prospective drivers to insert their own driver record during application
-- This supplements the existing admin policies
CREATE POLICY "Users can create own driver application"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow rejected drivers to update their record when reapplying
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

-- =============================================================================
-- 5. COMMENTS
-- =============================================================================

COMMENT ON TABLE application_drafts IS 'Stores in-progress driver application forms for auto-save';
COMMENT ON COLUMN application_drafts.form_data IS 'JSON object containing all form step data';
COMMENT ON COLUMN application_drafts.current_step IS 'Current step number in the application wizard';

COMMENT ON COLUMN drivers.application_submitted_at IS 'Timestamp when application was submitted';
COMMENT ON COLUMN drivers.license_front_url IS 'Storage path to front of drivers license photo';
COMMENT ON COLUMN drivers.license_back_url IS 'Storage path to back of drivers license photo';
COMMENT ON COLUMN drivers.experience_notes IS 'Free-form notes about driving experience';
COMMENT ON COLUMN drivers.referral_source IS 'How the applicant heard about the company';
COMMENT ON COLUMN drivers.rejected_at IS 'Timestamp when application was rejected';
COMMENT ON COLUMN drivers.can_reapply_at IS 'Date after which rejected applicant can reapply';
COMMENT ON COLUMN drivers.eula_accepted_at IS 'Timestamp when EULA was accepted';
COMMENT ON COLUMN drivers.eula_version IS 'Version of EULA that was accepted';
