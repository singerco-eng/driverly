-- =============================================================================
-- Fix Credentials RPC Functions
-- Run this in Supabase SQL Editor if get_driver_required_credentials fails
-- 
-- ISSUE: The brokers.name column is VARCHAR(255) but the function returns TEXT
-- This causes: "Returned type character varying(255) does not match expected type text in column 6."
-- FIX: Cast b.name::TEXT in the SELECT
-- =============================================================================

-- Drop and recreate the function with correct signature
DROP FUNCTION IF EXISTS get_driver_required_credentials(UUID);

CREATE OR REPLACE FUNCTION get_driver_required_credentials(p_driver_id UUID)
RETURNS TABLE (
  credential_type_id UUID,
  credential_type_name TEXT,
  category TEXT,
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
  v_employment_type TEXT;
BEGIN
  -- Get driver info
  SELECT d.company_id, d.employment_type
  INTO v_company_id, v_employment_type
  FROM drivers d WHERE d.id = p_driver_id;

  RETURN QUERY
  SELECT 
    ct.id AS credential_type_id,
    ct.name AS credential_type_name,
    ct.category,
    ct.scope,
    ct.broker_id,
    b.name::TEXT AS broker_name,  -- CAST to TEXT to match return type
    ct.submission_type,
    ct.requirement,
    dc.id AS existing_credential_id,
    dc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN driver_credentials dc ON dc.credential_type_id = ct.id AND dc.driver_id = p_driver_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'driver'
    AND ct.is_active = true
    AND (ct.employment_type = 'both' OR ct.employment_type = v_employment_type || '_only')
    AND (
      -- Global credentials always show
      ct.scope = 'global'
      OR
      -- Broker credentials show if driver is assigned to that broker
      (ct.scope = 'broker' AND ct.broker_id IN (
        SELECT dba.broker_id FROM driver_broker_assignments dba
        WHERE dba.driver_id = p_driver_id
        AND dba.status IN ('assigned', 'requested')
      ))
    )
  ORDER BY ct.scope DESC, ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_driver_required_credentials(UUID) TO authenticated;

-- Also fix get_vehicle_required_credentials which likely has the same issue
DROP FUNCTION IF EXISTS get_vehicle_required_credentials(UUID);

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
    b.name::TEXT AS broker_name,  -- CAST to TEXT
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
    AND (ct.vehicle_types IS NULL OR v_vehicle_type = ANY(ct.vehicle_types))
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_vehicle_required_credentials(UUID) TO authenticated;

-- Test the function with Test Driver 2
SELECT * FROM get_driver_required_credentials('6d052353-8f97-4169-b032-62b3c85d60c2');
