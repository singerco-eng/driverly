-- =============================================================================
-- Migration: 019_fix_driver_vehicle_rls.sql
-- Description: Fixes circular dependency in RLS policies for driver vehicle creation
-- Issue: 1099 drivers couldn't create vehicle assignments because the vehicle
--        SELECT policy required an assignment to exist first (chicken-and-egg)
-- =============================================================================

-- =============================================================================
-- 1. CREATE HELPER FUNCTION TO CHECK VEHICLE OWNERSHIP (bypasses RLS)
-- =============================================================================

CREATE OR REPLACE FUNCTION check_vehicle_ownership(p_driver_id UUID, p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = p_vehicle_id
      AND v.owner_driver_id = p_driver_id
  );
$$;

COMMENT ON FUNCTION check_vehicle_ownership IS 
  'Security definer function to check if a driver owns a vehicle, bypassing RLS';

-- =============================================================================
-- 2. DROP AND RECREATE THE PROBLEMATIC POLICY
-- =============================================================================

-- Drop the existing policy that has the circular dependency
DROP POLICY IF EXISTS "1099 drivers can create own vehicle assignments" ON driver_vehicle_assignments;

-- Recreate with security definer function
CREATE POLICY "1099 drivers can create own vehicle assignments"
  ON driver_vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check that the authenticated user is a 1099 driver
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.user_id = auth.uid()
        AND d.employment_type = '1099'
        AND d.id = driver_id
        AND d.company_id = company_id
    )
    -- And check vehicle ownership using security definer function
    AND check_vehicle_ownership(driver_id, vehicle_id)
  );

-- =============================================================================
-- 3. ALSO ADD SELECT POLICY FOR DRIVERS ON THEIR OWN VEHICLES (newly created)
-- =============================================================================

-- This policy allows drivers to see vehicles they own even without an assignment
-- Uses a security definer approach to avoid the circular dependency

CREATE OR REPLACE FUNCTION driver_can_access_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vehicles v
    JOIN drivers d ON v.owner_driver_id = d.id
    WHERE v.id = p_vehicle_id
      AND d.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM driver_vehicle_assignments dva
    JOIN drivers d ON dva.driver_id = d.id
    WHERE dva.vehicle_id = p_vehicle_id
      AND d.user_id = auth.uid()
      AND dva.ended_at IS NULL
  );
$$;

COMMENT ON FUNCTION driver_can_access_vehicle IS 
  'Security definer function to check if authenticated driver can access a vehicle';

-- =============================================================================
-- 4. GRANT EXECUTE ON FUNCTIONS TO authenticated role
-- =============================================================================

GRANT EXECUTE ON FUNCTION check_vehicle_ownership TO authenticated;
GRANT EXECUTE ON FUNCTION driver_can_access_vehicle TO authenticated;

-- =============================================================================
-- 5. ADD SELECT POLICY FOR DRIVER ASSIGNMENTS
-- =============================================================================

-- Allow drivers to see their own assignments
DROP POLICY IF EXISTS "Drivers can view own assignments" ON driver_vehicle_assignments;
CREATE POLICY "Drivers can view own assignments"
  ON driver_vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_vehicle_assignments.driver_id
        AND d.user_id = auth.uid()
    )
  );

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON POLICY "1099 drivers can create own vehicle assignments" ON driver_vehicle_assignments IS 
  'Allows 1099 drivers to create vehicle assignments for vehicles they own';
