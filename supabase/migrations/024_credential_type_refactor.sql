-- Migration: 024_credential_type_refactor.sql
-- Purpose: Refactor credential types to derive requirements from instruction_config

-- ============================================
-- 1. Add requires_driver_action flag
-- ============================================
-- This replaces the behavioral aspect of admin_verified
-- When false, the credential is managed entirely by admins

ALTER TABLE credential_types
  ADD COLUMN IF NOT EXISTS requires_driver_action boolean NOT NULL DEFAULT true;

-- Migrate existing admin_verified credentials
UPDATE credential_types
  SET requires_driver_action = false
  WHERE submission_type = 'admin_verified';

-- ============================================
-- 2. Make submission_type optional
-- ============================================
-- Keep for backwards compatibility with legacy credentials
-- New credentials won't need this field

ALTER TABLE credential_types
  ALTER COLUMN submission_type DROP NOT NULL;

-- ============================================
-- 3. Update required credential RPCs
-- ============================================

CREATE OR REPLACE FUNCTION get_driver_required_credentials(p_driver_id UUID)
RETURNS TABLE (
  credential_type_id UUID,
  credential_type_name TEXT,
  category TEXT,
  scope TEXT,
  broker_id UUID,
  broker_name TEXT,
  submission_type TEXT,
  requires_driver_action boolean,
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
    b.name::TEXT AS broker_name,  -- Cast VARCHAR to TEXT
    ct.submission_type,
    ct.requires_driver_action,
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

CREATE OR REPLACE FUNCTION get_vehicle_required_credentials(p_vehicle_id UUID)
RETURNS TABLE (
  credential_type_id UUID,
  credential_type_name TEXT,
  scope TEXT,
  broker_id UUID,
  broker_name TEXT,
  submission_type TEXT,
  requires_driver_action boolean,
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
    ct.requires_driver_action,
    ct.requirement,
    vc.id AS existing_credential_id,
    vc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN vehicle_credentials vc ON vc.credential_type_id = ct.id AND vc.vehicle_id = p_vehicle_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'vehicle'
    AND ct.is_active = true
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

-- ============================================
-- 4. Add comments
-- ============================================

COMMENT ON COLUMN credential_types.requires_driver_action IS
  'If false, this credential is admin-managed and doesn''t require driver submission';

COMMENT ON COLUMN credential_types.submission_type IS
  'DEPRECATED: Legacy field for backwards compatibility. New credentials use instruction_config instead.';
