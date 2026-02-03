-- =============================================================================
-- Migration: 032_security_definer_hardening.sql
-- Purpose: Add caller validation to SECURITY DEFINER functions
-- =============================================================================

-- AUDIT RESULTS:
-- ✅ SAFE: public.handle_new_user - trigger-only on auth.users insert
-- ✅ SAFE: sync_user_claims - trigger-only on users changes
-- ✅ SAFE: create_default_subscription - trigger-only on companies insert
-- ✅ SAFE: create_credential_submission_history - trigger-only on credential updates
-- ✅ SAFE: update_driver_has_payment_info - trigger-only on driver_payment_info changes
-- ✅ SAFE: update_driver_has_availability - trigger-only on driver_availability changes
-- ✅ SAFE: ensure_vehicle_credential - validates caller owns/assigned vehicle
-- ✅ SAFE: ensure_driver_credential - validates caller driver_id
-- ✅ SAFE: admin_ensure_driver_credential - validates admin role + company scope
-- ✅ SAFE: admin_ensure_vehicle_credential - validates admin role + company scope
-- ✅ SAFE: check_vehicle_ownership - used by RLS policy with caller validation
-- ✅ SAFE: driver_can_access_vehicle - used by RLS policy with auth.uid
-- ⚠️ FIXED: get_driver_required_credentials - added driver/admin scope check
-- ⚠️ FIXED: get_vehicle_required_credentials - added vehicle access check
-- ⚠️ FIXED: get_driver_active_brokers - added driver/admin scope check
-- ⚠️ FIXED: get_current_broker_rates - added broker access check
-- ⚠️ FIXED: get_vehicle_current_assignment - added vehicle access check
-- ⚠️ FIXED: get_driver_active_vehicles - added driver/admin scope check
-- ⚠️ FIXED: is_vehicle_available - added vehicle access check
-- ⚠️ FIXED: is_driver_profile_complete - added driver/admin scope check
-- ⚠️ FIXED: get_driver_onboarding_status - added driver/admin scope check
-- ⚠️ FIXED: log_profile_change - added actor + scope validation
-- ⚠️ FIXED: calculate_vehicle_completeness - added vehicle access check
-- ⚠️ FIXED: set_primary_vehicle - added driver/admin scope check
-- ⚠️ FIXED: can_driver_join_broker - added driver/admin scope check

-- =============================================================================
-- Helper: Role checks are inline per function (no shared function)
-- =============================================================================

-- =============================================================================
-- 1. Driver credential RPCs (latest definitions from 030)
-- =============================================================================

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
  v_driver_user_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  -- Get driver info
  SELECT d.company_id, d.employment_type, d.user_id
  INTO v_company_id, v_employment_type, v_driver_user_id
  FROM drivers d WHERE d.id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  -- Authorization: driver themselves or admin/coordinator in same company or super_admin
  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver_user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    ct.id AS credential_type_id,
    ct.name AS credential_type_name,
    ct.category,
    ct.scope,
    ct.broker_id,
    b.name::TEXT AS broker_name,
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
      ct.scope = 'global'
      OR (ct.scope = 'broker' AND ct.broker_id IN (
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
  v_owner_driver_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  -- Get vehicle info
  SELECT v.company_id, v.vehicle_type, v.owner_driver_id
  INTO v_company_id, v_vehicle_type, v_owner_driver_id
  FROM vehicles v WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  -- Authorization: admin/coordinator in same company, super_admin, or driver owner/assigned
  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = v_owner_driver_id
        AND d.user_id = v_user_id
    ) INTO v_is_owner;

    SELECT EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = p_vehicle_id
        AND d.user_id = v_user_id
        AND dva.ended_at IS NULL
    ) INTO v_is_assigned;

    IF NOT v_is_owner AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: not your vehicle';
    END IF;
  END IF;

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
      ct.scope = 'global'
      OR (ct.scope = 'broker' AND v_owner_driver_id IS NOT NULL AND ct.broker_id IN (
        SELECT dba.broker_id FROM driver_broker_assignments dba
        WHERE dba.driver_id = v_owner_driver_id
        AND dba.status IN ('assigned', 'requested')
      ))
    )
  ORDER BY ct.scope DESC, ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. Broker helper RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION get_driver_active_brokers(p_driver_id UUID)
RETURNS TABLE (
  broker_id UUID,
  broker_name TEXT,
  status TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
DECLARE
  v_company_id UUID;
  v_driver_user_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT d.company_id, d.user_id
  INTO v_company_id, v_driver_user_id
  FROM drivers d WHERE d.id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver_user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;

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

CREATE OR REPLACE FUNCTION get_current_broker_rates(p_broker_id UUID)
RETURNS TABLE (
  vehicle_type TEXT,
  base_rate DECIMAL(10,2),
  per_mile_rate DECIMAL(10,4),
  effective_from DATE
) AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT b.company_id INTO v_company_id
  FROM brokers b WHERE b.id = p_broker_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broker not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM driver_broker_assignments dba
      JOIN drivers d ON d.id = dba.driver_id
      WHERE dba.broker_id = p_broker_id
        AND d.user_id = v_user_id
        AND dba.status IN ('assigned', 'pending')
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: broker access required';
    END IF;
  END IF;

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

CREATE OR REPLACE FUNCTION can_driver_join_broker(
  p_driver_id UUID,
  p_broker_id UUID
)
RETURNS TABLE (
  can_join BOOLEAN,
  join_mode TEXT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_broker RECORD;
  v_driver RECORD;
  v_existing_assignment RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

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

  -- Authorization: driver themselves or admin/coordinator in same company or super_admin
  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_driver.company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver.user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
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

-- =============================================================================
-- 3. Vehicle assignment helpers
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
DECLARE
  v_company_id UUID;
  v_owner_driver_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT v.company_id, v.owner_driver_id
  INTO v_company_id, v_owner_driver_id
  FROM vehicles v WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = v_owner_driver_id
        AND d.user_id = v_user_id
    ) INTO v_is_owner;

    SELECT EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = p_vehicle_id
        AND d.user_id = v_user_id
        AND dva.ended_at IS NULL
    ) INTO v_is_assigned;

    IF NOT v_is_owner AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: not your vehicle';
    END IF;
  END IF;

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
DECLARE
  v_company_id UUID;
  v_driver_user_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT d.company_id, d.user_id
  INTO v_company_id, v_driver_user_id
  FROM drivers d WHERE d.id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver_user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;

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

