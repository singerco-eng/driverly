-- =============================================================================
-- Migration: 012_broker_management.sql
-- Description: Extends brokers table and adds broker assignments and rates
--              for AD-007 Broker Management feature
-- Reference: docs/features/admin/AD-007-broker-management.md
-- =============================================================================

-- =============================================================================
-- 1. EXTEND BROKERS TABLE
--    (brokers table created in 011_credential_types.sql with minimal fields)
-- =============================================================================

-- Add additional columns to brokers table
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS service_states TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_vehicle_types TEXT[] NOT NULL DEFAULT ARRAY['sedan', 'wheelchair_van', 'stretcher_van', 'suv', 'minivan'],
  ADD COLUMN IF NOT EXISTS accepted_employment_types TEXT[] NOT NULL DEFAULT ARRAY['w2', '1099'],
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add status check constraint
ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_status_check;
ALTER TABLE brokers ADD CONSTRAINT brokers_status_check 
  CHECK (status IN ('active', 'inactive'));

-- Index for status
CREATE INDEX IF NOT EXISTS idx_brokers_status ON brokers(company_id, status);

-- =============================================================================
-- 2. DRIVER-BROKER ASSIGNMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_broker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Driver requested, awaiting admin approval
    'assigned',     -- Admin approved/assigned
    'removed'       -- Removed from broker (soft delete for history)
  )),
  
  -- Request tracking
  requested_by TEXT NOT NULL CHECK (requested_by IN ('admin', 'driver')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Approval tracking
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  
  -- Removal tracking
  removed_by UUID REFERENCES users(id),
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint - one assignment per driver/broker
  UNIQUE(driver_id, broker_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_broker_driver ON driver_broker_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_broker ON driver_broker_assignments(broker_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_company ON driver_broker_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_status ON driver_broker_assignments(status);
CREATE INDEX IF NOT EXISTS idx_driver_broker_active ON driver_broker_assignments(driver_id, broker_id) 
  WHERE status = 'assigned';

-- RLS for driver_broker_assignments
ALTER TABLE driver_broker_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to broker assignments" ON driver_broker_assignments;
CREATE POLICY "Super admins full access to broker assignments"
  ON driver_broker_assignments FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker assignments" ON driver_broker_assignments;
CREATE POLICY "Admins can manage broker assignments"
  ON driver_broker_assignments FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company staff can view broker assignments" ON driver_broker_assignments;
CREATE POLICY "Company staff can view broker assignments"
  ON driver_broker_assignments FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own broker assignments" ON driver_broker_assignments;
CREATE POLICY "Drivers can view own broker assignments"
  ON driver_broker_assignments FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Drivers can request broker assignment" ON driver_broker_assignments;
CREATE POLICY "Drivers can request broker assignment"
  ON driver_broker_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND requested_by = 'driver'
    AND status = 'pending'
  );

-- =============================================================================
-- 3. BROKER RATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS broker_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Rate Configuration
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van')),
  
  -- Rates
  base_rate DECIMAL(10,2) NOT NULL,  -- Base rate per trip
  per_mile_rate DECIMAL(10,4) NOT NULL,  -- Rate per mile
  
  -- Effective Dates (for rate history)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,  -- NULL = current rate
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Only one active rate per broker/vehicle_type at a time
  UNIQUE(broker_id, vehicle_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_broker_rates_broker ON broker_rates(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_rates_company ON broker_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_broker_rates_active ON broker_rates(broker_id, effective_to) 
  WHERE effective_to IS NULL;

-- RLS for broker_rates
ALTER TABLE broker_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to broker rates" ON broker_rates;
CREATE POLICY "Super admins full access to broker rates"
  ON broker_rates FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker rates" ON broker_rates;
CREATE POLICY "Admins can manage broker rates"
  ON broker_rates FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view broker rates" ON broker_rates;
CREATE POLICY "Company members can view broker rates"
  ON broker_rates FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_broker_rates_updated_at ON broker_rates;
-- No updated_at column on broker_rates, but add one if needed
ALTER TABLE broker_rates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER update_broker_rates_updated_at
  BEFORE UPDATE ON broker_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. HELPER FUNCTION: Get Active Broker Assignments for Driver
-- =============================================================================

CREATE OR REPLACE FUNCTION get_driver_active_brokers(p_driver_id UUID)
RETURNS TABLE (
  broker_id UUID,
  broker_name TEXT,
  status TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS broker_id,
    b.name AS broker_name,
    dba.status,
    dba.approved_at AS assigned_at
  FROM driver_broker_assignments dba
  JOIN brokers b ON b.id = dba.broker_id
  WHERE dba.driver_id = p_driver_id
    AND dba.status = 'assigned'
    AND b.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. HELPER FUNCTION: Get Current Broker Rates
-- =============================================================================

CREATE OR REPLACE FUNCTION get_current_broker_rates(p_broker_id UUID)
RETURNS TABLE (
  vehicle_type TEXT,
  base_rate DECIMAL(10,2),
  per_mile_rate DECIMAL(10,4),
  effective_from DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.vehicle_type,
    br.base_rate,
    br.per_mile_rate,
    br.effective_from
  FROM broker_rates br
  WHERE br.broker_id = p_broker_id
    AND br.effective_to IS NULL
  ORDER BY br.vehicle_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. COMMENTS
-- =============================================================================

COMMENT ON TABLE driver_broker_assignments IS 'Links drivers to brokers with assignment status tracking';
COMMENT ON TABLE broker_rates IS 'Rate configuration per vehicle type per broker with history';

COMMENT ON COLUMN driver_broker_assignments.status IS 'pending = awaiting approval, assigned = active, removed = historical';
COMMENT ON COLUMN driver_broker_assignments.requested_by IS 'Whether admin or driver initiated the assignment request';

COMMENT ON COLUMN broker_rates.effective_from IS 'Date this rate became active';
COMMENT ON COLUMN broker_rates.effective_to IS 'Date this rate ended (NULL = currently active)';

COMMENT ON COLUMN brokers.service_states IS 'Array of US state codes where broker operates';
COMMENT ON COLUMN brokers.accepted_vehicle_types IS 'Vehicle types broker accepts for trips';
COMMENT ON COLUMN brokers.accepted_employment_types IS 'Employment types (w2, 1099) broker works with';
