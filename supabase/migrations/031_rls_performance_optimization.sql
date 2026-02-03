-- =============================================================================
-- Migration: 031_rls_performance_optimization.sql
-- Purpose: Wrap auth.uid() and auth.jwt() in SELECT for query optimizer caching
-- Reference: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
-- =============================================================================

-- =============================================================================
-- Table: companies
-- Optimization: Wrap auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all companies" ON companies;
CREATE POLICY "Super admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- Table: users
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company users" ON users;
CREATE POLICY "Admins can manage company users"
  ON users FOR ALL
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Coordinators can view company users" ON users;
CREATE POLICY "Coordinators can view company users"
  ON users FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'coordinator'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- =============================================================================
-- Table: invitations
-- Optimization: Wrap auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;
CREATE POLICY "Super admins can manage all invitations"
  ON invitations FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company invitations" ON invitations;
CREATE POLICY "Admins can manage company invitations"
  ON invitations FOR ALL
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

-- =============================================================================
-- Table: drivers
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to drivers" ON drivers;
CREATE POLICY "Super admins full access to drivers"
  ON drivers FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company drivers" ON drivers;
CREATE POLICY "Admins can view company drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can create company drivers" ON drivers;
CREATE POLICY "Admins can create company drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can update company drivers" ON drivers;
CREATE POLICY "Admins can update company drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can delete company drivers" ON drivers;
CREATE POLICY "Admins can delete company drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Drivers can view own record" ON drivers;
CREATE POLICY "Drivers can view own record"
  ON drivers FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Drivers can update own record" ON drivers;
CREATE POLICY "Drivers can update own record"
  ON drivers FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own driver application" ON drivers;
CREATE POLICY "Users can create own driver application"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Rejected drivers can reapply" ON drivers;
CREATE POLICY "Rejected drivers can reapply"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND application_status = 'rejected'
    AND can_reapply_at IS NOT NULL
    AND can_reapply_at <= NOW()
  )
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =============================================================================
-- Table: vehicles
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to vehicles" ON vehicles;
CREATE POLICY "Super admins full access to vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company vehicles" ON vehicles;
CREATE POLICY "Admins can view company vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can create company vehicles" ON vehicles;
CREATE POLICY "Admins can create company vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can update company vehicles" ON vehicles;
CREATE POLICY "Admins can update company vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can delete company vehicles" ON vehicles;
CREATE POLICY "Admins can delete company vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Drivers can view assigned vehicles" ON vehicles;
CREATE POLICY "Drivers can view assigned vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE dva.vehicle_id = vehicles.id
        AND d.user_id = (SELECT auth.uid())
        AND dva.ended_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Drivers can view owned vehicles" ON vehicles;
CREATE POLICY "Drivers can view owned vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "1099 drivers can create own vehicles" ON vehicles;
CREATE POLICY "1099 drivers can create own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
        AND d.id = owner_driver_id
        AND d.company_id = company_id
    )
  );

DROP POLICY IF EXISTS "1099 drivers can update own vehicles" ON vehicles;
CREATE POLICY "1099 drivers can update own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
    )
  );

DROP POLICY IF EXISTS "W2 drivers can update assigned vehicle photos" ON vehicles;
CREATE POLICY "W2 drivers can update assigned vehicle photos"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = vehicles.id
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = 'w2'
        AND dva.ended_at IS NULL
    )
  );

-- =============================================================================
-- Table: driver_vehicle_assignments
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to assignments" ON driver_vehicle_assignments;
CREATE POLICY "Super admins full access to assignments"
  ON driver_vehicle_assignments FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company assignments" ON driver_vehicle_assignments;
CREATE POLICY "Admins can view company assignments"
  ON driver_vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Admins can manage company assignments" ON driver_vehicle_assignments;
CREATE POLICY "Admins can manage company assignments"
  ON driver_vehicle_assignments FOR ALL
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Drivers can view own assignments" ON driver_vehicle_assignments;
CREATE POLICY "Drivers can view own assignments"
  ON driver_vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_vehicle_assignments.driver_id
        AND d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "1099 drivers can create own vehicle assignments" ON driver_vehicle_assignments;
CREATE POLICY "1099 drivers can create own vehicle assignments"
  ON driver_vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
        AND d.id = driver_id
        AND d.company_id = company_id
    )
    AND check_vehicle_ownership(driver_id, vehicle_id)
  );

DROP POLICY IF EXISTS "1099 drivers can update own assignments" ON driver_vehicle_assignments;
CREATE POLICY "1099 drivers can update own assignments"
  ON driver_vehicle_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_vehicle_assignments.driver_id
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
    )
  );