CREATE OR REPLACE FUNCTION is_vehicle_available(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_company_id UUID;
  v_owner_driver_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
  has_active_assignment BOOLEAN;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT v.company_id, v.owner_driver_id
  INTO v_company_id, v_owner_driver_id
  FROM vehicles v WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = v_owner_driver_id
        AND d.user_id = v_user_id
    ) INTO v_is_owner;

    SELECT EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = p_vehicle_id
        AND d.user_id = v_user_id
        AND dva.ended_at IS NULL
    ) INTO v_is_assigned;

    IF NOT v_is_owner AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: not your vehicle';
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM driver_vehicle_assignments
    WHERE vehicle_id = p_vehicle_id
      AND ended_at IS NULL
  ) INTO has_active_assignment;
  
  RETURN NOT has_active_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. Driver onboarding/profile helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION is_driver_profile_complete(p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  driver_rec RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT * INTO driver_rec FROM drivers WHERE id = p_driver_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != driver_rec.company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF driver_rec.user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;
  
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
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT * INTO driver_rec FROM drivers WHERE id = p_driver_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != driver_rec.company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF driver_rec.user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;
  
  IF driver_rec.employment_type = '1099' THEN
    SELECT COUNT(*) INTO vehicle_count
    FROM driver_vehicle_assignments dva
    WHERE dva.driver_id = p_driver_id
      AND dva.ended_at IS NULL;
  ELSE
    vehicle_count := 1;
  END IF;
  
  RETURN QUERY SELECT
    is_driver_profile_complete(p_driver_id) AS profile_complete,
    (vehicle_count > 0) AS has_vehicle,
    driver_rec.has_availability,
    driver_rec.has_payment_info,
    (driver_rec.onboarding_completed_at IS NOT NULL) AS onboarding_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_driver RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  IF p_user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user mismatch';
  END IF;

  SELECT * INTO v_driver FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_driver.company_id OR v_driver.company_id != p_company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver.user_id != v_user_id OR v_driver.company_id != p_company_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;

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
-- 5. Vehicle helpers (completeness + primary vehicle)
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_vehicle_completeness(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_vehicle vehicles%ROWTYPE;
  v_is_complete BOOLEAN := true;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT * INTO v_vehicle FROM vehicles WHERE id = p_vehicle_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_vehicle.company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = v_vehicle.owner_driver_id
        AND d.user_id = v_user_id
    ) INTO v_is_owner;

    SELECT EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = p_vehicle_id
        AND d.user_id = v_user_id
        AND dva.ended_at IS NULL
    ) INTO v_is_assigned;

    IF NOT v_is_owner AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Unauthorized: not your vehicle';
    END IF;
  END IF;
  
  IF v_vehicle.make IS NULL OR v_vehicle.make = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.model IS NULL OR v_vehicle.model = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.year IS NULL THEN v_is_complete := false; END IF;
  IF v_vehicle.color IS NULL OR v_vehicle.color = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.license_plate IS NULL OR v_vehicle.license_plate = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.license_state IS NULL THEN v_is_complete := false; END IF;
  IF v_vehicle.vin IS NULL OR v_vehicle.vin = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.exterior_photo_url IS NULL THEN v_is_complete := false; END IF;
  
  IF v_vehicle.vehicle_type = 'wheelchair_van' AND v_vehicle.wheelchair_lift_photo_url IS NULL THEN
    v_is_complete := false;
  END IF;
  
  RETURN v_is_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_primary_vehicle(
  p_driver_id UUID,
  p_vehicle_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_driver RECORD;
  v_user_id UUID;
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  v_user_id := (SELECT auth.uid());
  v_user_role := (SELECT auth.jwt()) -> 'app_metadata' ->> 'role';
  v_user_company_id := ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid;

  SELECT * INTO v_driver FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;

  IF v_user_role = 'super_admin' THEN
    NULL;
  ELSIF v_user_role IN ('admin', 'coordinator') THEN
    IF v_user_company_id IS NULL OR v_user_company_id != v_driver.company_id THEN
      RAISE EXCEPTION 'Unauthorized: wrong company';
    END IF;
  ELSE
    IF v_driver.user_id != v_user_id THEN
      RAISE EXCEPTION 'Unauthorized: not your driver record';
    END IF;
  END IF;

  UPDATE driver_vehicle_assignments
  SET is_primary = false
  WHERE driver_id = p_driver_id
    AND is_primary = true
    AND ended_at IS NULL;
  
  UPDATE driver_vehicle_assignments
  SET is_primary = true
  WHERE driver_id = p_driver_id
    AND vehicle_id = p_vehicle_id
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
