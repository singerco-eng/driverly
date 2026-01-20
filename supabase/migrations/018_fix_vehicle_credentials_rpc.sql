-- =============================================================================
-- Migration: 018_fix_vehicle_credentials_rpc.sql
-- Description: Fix get_vehicle_required_credentials to handle empty arrays
--              Empty array [] was being treated differently than NULL
-- Reference: CODEX-TASK-014 Vehicle Details Page Bugs
-- =============================================================================

-- =============================================================================
-- 1. FIX EXISTING DATA
-- Update credential_types with empty vehicle_types array to NULL
-- =============================================================================

UPDATE credential_types 
SET vehicle_types = NULL 
WHERE vehicle_types = '{}' OR vehicle_types = '[]';

-- =============================================================================
-- 2. UPDATE RPC FUNCTION
-- Fix the vehicle_types check to handle empty arrays same as NULL
-- =============================================================================

CREATE OR REPLACE FUNCTION get_vehicle_required_credentials(p_vehicle_id UUID)
RETURNS TABLE (
  credential_type_id UUID,
  credential_type_name TEXT,
  scope TEXT,
  broker_id UUID,
  broker_name TEXT,
  submission_type TEXT,
  requirement TEXT,
  existing_credential_id UUID,
  current_status TEXT
) AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_type TEXT;
  v_driver_id UUID;
BEGIN
  -- Get vehicle info
  SELECT v.company_id, v.vehicle_type, v.owner_driver_id
  INTO v_company_id, v_vehicle_type, v_driver_id
  FROM vehicles v WHERE v.id = p_vehicle_id;

  RETURN QUERY
  SELECT 
    ct.id AS credential_type_id,
    ct.name AS credential_type_name,
    ct.scope,
    ct.broker_id,
    b.name::TEXT AS broker_name,
    ct.submission_type,
    ct.requirement,
    vc.id AS existing_credential_id,
    vc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN vehicle_credentials vc ON vc.credential_type_id = ct.id AND vc.vehicle_id = p_vehicle_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'vehicle'
    AND ct.is_active = true
    -- FIX: Handle NULL, empty array, or matching vehicle type
    AND (
      ct.vehicle_types IS NULL 
      OR ct.vehicle_types = '{}' 
      OR cardinality(ct.vehicle_types) = 0
      OR v_vehicle_type = ANY(ct.vehicle_types)
    )
    AND (
      -- Global credentials always show
      ct.scope = 'global'
      OR
      -- Broker credentials show if vehicle owner is assigned to that broker
      (ct.scope = 'broker' AND v_driver_id IS NOT NULL AND ct.broker_id IN (
        SELECT dba.broker_id FROM driver_broker_assignments dba
        WHERE dba.driver_id = v_driver_id
        AND dba.status IN ('assigned', 'requested')
      ))
    )
  ORDER BY ct.scope DESC, ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. COMMENTS
-- =============================================================================

COMMENT ON FUNCTION get_vehicle_required_credentials IS 'Returns all credential types a vehicle needs. Fixed to handle empty vehicle_types arrays.';