-- =============================================================================
-- Table: application_drafts
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own drafts" ON application_drafts;
CREATE POLICY "Users can view own drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own drafts" ON application_drafts;
CREATE POLICY "Users can create own drafts"
  ON application_drafts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own drafts" ON application_drafts;
CREATE POLICY "Users can update own drafts"
  ON application_drafts FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own drafts" ON application_drafts;
CREATE POLICY "Users can delete own drafts"
  ON application_drafts FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view company drafts" ON application_drafts;
CREATE POLICY "Admins can view company drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Super admins can view all drafts" ON application_drafts;
CREATE POLICY "Super admins can view all drafts"
  ON application_drafts FOR SELECT
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- Table: storage.objects (credential-documents)
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Users can upload to own application folder" ON storage.objects;
CREATE POLICY "Users can upload to own application folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'credential-documents' 
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own uploads" ON storage.objects;
CREATE POLICY "Users can view own uploads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Admins can view company credential documents" ON storage.objects;
CREATE POLICY "Admins can view company credential documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE u.id::text = (storage.foldername(name))[1]
        AND d.company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Super admins can view all credential documents" ON storage.objects;
CREATE POLICY "Super admins can view all credential documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'credential-documents'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- Table: brokers
-- Optimization: Wrap auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to brokers" ON brokers;
CREATE POLICY "Super admins full access to brokers"
  ON brokers FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company brokers" ON brokers;
CREATE POLICY "Admins can manage company brokers"
  ON brokers FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view brokers" ON brokers;
CREATE POLICY "Company members can view brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- Table: credential_types
-- Optimization: Wrap auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to credential_types" ON credential_types;
CREATE POLICY "Super admins full access to credential_types"
  ON credential_types FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company credential types" ON credential_types;
CREATE POLICY "Admins can manage company credential types"
  ON credential_types FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view credential types" ON credential_types;
CREATE POLICY "Company members can view credential types"
  ON credential_types FOR SELECT
  TO authenticated
  USING (company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- Table: driver_credentials
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to driver_credentials" ON driver_credentials;
CREATE POLICY "Super admins full access to driver_credentials"
  ON driver_credentials FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company driver credentials" ON driver_credentials;
CREATE POLICY "Admins can manage company driver credentials"
  ON driver_credentials FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own credentials" ON driver_credentials;
CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can submit own credentials" ON driver_credentials;
CREATE POLICY "Drivers can submit own credentials"
  ON driver_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can update own credentials" ON driver_credentials;
CREATE POLICY "Drivers can update own credentials"
  ON driver_credentials FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())
    )
    -- Only allow updating submission fields, not review fields
  );

DROP POLICY IF EXISTS "Drivers can update own driver credentials" ON driver_credentials;
CREATE POLICY "Drivers can update own driver credentials"
  ON driver_credentials FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- Table: vehicle_credentials
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to vehicle_credentials" ON vehicle_credentials;
CREATE POLICY "Super admins full access to vehicle_credentials"
  ON vehicle_credentials FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company vehicle credentials" ON vehicle_credentials;
CREATE POLICY "Admins can manage company vehicle credentials"
  ON vehicle_credentials FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own vehicle credentials" ON vehicle_credentials;
