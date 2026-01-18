-- =============================================================================
-- Migration: 005_update_invitations_for_sa002.sql
-- Description: Updates invitations table to support SA-002 Admin Invitations feature
--              Adds tracking fields for resend, revoke, and acceptance
-- =============================================================================

-- Add new columns to invitations table
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Create index for token_hash lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON invitations(token_hash);

-- Create index for filtering by status and company
CREATE INDEX IF NOT EXISTS idx_invitations_company_status ON invitations(company_id, status);

-- Update status check constraint to include 'revoked'
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_status_check 
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

-- =============================================================================
-- RLS Policies for Invitations
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can view company invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create company invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update company invitations" ON invitations;

-- Super admins can do everything
CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can view invitations for their company
CREATE POLICY "Admins can view company invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can create invitations for their company
CREATE POLICY "Admins can create company invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can update invitations for their company (for resend/revoke)
CREATE POLICY "Admins can update company invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- =============================================================================
-- Public policy for accepting invitations (token lookup)
-- =============================================================================

-- Allow anyone to look up pending invitations by token hash (for accept flow)
CREATE POLICY "Anyone can lookup pending invitation by token"
  ON invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending' AND token_hash IS NOT NULL);

-- =============================================================================
-- Function to hash tokens
-- =============================================================================

CREATE OR REPLACE FUNCTION hash_invitation_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(sha256(token::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN invitations.token_hash IS 'SHA-256 hash of the invitation token for secure lookups';
COMMENT ON COLUMN invitations.resend_count IS 'Number of times the invitation has been resent';
COMMENT ON COLUMN invitations.last_resent_at IS 'Timestamp of the last resend';
COMMENT ON COLUMN invitations.revoked_at IS 'Timestamp when the invitation was revoked';
COMMENT ON COLUMN invitations.revoked_by IS 'User ID of the admin who revoked the invitation';
COMMENT ON COLUMN invitations.accepted_at IS 'Timestamp when the invitation was accepted';
