-- =============================================================================
-- Migration: 016_driver_profile.sql
-- Description: Adds tables and columns for DR-002 Driver Profile Management
--              including profile change audit log and notification preferences.
-- Reference: CODEX-TASK-010, DR-002 Profile Management
-- =============================================================================

-- =============================================================================
-- 1. DRIVER PROFILE CHANGE AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_profile_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Change details
  change_type VARCHAR(50) NOT NULL, -- 'personal_info', 'contact', 'address', 'license', 'emergency_contact', 'avatar'
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_profile_changes_driver 
  ON driver_profile_changes(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_profile_changes_company 
  ON driver_profile_changes(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_profile_changes_type 
  ON driver_profile_changes(change_type);

-- =============================================================================
-- 2. NOTIFICATION PREFERENCES
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_trip_assignments BOOLEAN DEFAULT true,
  email_credential_reminders BOOLEAN DEFAULT true,
  email_payment_notifications BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  
  -- Push preferences (future)
  push_trip_assignments BOOLEAN DEFAULT true,
  push_credential_reminders BOOLEAN DEFAULT true,
  push_payment_notifications BOOLEAN DEFAULT true,
  
  -- SMS preferences (future)
  sms_enabled BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. ADD PROFILE-SPECIFIC COLUMNS TO USERS TABLE
-- =============================================================================

-- Ensure users table has address columns (may already exist from earlier migrations)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20);

-- =============================================================================
-- 4. RLS POLICIES - DRIVER PROFILE CHANGES
-- =============================================================================

ALTER TABLE driver_profile_changes ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own profile change history
CREATE POLICY "Drivers can view own profile changes"
  ON driver_profile_changes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Drivers can insert their own profile changes
CREATE POLICY "Drivers can log own profile changes"
  ON driver_profile_changes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view profile changes for their company
CREATE POLICY "Admins can view company profile changes"
  ON driver_profile_changes FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Super admins full access
CREATE POLICY "Super admins full access to profile changes"
  ON driver_profile_changes FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- 5. RLS POLICIES - NOTIFICATION PREFERENCES
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notification preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins full access
CREATE POLICY "Super admins full access to notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- 6. STORAGE BUCKET FOR PROFILE PHOTOS
-- =============================================================================

-- Create bucket if not exists (idempotent via INSERT ... ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. STORAGE POLICIES FOR PROFILE PHOTOS
-- =============================================================================

-- Users can upload their own profile photos
CREATE POLICY "Users can upload own profile photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own profile photos
CREATE POLICY "Users can view own profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own profile photos
CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own profile photos
CREATE POLICY "Users can delete own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view profile photos for their company drivers
CREATE POLICY "Admins can view company driver profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN drivers d ON d.user_id = u.id
      WHERE u.id::text = (storage.foldername(name))[1]
        AND d.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

-- Super admins can access all profile photos
CREATE POLICY "Super admins full access to profile photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 8. HELPER FUNCTION: LOG PROFILE CHANGE
-- =============================================================================

CREATE OR REPLACE FUNCTION log_profile_change(
  p_driver_id UUID,
  p_user_id UUID,
  p_company_id UUID,
  p_change_type VARCHAR(50),
  p_field_name VARCHAR(100),
  p_old_value TEXT,
  p_new_value TEXT
)
RETURNS UUID AS $$
DECLARE
  v_change_id UUID;
BEGIN
  INSERT INTO driver_profile_changes (
    driver_id, user_id, company_id, change_type, field_name, old_value, new_value
  ) VALUES (
    p_driver_id, p_user_id, p_company_id, p_change_type, p_field_name, p_old_value, p_new_value
  )
  RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE driver_profile_changes IS 'Audit log for driver profile modifications';
COMMENT ON TABLE notification_preferences IS 'User notification preferences for email, push, and SMS';

COMMENT ON COLUMN driver_profile_changes.change_type IS 'Category of change: personal_info, contact, address, license, emergency_contact, avatar';
COMMENT ON COLUMN driver_profile_changes.field_name IS 'Specific field that was changed';

COMMENT ON FUNCTION log_profile_change IS 'Helper function to log profile changes for audit trail';
