-- Migration: 030_credential_publishing.sql
-- Purpose: Add draft/publish lifecycle to credential types

-- ============================================
-- 1. Add publishing columns
-- ============================================
ALTER TABLE credential_types
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.users(id);

DO $$
BEGIN
  ALTER TABLE credential_types
    ADD CONSTRAINT credential_types_status_check
    CHECK (status IN ('draft', 'scheduled', 'active', 'inactive'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Migrate existing data
-- ============================================
UPDATE credential_types
SET
  status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END,
  effective_date = created_at,
  published_at = CASE WHEN is_active = true THEN created_at ELSE NULL END
WHERE status IS NULL OR status = 'draft';

ALTER TABLE credential_types
  ALTER COLUMN status SET NOT NULL;

-- ============================================
-- 3. Update required credential RPCs
-- ============================================
DROP FUNCTION IF EXISTS get_driver_required_credentials(UUID);
DROP FUNCTION IF EXISTS get_vehicle_required_credentials(UUID);

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
  grace_period_days INTEGER,
  effective_date TIMESTAMPTZ,
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
    ct.grace_period_days,
    ct.effective_date,
    dc.id AS existing_credential_id,
    dc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN driver_credentials dc ON dc.credential_type_id = ct.id AND dc.driver_id = p_driver_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'driver'
    AND ct.status IN ('active', 'scheduled')
    AND (ct.effective_date IS NULL OR ct.effective_date <= NOW())
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
  grace_period_days INTEGER,
  effective_date TIMESTAMPTZ,
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
    ct.grace_period_days,
    ct.effective_date,
    vc.id AS existing_credential_id,
    vc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN vehicle_credentials vc ON vc.credential_type_id = ct.id AND vc.vehicle_id = p_vehicle_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'vehicle'
    AND ct.status IN ('active', 'scheduled')
    AND (ct.effective_date IS NULL OR ct.effective_date <= NOW())
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