CREATE POLICY "Drivers can view own vehicle credentials"
  ON vehicle_credentials FOR SELECT
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN drivers d ON v.owner_driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
    OR vehicle_id IN (
      SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can update own vehicle credentials" ON vehicle_credentials;
CREATE POLICY "Drivers can update own vehicle credentials"
  ON vehicle_credentials FOR UPDATE
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN drivers d ON v.owner_driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
    OR vehicle_id IN (
      SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN drivers d ON v.owner_driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
    OR vehicle_id IN (
      SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- Table: driver_broker_assignments
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to broker assignments" ON driver_broker_assignments;
CREATE POLICY "Super admins full access to broker assignments"
  ON driver_broker_assignments FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker assignments" ON driver_broker_assignments;
CREATE POLICY "Admins can manage broker assignments"
  ON driver_broker_assignments FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company staff can view broker assignments" ON driver_broker_assignments;
CREATE POLICY "Company staff can view broker assignments"
  ON driver_broker_assignments FOR SELECT
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own broker assignments" ON driver_broker_assignments;
CREATE POLICY "Drivers can view own broker assignments"
  ON driver_broker_assignments FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Drivers can request or auto-join broker" ON driver_broker_assignments;
CREATE POLICY "Drivers can request or auto-join broker"
  ON driver_broker_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
    AND requested_by = 'driver'
    AND (
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

DROP POLICY IF EXISTS "Drivers can cancel pending requests" ON driver_broker_assignments;
CREATE POLICY "Drivers can cancel pending requests"
  ON driver_broker_assignments FOR DELETE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
    AND status = 'pending'
    AND requested_by = 'driver'
  );

-- =============================================================================
-- Table: broker_rates
-- Optimization: Wrap auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to broker rates" ON broker_rates;
CREATE POLICY "Super admins full access to broker rates"
  ON broker_rates FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker rates" ON broker_rates;
CREATE POLICY "Admins can manage broker rates"
  ON broker_rates FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view broker rates" ON broker_rates;
CREATE POLICY "Company members can view broker rates"
  ON broker_rates FOR SELECT
  TO authenticated
  USING (company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- Table: vehicle_assignment_history
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to assignment history" ON vehicle_assignment_history;
CREATE POLICY "Super admins full access to assignment history"
  ON vehicle_assignment_history FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can view company assignment history"
  ON vehicle_assignment_history FOR SELECT
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can insert company assignment history"
  ON vehicle_assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can view own assignment history" ON vehicle_assignment_history;
CREATE POLICY "Drivers can view own assignment history"
  ON vehicle_assignment_history FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
  );

-- =============================================================================
-- Table: driver_onboarding_progress
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Super admins full access to onboarding progress"
  ON driver_onboarding_progress FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Admins can view company onboarding progress"
  ON driver_onboarding_progress FOR SELECT
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can view own onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Drivers can view own onboarding progress"
  ON driver_onboarding_progress FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Drivers can manage own onboarding progress" ON driver_onboarding_progress;
CREATE POLICY "Drivers can manage own onboarding progress"
  ON driver_onboarding_progress FOR ALL
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid()))
  );

-- =============================================================================
-- Table: driver_availability
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to availability" ON driver_availability;
CREATE POLICY "Super admins full access to availability"
  ON driver_availability FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company availability" ON driver_availability;
CREATE POLICY "Admins can view company availability"
  ON driver_availability FOR SELECT
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can manage own availability" ON driver_availability;
CREATE POLICY "Drivers can manage own availability"
  ON driver_availability FOR ALL
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())));

-- =============================================================================
-- Table: driver_payment_info
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to payment info" ON driver_payment_info;
CREATE POLICY "Super admins full access to payment info"
  ON driver_payment_info FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company payment info" ON driver_payment_info;
CREATE POLICY "Admins can view company payment info"
  ON driver_payment_info FOR SELECT
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can manage own payment info" ON driver_payment_info;
CREATE POLICY "Drivers can manage own payment info"
  ON driver_payment_info FOR ALL
  TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())));

-- =============================================================================
-- Table: credential_submission_history
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Super admins full access to credential history" ON credential_submission_history;
CREATE POLICY "Super admins full access to credential history"
  ON credential_submission_history FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company credential history" ON credential_submission_history;
CREATE POLICY "Admins can manage company credential history"
  ON credential_submission_history FOR ALL
  TO authenticated
  USING (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own credential history" ON credential_submission_history;
CREATE POLICY "Drivers can view own credential history"
  ON credential_submission_history FOR SELECT
  TO authenticated
  USING (
    (credential_table = 'driver_credentials' AND credential_id IN (
      SELECT dc.id FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    ))
    OR
    (credential_table = 'vehicle_credentials' AND credential_id IN (
      SELECT vc.id FROM vehicle_credentials vc
      WHERE vc.vehicle_id IN (
        SELECT v.id FROM vehicles v
        JOIN drivers d ON v.owner_driver_id = d.id
        WHERE d.user_id = (SELECT auth.uid())
      )
      OR vc.vehicle_id IN (
        SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
        JOIN drivers d ON dva.driver_id = d.id
        WHERE d.user_id = (SELECT auth.uid()) AND dva.ended_at IS NULL
      )
    ))
  );

DROP POLICY IF EXISTS "Drivers can insert own credential history" ON credential_submission_history;
CREATE POLICY "Drivers can insert own credential history"
  ON credential_submission_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (credential_table = 'driver_credentials' AND credential_id IN (
      SELECT dc.id FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
    ))
    OR
    (credential_table = 'vehicle_credentials' AND credential_id IN (
      SELECT vc.id FROM vehicle_credentials vc
      WHERE vc.vehicle_id IN (
        SELECT v.id FROM vehicles v
        JOIN drivers d ON v.owner_driver_id = d.id
        WHERE d.user_id = (SELECT auth.uid())
      )
    ))
  );

-- =============================================================================
-- Table: driver_profile_changes
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Drivers can view own profile changes" ON driver_profile_changes;
CREATE POLICY "Drivers can view own profile changes"
  ON driver_profile_changes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Drivers can log own profile changes" ON driver_profile_changes;
CREATE POLICY "Drivers can log own profile changes"
  ON driver_profile_changes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view company profile changes" ON driver_profile_changes;
