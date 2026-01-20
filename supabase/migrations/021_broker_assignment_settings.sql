-- =============================================================================
-- Migration: 021_broker_assignment_settings.sql
-- Description: Adds driver assignment mode settings and source type to brokers table
--              - Allows configuring: admin-only, driver-request, or auto-signup
--              - Adds source_type to categorize trip sources (brokers → trip sources)
-- =============================================================================

-- =============================================================================
-- 1. ADD SOURCE TYPE AND ASSIGNMENT MODE COLUMNS TO BROKERS
-- =============================================================================

-- Add source type column to categorize different types of trip sources
-- The table is still called "brokers" internally but UI will show "Trip Sources"
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'state_broker';

-- Add check constraint for valid source types
ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_source_type_check;
ALTER TABLE brokers ADD CONSTRAINT brokers_source_type_check
  CHECK (source_type IN ('state_broker', 'facility', 'insurance', 'private', 'corporate'));

-- Add index for source type filtering
CREATE INDEX IF NOT EXISTS idx_brokers_source_type ON brokers(company_id, source_type);

-- Add columns for controlling driver assignment behavior
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS allow_driver_requests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_driver_auto_signup BOOLEAN NOT NULL DEFAULT false;

-- Comments for documentation
COMMENT ON COLUMN brokers.source_type IS 
  'Type of trip source: state_broker (Medicaid broker), facility (hospital/nursing home/dialysis), insurance (healthcare network), private (individual client), corporate (employer contract)';

COMMENT ON COLUMN brokers.allow_driver_requests IS 
  'When true, drivers can request to join this trip source (pending admin approval). Drivers must be in service area.';

COMMENT ON COLUMN brokers.allow_driver_auto_signup IS 
  'When true, drivers can instantly join without approval (overrides allow_driver_requests). Drivers must be in service area.';

-- =============================================================================
-- 2. UPDATE RLS POLICY FOR DRIVER SELF-ASSIGNMENT
-- =============================================================================

-- Drop existing driver request policies (handles both old and new names)
DROP POLICY IF EXISTS "Drivers can request broker assignment" ON driver_broker_assignments;
DROP POLICY IF EXISTS "Drivers can request or auto-join broker" ON driver_broker_assignments;

-- Create new policy that supports both request and auto-signup modes
-- Drivers must be in the broker's service area to join
CREATE POLICY "Drivers can request or auto-join broker"
  ON driver_broker_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the driver's own record
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    -- Must be driver-initiated
    AND requested_by = 'driver'
    AND (
      -- Auto-signup mode: instant assignment if broker allows and driver in service area
      (
        status = 'assigned' 
        AND EXISTS (
          SELECT 1 FROM brokers b 
          JOIN drivers d ON d.id = driver_id
          WHERE b.id = broker_id 
            AND b.allow_driver_auto_signup = true
            AND b.status = 'active'
            AND (array_length(b.service_states, 1) IS NULL OR d.state = ANY(b.service_states))
        )
      )
      OR
      -- Request mode: pending status if broker allows requests and driver in service area
      (
        status = 'pending' 
        AND EXISTS (
          SELECT 1 FROM brokers b 
          JOIN drivers d ON d.id = driver_id
          WHERE b.id = broker_id 
            AND (b.allow_driver_requests = true OR b.allow_driver_auto_signup = true)
            AND b.status = 'active'
            AND (array_length(b.service_states, 1) IS NULL OR d.state = ANY(b.service_states))
        )
      )
    )
  );

-- =============================================================================
-- 3. ADD POLICY FOR DRIVERS TO CANCEL PENDING REQUESTS
-- =============================================================================

DROP POLICY IF EXISTS "Drivers can cancel pending requests" ON driver_broker_assignments;

CREATE POLICY "Drivers can cancel pending requests"
  ON driver_broker_assignments FOR DELETE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND status = 'pending'
    AND requested_by = 'driver'
  );

-- =============================================================================
-- 4. HELPER FUNCTION: Check if driver can join broker
-- =============================================================================

-- Drop and recreate to ensure clean state
DROP FUNCTION IF EXISTS can_driver_join_broker(UUID, UUID);

CREATE OR REPLACE FUNCTION can_driver_join_broker(
  p_driver_id UUID,
  p_broker_id UUID
)
RETURNS TABLE (
  can_join BOOLEAN,
  join_mode TEXT,  -- 'auto_signup', 'request', 'admin_only', or 'not_eligible'
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_broker RECORD;
  v_driver RECORD;
  v_existing_assignment RECORD;
BEGIN
  -- Get broker
  SELECT * INTO v_broker FROM brokers WHERE id = p_broker_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_eligible'::TEXT, 'Broker not found'::TEXT;
    RETURN;
  END IF;
  
  -- Get driver
  SELECT * INTO v_driver FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_eligible'::TEXT, 'Driver not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if broker is active
  IF v_broker.status != 'active' THEN
    RETURN QUERY SELECT false, 'not_eligible'::TEXT, 'Broker is not active'::TEXT;
    RETURN;
  END IF;
  
  -- Check existing assignment
  SELECT * INTO v_existing_assignment 
  FROM driver_broker_assignments 
  WHERE driver_id = p_driver_id AND broker_id = p_broker_id;
  
  IF FOUND THEN
    IF v_existing_assignment.status = 'assigned' THEN
      RETURN QUERY SELECT false, 'not_eligible'::TEXT, 'Already assigned to this broker'::TEXT;
    ELSIF v_existing_assignment.status = 'pending' THEN
      RETURN QUERY SELECT false, 'not_eligible'::TEXT, 'Request already pending'::TEXT;
    END IF;
    RETURN;
  END IF;
  
  -- Check service area (if broker has service states defined)
  IF array_length(v_broker.service_states, 1) > 0 THEN
    IF v_driver.state IS NULL OR NOT (v_driver.state = ANY(v_broker.service_states)) THEN
      RETURN QUERY SELECT false, 'not_eligible'::TEXT, 
        format('Driver state (%s) not in broker service area', COALESCE(v_driver.state, 'unknown'))::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Determine join mode
  IF v_broker.allow_driver_auto_signup THEN
    RETURN QUERY SELECT true, 'auto_signup'::TEXT, 'Driver can join instantly'::TEXT;
  ELSIF v_broker.allow_driver_requests THEN
    RETURN QUERY SELECT true, 'request'::TEXT, 'Driver can request to join'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'admin_only'::TEXT, 'Only admins can assign drivers to this broker'::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION can_driver_join_broker IS 
  'Checks if a driver can join a broker and returns the available join mode';

-- =============================================================================
-- 5. INDEX FOR ASSIGNMENT MODE QUERIES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_brokers_assignment_mode 
  ON brokers(company_id, allow_driver_requests, allow_driver_auto_signup)
  WHERE status = 'active';
