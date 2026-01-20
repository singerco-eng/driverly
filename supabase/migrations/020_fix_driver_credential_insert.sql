-- =============================================================================
-- Migration: 020_fix_driver_credential_insert.sql
-- Description: Allow drivers to create/update vehicle and driver credentials
-- =============================================================================

-- =============================================================================
-- 1. SECURITY DEFINER FUNCTION FOR VEHICLE CREDENTIAL INSERTION
-- =============================================================================

-- Function to ensure a vehicle credential exists for a driver's vehicle
CREATE OR REPLACE FUNCTION ensure_vehicle_credential(
  p_vehicle_id UUID,
  p_credential_type_id UUID,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_driver_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_assigned BOOLEAN := FALSE;
BEGIN
  -- Get driver ID for current user
  SELECT id INTO v_driver_id
  FROM drivers
  WHERE user_id = auth.uid();

  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'No driver record found for current user';
  END IF;

  -- Check if user owns the vehicle
  SELECT EXISTS (
    SELECT 1 FROM vehicles
    WHERE id = p_vehicle_id
    AND owner_driver_id = v_driver_id
  ) INTO v_is_owner;

  -- Check if user is assigned to the vehicle
  SELECT EXISTS (
    SELECT 1 FROM driver_vehicle_assignments
    WHERE vehicle_id = p_vehicle_id
    AND driver_id = v_driver_id
  ) INTO v_is_assigned;

  IF NOT v_is_owner AND NOT v_is_assigned THEN
    RAISE EXCEPTION 'User does not have access to this vehicle';
  END IF;

  -- Check if credential already exists
  SELECT id INTO v_existing_id
  FROM vehicle_credentials
  WHERE vehicle_id = p_vehicle_id
  AND credential_type_id = p_credential_type_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Insert new credential
  INSERT INTO vehicle_credentials (
    vehicle_id,
    credential_type_id,
    company_id,
    status
  ) VALUES (
    p_vehicle_id,
    p_credential_type_id,
    p_company_id,
    'not_submitted'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION ensure_vehicle_credential(UUID, UUID, UUID) TO authenticated;

-- =============================================================================
-- 2. SECURITY DEFINER FUNCTION FOR DRIVER CREDENTIAL INSERTION
-- =============================================================================

-- Function to ensure a driver credential exists for the current driver
CREATE OR REPLACE FUNCTION ensure_driver_credential(
  p_driver_id UUID,
  p_credential_type_id UUID,
  p_company_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_current_driver_id UUID;
BEGIN
  -- Get driver ID for current user
  SELECT id INTO v_current_driver_id
  FROM drivers
  WHERE user_id = auth.uid();

  IF v_current_driver_id IS NULL THEN
    RAISE EXCEPTION 'No driver record found for current user';
  END IF;

  -- Verify user is creating credential for themselves
  IF v_current_driver_id != p_driver_id THEN
    RAISE EXCEPTION 'Can only create credentials for your own driver record';
  END IF;

  -- Check if credential already exists
  SELECT id INTO v_existing_id
  FROM driver_credentials
  WHERE driver_id = p_driver_id
  AND credential_type_id = p_credential_type_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Insert new credential
  INSERT INTO driver_credentials (
    driver_id,
    credential_type_id,
    company_id,
    status
  ) VALUES (
    p_driver_id,
    p_credential_type_id,
    p_company_id,
    'not_submitted'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION ensure_driver_credential(UUID, UUID, UUID) TO authenticated;

-- =============================================================================
-- 3. RLS POLICIES FOR DRIVER UPDATES TO CREDENTIALS
-- =============================================================================

-- Allow drivers to update their own vehicle credentials
CREATE POLICY "Drivers can update own vehicle credentials"
  ON vehicle_credentials FOR UPDATE
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN drivers d ON v.owner_driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
    OR vehicle_id IN (
      SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN drivers d ON v.owner_driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
    OR vehicle_id IN (
      SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

-- Check if driver_credentials already has update policy for drivers
DO $$
BEGIN
  -- Allow drivers to update their own driver credentials
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_credentials' 
    AND policyname = 'Drivers can update own driver credentials'
  ) THEN
    CREATE POLICY "Drivers can update own driver credentials"
      ON driver_credentials FOR UPDATE
      TO authenticated
      USING (
        driver_id IN (
          SELECT id FROM drivers
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        driver_id IN (
          SELECT id FROM drivers
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
