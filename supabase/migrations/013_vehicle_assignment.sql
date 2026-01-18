-- =============================================================================
-- Migration: 013_vehicle_assignment.sql
-- Description: Extends driver_vehicle_assignments and adds history tracking
--              for AD-004 Vehicle Assignment feature
-- Reference: docs/features/admin/AD-004-vehicle-assignment.md
-- =============================================================================

-- =============================================================================
-- 1. EXTEND DRIVER_VEHICLE_ASSIGNMENTS TABLE
-- =============================================================================

-- Add new columns for assignment tracking
ALTER TABLE driver_vehicle_assignments
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Update assignment_type check constraint to include 'borrowed'
ALTER TABLE driver_vehicle_assignments DROP CONSTRAINT IF EXISTS driver_vehicle_assignments_assignment_type_check;
ALTER TABLE driver_vehicle_assignments ADD CONSTRAINT driver_vehicle_assignments_assignment_type_check 
  CHECK (assignment_type IN ('owned', 'assigned', 'borrowed'));

-- Migrate 'shared' to 'borrowed' if any exist
UPDATE driver_vehicle_assignments SET assignment_type = 'borrowed' WHERE assignment_type = 'shared';

-- Add index for active assignments
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_active 
  ON driver_vehicle_assignments(vehicle_id) 
  WHERE ended_at IS NULL;

-- Add index for primary vehicles
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_primary 
  ON driver_vehicle_assignments(driver_id) 
  WHERE is_primary = true AND ended_at IS NULL;

-- =============================================================================
-- 2. VEHICLE ASSIGNMENT HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicle_assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment details at time of change
  assignment_type TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  
  -- Action
  action TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned', 'transferred', 'primary_changed', 'extended', 'ended_early')),
  
  -- Duration
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Who and why
  performed_by UUID REFERENCES users(id),
  reason TEXT,
  notes TEXT,
  
  -- Related assignment (for linking)
  assignment_id UUID REFERENCES driver_vehicle_assignments(id) ON DELETE SET NULL,
  
  -- To driver (for transfers)
  transferred_to_driver_id UUID REFERENCES drivers(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_vehicle ON vehicle_assignment_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_driver ON vehicle_assignment_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_company ON vehicle_assignment_history(company_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_action ON vehicle_assignment_history(action);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created ON vehicle_assignment_history(created_at DESC);

-- =============================================================================
-- 3. RLS POLICIES FOR VEHICLE ASSIGNMENT HISTORY
-- =============================================================================

ALTER TABLE vehicle_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to assignment history" ON vehicle_assignment_history;
CREATE POLICY "Super admins full access to assignment history"
  ON vehicle_assignment_history FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can view company assignment history"
  ON vehicle_assignment_history FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can insert company assignment history"
  ON vehicle_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can view own assignment history" ON vehicle_assignment_history;
CREATE POLICY "Drivers can view own assignment history"
  ON vehicle_assignment_history FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 4. HELPER FUNCTION: Get Vehicle's Current Assignment
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vehicle_current_assignment(p_vehicle_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  driver_id UUID,
  driver_name TEXT,
  assignment_type TEXT,
  is_primary BOOLEAN,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dva.id AS assignment_id,
    dva.driver_id,
    u.full_name AS driver_name,
    dva.assignment_type,
    dva.is_primary,
    dva.starts_at,
    dva.ends_at
  FROM driver_vehicle_assignments dva
  JOIN drivers d ON d.id = dva.driver_id
  JOIN users u ON u.id = d.user_id
  WHERE dva.vehicle_id = p_vehicle_id
    AND dva.ended_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. HELPER FUNCTION: Get Driver's Active Assignments
-- =============================================================================

CREATE OR REPLACE FUNCTION get_driver_active_vehicles(p_driver_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  vehicle_id UUID,
  vehicle_name TEXT,
  vehicle_type TEXT,
  license_plate TEXT,
  assignment_type TEXT,
  is_primary BOOLEAN,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dva.id AS assignment_id,
    dva.vehicle_id,
    (v.year::TEXT || ' ' || v.make || ' ' || v.model) AS vehicle_name,
    v.vehicle_type,
    v.license_plate,
    dva.assignment_type,
    dva.is_primary,
    dva.starts_at,
    dva.ends_at
  FROM driver_vehicle_assignments dva
  JOIN vehicles v ON v.id = dva.vehicle_id
  WHERE dva.driver_id = p_driver_id
    AND dva.ended_at IS NULL
  ORDER BY dva.is_primary DESC, dva.starts_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. HELPER FUNCTION: Check if Vehicle is Available
-- =============================================================================

CREATE OR REPLACE FUNCTION is_vehicle_available(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_active_assignment BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM driver_vehicle_assignments
    WHERE vehicle_id = p_vehicle_id
      AND ended_at IS NULL
  ) INTO has_active_assignment;
  
  RETURN NOT has_active_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. COMMENTS
-- =============================================================================

COMMENT ON TABLE vehicle_assignment_history IS 'Audit log for all vehicle assignment changes';

COMMENT ON COLUMN driver_vehicle_assignments.starts_at IS 'When the assignment becomes active';
COMMENT ON COLUMN driver_vehicle_assignments.ends_at IS 'Scheduled end date (for borrowed assignments)';
COMMENT ON COLUMN driver_vehicle_assignments.ended_at IS 'When assignment was actually ended (null = active)';
COMMENT ON COLUMN driver_vehicle_assignments.end_reason IS 'Reason for ending the assignment';

COMMENT ON COLUMN vehicle_assignment_history.action IS 'assigned, unassigned, transferred, primary_changed, extended, ended_early';
COMMENT ON COLUMN vehicle_assignment_history.transferred_to_driver_id IS 'For transfers, the driver receiving the vehicle';