CREATE POLICY "Admins can view company profile changes"
  ON driver_profile_changes FOR SELECT
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
  );

DROP POLICY IF EXISTS "Super admins full access to profile changes" ON driver_profile_changes;
CREATE POLICY "Super admins full access to profile changes"
  ON driver_profile_changes FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- Table: notification_preferences
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own notification preferences" ON notification_preferences;
CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins full access to notification preferences" ON notification_preferences;
CREATE POLICY "Super admins full access to notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

-- =============================================================================
-- Table: storage.objects (profile-photos)
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
CREATE POLICY "Users can upload own profile photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can view own profile photos" ON storage.objects;
CREATE POLICY "Users can view own profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;
CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;
CREATE POLICY "Users can delete own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Admins can view company driver profile photos" ON storage.objects;
CREATE POLICY "Admins can view company driver profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN drivers d ON d.user_id = u.id
      WHERE u.id::text = (storage.foldername(name))[1]
        AND d.company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Super admins full access to profile photos" ON storage.objects;
CREATE POLICY "Super admins full access to profile photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- Table: storage.objects (vehicle-photos)
-- Optimization: Wrap auth.uid() and auth.jwt() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "1099 drivers can upload own vehicle photos" ON storage.objects;
CREATE POLICY "1099 drivers can upload own vehicle photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      JOIN drivers d ON d.id = v.owner_driver_id
      WHERE v.id::text = (storage.foldername(name))[1]
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
    )
  );

DROP POLICY IF EXISTS "Drivers can view own vehicle photos" ON storage.objects;
CREATE POLICY "Drivers can view own vehicle photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN drivers d ON d.id = v.owner_driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = (SELECT auth.uid())
      )
      OR
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
        JOIN drivers d ON d.id = dva.driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = (SELECT auth.uid())
          AND dva.ended_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Drivers can update vehicle photos" ON storage.objects;
CREATE POLICY "Drivers can update vehicle photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN drivers d ON d.id = v.owner_driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = (SELECT auth.uid())
          AND d.employment_type = '1099'
      )
      OR
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
        JOIN drivers d ON d.id = dva.driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = (SELECT auth.uid())
          AND d.employment_type = 'w2'
          AND dva.ended_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "1099 drivers can delete own vehicle photos" ON storage.objects;
CREATE POLICY "1099 drivers can delete own vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      JOIN drivers d ON d.id = v.owner_driver_id
      WHERE v.id::text = (storage.foldername(name))[1]
        AND d.user_id = (SELECT auth.uid())
        AND d.employment_type = '1099'
    )
  );

DROP POLICY IF EXISTS "Admins can manage company vehicle photos" ON storage.objects;
CREATE POLICY "Admins can manage company vehicle photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.company_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

DROP POLICY IF EXISTS "Super admins full access to vehicle photos" ON storage.objects;
CREATE POLICY "Super admins full access to vehicle photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- Table: credential_progress
-- Optimization: Wrap auth.uid() in SELECT for caching
-- =============================================================================
DROP POLICY IF EXISTS "drivers_own_driver_credential_progress" ON credential_progress;
CREATE POLICY "drivers_own_driver_credential_progress" 
  ON credential_progress
  FOR ALL 
  USING (
    credential_table = 'driver_credentials' 
    AND credential_id IN (
      SELECT dc.id 
      FROM driver_credentials dc
      JOIN drivers d ON d.id = dc.driver_id
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "drivers_assigned_vehicle_credential_progress" ON credential_progress;
CREATE POLICY "drivers_assigned_vehicle_credential_progress" 
  ON credential_progress
  FOR ALL 
  USING (
    credential_table = 'vehicle_credentials' 
    AND credential_id IN (
      SELECT vc.id 
      FROM vehicle_credentials vc
      JOIN driver_vehicle_assignments dva ON dva.vehicle_id = vc.vehicle_id
      JOIN drivers d ON d.id = dva.driver_id
      WHERE d.user_id = (SELECT auth.uid()) 
        AND dva.ended_at IS NULL
    )
  );

DROP POLICY IF EXISTS "admins_company_credential_progress" ON credential_progress;
CREATE POLICY "admins_company_credential_progress" 
  ON credential_progress
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = (SELECT auth.uid()) 
        AND u.role = 'admin'
        AND (
          (credential_table = 'driver_credentials' AND credential_id IN (
            SELECT id FROM driver_credentials WHERE company_id = u.company_id
          ))
          OR
          (credential_table = 'vehicle_credentials' AND credential_id IN (
            SELECT id FROM vehicle_credentials WHERE company_id = u.company_id
          ))
        )
    )
  );
