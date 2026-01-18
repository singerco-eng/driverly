-- =============================================================================
-- Migration: 014_driver_onboarding.sql
-- Description: Adds driver onboarding tracking, status management, and
--              progress persistence for DR-001 Driver Onboarding feature
-- Reference: docs/features/driver/DR-001-onboarding.md
-- =============================================================================

-- =============================================================================
-- 1. EXTEND DRIVERS TABLE FOR ONBOARDING
-- =============================================================================

-- Add onboarding tracking columns
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_modal_dismissed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_payment_info BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_availability BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_drivers_onboarding 
  ON drivers(company_id) 
  WHERE onboarding_completed_at IS NULL;

-- =============================================================================
-- 2. DRIVER ONBOARDING PROGRESS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Checklist items
  item_key TEXT NOT NULL,  -- 'profile_complete', 'vehicle_added', etc.
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint per driver/item
  UNIQUE(driver_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_driver ON driver_onboarding_progress(driver_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_company ON driver_onboarding_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_incomplete ON driver_onboarding_progress(driver_id) 
  WHERE completed = false;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_driver_onboarding_progress_updated_at ON driver_onboarding_progress;
CREATE TRIGGER update_driver_onboarding_progress_updated_at
  BEFORE UPDATE ON driver_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. RLS POLICIES FOR DRIVER ONBOARDING PROGRESS
-- =============================================================================

ALTER TABLE driver_onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Super admins full access to onboarding progress"
  ON driver_onboarding_progress FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Admins can view company onboarding progress"
  ON driver_onboarding_progress FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can view own onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Drivers can view own onboarding progress"
  ON driver_onboarding_progress FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Drivers can manage own onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Drivers can manage own onboarding progress"
  ON driver_onboarding_progress FOR ALL
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 4. DRIVER AVAILABILITY TABLE (placeholder for availability scheduling)
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Time range
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Active flag
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique per driver/day
  UNIQUE(driver_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_availability_driver ON driver_availability(driver_id);

DROP TRIGGER IF EXISTS update_driver_availability_updated_at ON driver_availability;
CREATE TRIGGER update_driver_availability_updated_at
  BEFORE UPDATE ON driver_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for driver_availability
ALTER TABLE driver_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to availability" ON driver_availability;
CREATE POLICY "Super admins full access to availability"
  ON driver_availability FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company availability" ON driver_availability;
CREATE POLICY "Admins can view company availability"
  ON driver_availability FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can manage own availability" ON driver_availability;
CREATE POLICY "Drivers can manage own availability"
  ON driver_availability FOR ALL
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- =============================================================================
-- 5. DRIVER PAYMENT INFO TABLE (placeholder)
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_payment_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Payment method type
  payment_method TEXT NOT NULL CHECK (payment_method IN ('direct_deposit', 'check', 'paycard')),
  
  -- Bank info (encrypted in production - stored as text for now)
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  routing_number_last4 CHAR(4),  -- Only store last 4 for display
  account_number_last4 CHAR(4),  -- Only store last 4 for display
  
  -- Check mailing address (if applicable)
  check_address_line1 TEXT,
  check_address_line2 TEXT,
  check_city TEXT,
  check_state TEXT,
  check_zip TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_info_driver ON driver_payment_info(driver_id);

DROP TRIGGER IF EXISTS update_driver_payment_info_updated_at ON driver_payment_info;
CREATE TRIGGER update_driver_payment_info_updated_at
  BEFORE UPDATE ON driver_payment_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for driver_payment_info
ALTER TABLE driver_payment_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to payment info" ON driver_payment_info;
CREATE POLICY "Super admins full access to payment info"
  ON driver_payment_info FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company payment info" ON driver_payment_info;
CREATE POLICY "Admins can view company payment info"
  ON driver_payment_info FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can manage own payment info" ON driver_payment_info;
CREATE POLICY "Drivers can manage own payment info"
  ON driver_payment_info FOR ALL
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- =============================================================================
-- 6. HELPER FUNCTION: Check if Driver Profile is Complete
-- =============================================================================

CREATE OR REPLACE FUNCTION is_driver_profile_complete(p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  driver_rec RECORD;
BEGIN
  SELECT * INTO driver_rec FROM drivers WHERE id = p_driver_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check required fields
  RETURN (
    driver_rec.date_of_birth IS NOT NULL
    AND driver_rec.address_line1 IS NOT NULL
    AND driver_rec.city IS NOT NULL
    AND driver_rec.state IS NOT NULL
    AND driver_rec.zip IS NOT NULL
    AND driver_rec.license_number IS NOT NULL
    AND driver_rec.license_state IS NOT NULL
    AND driver_rec.license_expiration IS NOT NULL
    AND driver_rec.emergency_contact_name IS NOT NULL
    AND driver_rec.emergency_contact_phone IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. HELPER FUNCTION: Get Onboarding Completion Status
-- =============================================================================

CREATE OR REPLACE FUNCTION get_driver_onboarding_status(p_driver_id UUID)
RETURNS TABLE (
  profile_complete BOOLEAN,
  has_vehicle BOOLEAN,
  has_availability BOOLEAN,
  has_payment_info BOOLEAN,
  onboarding_complete BOOLEAN
) AS $$
DECLARE
  driver_rec RECORD;
  vehicle_count INTEGER;
BEGIN
  SELECT * INTO driver_rec FROM drivers WHERE id = p_driver_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check vehicle for 1099 drivers
  IF driver_rec.employment_type = '1099' THEN
    SELECT COUNT(*) INTO vehicle_count
    FROM driver_vehicle_assignments dva
    WHERE dva.driver_id = p_driver_id
      AND dva.ended_at IS NULL;
  ELSE
    vehicle_count := 1; -- W2 doesn't need own vehicle
  END IF;
  
  RETURN QUERY SELECT
    is_driver_profile_complete(p_driver_id) AS profile_complete,
    (vehicle_count > 0) AS has_vehicle,
    driver_rec.has_availability,
    driver_rec.has_payment_info,
    (driver_rec.onboarding_completed_at IS NOT NULL) AS onboarding_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. TRIGGER: Auto-update has_payment_info when payment info added
-- =============================================================================

CREATE OR REPLACE FUNCTION update_driver_has_payment_info()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE drivers SET has_payment_info = true WHERE id = NEW.driver_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drivers SET has_payment_info = false WHERE id = OLD.driver_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_has_payment_info ON driver_payment_info;
CREATE TRIGGER trigger_update_has_payment_info
  AFTER INSERT OR UPDATE OR DELETE ON driver_payment_info
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_has_payment_info();

-- =============================================================================
-- 9. TRIGGER: Auto-update has_availability when availability added
-- =============================================================================

CREATE OR REPLACE FUNCTION update_driver_has_availability()
RETURNS TRIGGER AS $$
DECLARE
  availability_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT COUNT(*) INTO availability_count
    FROM driver_availability
    WHERE driver_id = NEW.driver_id AND is_active = true;
    
    UPDATE drivers SET has_availability = (availability_count > 0) WHERE id = NEW.driver_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO availability_count
    FROM driver_availability
    WHERE driver_id = OLD.driver_id AND is_active = true;
    
    UPDATE drivers SET has_availability = (availability_count > 0) WHERE id = OLD.driver_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_has_availability ON driver_availability;
CREATE TRIGGER trigger_update_has_availability
  AFTER INSERT OR UPDATE OR DELETE ON driver_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_has_availability();

-- =============================================================================
-- 10. COMMENTS
-- =============================================================================

COMMENT ON TABLE driver_onboarding_progress IS 'Tracks driver completion of onboarding checklist items';
COMMENT ON TABLE driver_availability IS 'Weekly availability schedule for drivers';
COMMENT ON TABLE driver_payment_info IS 'Payment information for driver payouts';

COMMENT ON COLUMN drivers.onboarding_completed_at IS 'Timestamp when driver first went active';
COMMENT ON COLUMN drivers.welcome_modal_dismissed IS 'Whether driver dismissed the welcome modal';
COMMENT ON COLUMN drivers.has_payment_info IS 'Auto-set true when payment info added';
COMMENT ON COLUMN drivers.has_availability IS 'Auto-set true when availability set';
COMMENT ON COLUMN drivers.status_reason IS 'Optional reason when driver goes inactive';

COMMENT ON COLUMN driver_onboarding_progress.item_key IS 'Checklist item identifier: profile_complete, vehicle_added, etc.';
