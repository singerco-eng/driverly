-- =============================================================================
-- Migration: 025_admin_ensure_vehicle_credential.sql
-- Description: Allow admins to create vehicle credentials for any vehicle in their company
-- =============================================================================

-- Function for admins to ensure a vehicle credential exists for any vehicle
CREATE OR REPLACE FUNCTION admin_ensure_vehicle_credential(
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
  v_user_role TEXT;
  v_user_company_id UUID;
BEGIN
  -- Get role and company from JWT claims
  v_user_role := auth.jwt() -> 'app_metadata' ->> 'role';
  v_user_company_id := (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid;

  -- Check if current user is an admin for this company (or super_admin)
  IF v_user_role NOT IN ('admin', 'super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Only admins can create credentials for vehicles';
  END IF;

  -- Ensure admin is in the same company (unless super_admin)
  IF v_user_role != 'super_admin' AND v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Admin can only manage vehicles in their own company';
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
GRANT EXECUTE ON FUNCTION admin_ensure_vehicle_credential(UUID, UUID, UUID) TO authenticated;
