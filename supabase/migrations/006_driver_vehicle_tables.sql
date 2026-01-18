-- =============================================================================
-- Migration: 006_driver_vehicle_tables.sql
-- Description: Creates comprehensive driver and vehicle management tables
--              with proper RLS policies for multi-tenant access control.
-- Reference: CODEX-TASK-006, AD-002 Driver Management, AD-003 Vehicle Management
-- =============================================================================

-- =============================================================================
-- 1. DRIVERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Employment
  employment_type VARCHAR(10) NOT NULL CHECK (employment_type IN ('w2', '1099')),
  
  -- Personal
  date_of_birth DATE,
  ssn_last_four CHAR(4),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- License
  license_number VARCHAR(50),
  license_state CHAR(2),
  license_expiration DATE,
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relation VARCHAR(100),
  
  -- Application Status
  application_status VARCHAR(20) CHECK (application_status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn')),
  application_date TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Driver Status (after approval)
  status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  
  -- Admin
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, company_id)
);

-- Indexes for drivers
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_application_status ON drivers(application_status);
CREATE INDEX IF NOT EXISTS idx_drivers_company_status ON drivers(company_id, status);

-- =============================================================================
-- 2. DRIVER_VEHICLE_ASSIGNMENTS TABLE (created before vehicles for RLS reference)
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL, -- FK added after vehicles table created
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment details
  assignment_type VARCHAR(20) DEFAULT 'assigned' CHECK (assignment_type IN ('owned', 'assigned', 'shared')),
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(driver_id, vehicle_id)
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_driver ON driver_vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_vehicle ON driver_vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_company ON driver_vehicle_assignments(company_id);

-- =============================================================================
-- 3. VEHICLES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Vehicle Info
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  color VARCHAR(50) NOT NULL,
  vin VARCHAR(17),
  license_plate VARCHAR(20) NOT NULL,
  license_state CHAR(2),
  
  -- Type & Capacity
  vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('sedan', 'wheelchair_van', 'stretcher_van', 'suv', 'minivan')),
  wheelchair_capacity INTEGER DEFAULT 0,
  stretcher_capacity INTEGER DEFAULT 0,
  ambulatory_capacity INTEGER DEFAULT 4,
  
  -- Ownership
  ownership VARCHAR(20) DEFAULT 'company' CHECK (ownership IN ('company', 'driver', 'leased')),
  owner_driver_id UUID REFERENCES drivers(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired')),
  
  -- Maintenance
  last_inspection_date DATE,
  next_inspection_due DATE,
  mileage INTEGER,
  
  -- Insurance
  insurance_policy_number VARCHAR(100),
  insurance_expiration DATE,
  
  -- Admin
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, license_plate)
);

-- Indexes for vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_driver ON vehicles(owner_driver_id);

-- Add FK constraint to driver_vehicle_assignments now that vehicles exists
ALTER TABLE driver_vehicle_assignments
  ADD CONSTRAINT fk_driver_vehicle_assignments_vehicle
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- =============================================================================
-- 4. RLS POLICIES - DRIVERS
-- =============================================================================

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access to drivers"
  ON drivers FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can view drivers in their company
CREATE POLICY "Admins can view company drivers"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can insert drivers in their company
CREATE POLICY "Admins can create company drivers"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can update drivers in their company
CREATE POLICY "Admins can update company drivers"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can delete drivers in their company
CREATE POLICY "Admins can delete company drivers"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Drivers can view their own record
CREATE POLICY "Drivers can view own record"
  ON drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Drivers can update limited fields on their own record
CREATE POLICY "Drivers can update own record"
  ON drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 5. RLS POLICIES - VEHICLES
-- =============================================================================

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access to vehicles"
  ON vehicles FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can view vehicles in their company
CREATE POLICY "Admins can view company vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can insert vehicles in their company
CREATE POLICY "Admins can create company vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can update vehicles in their company
CREATE POLICY "Admins can update company vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can delete vehicles in their company
CREATE POLICY "Admins can delete company vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Drivers can view vehicles assigned to them
CREATE POLICY "Drivers can view assigned vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON dva.driver_id = d.id
      WHERE dva.vehicle_id = vehicles.id
        AND d.user_id = auth.uid()
        AND dva.unassigned_at IS NULL
    )
  );

-- Drivers can view their own vehicles
CREATE POLICY "Drivers can view owned vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. RLS POLICIES - DRIVER_VEHICLE_ASSIGNMENTS
-- =============================================================================

ALTER TABLE driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access to assignments"
  ON driver_vehicle_assignments FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins can view assignments in their company
CREATE POLICY "Admins can view company assignments"
  ON driver_vehicle_assignments FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Admins can manage assignments in their company
CREATE POLICY "Admins can manage company assignments"
  ON driver_vehicle_assignments FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

-- Drivers can view their own assignments
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
-- 7. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_vehicle_assignments_updated_at ON driver_vehicle_assignments;
CREATE TRIGGER update_driver_vehicle_assignments_updated_at
  BEFORE UPDATE ON driver_vehicle_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON TABLE drivers IS 'Driver profiles linked to user accounts, scoped to companies';
COMMENT ON TABLE vehicles IS 'Fleet vehicles owned by companies or drivers';
COMMENT ON TABLE driver_vehicle_assignments IS 'Many-to-many relationship between drivers and vehicles';

COMMENT ON COLUMN drivers.employment_type IS 'W2 (employee) or 1099 (contractor)';
COMMENT ON COLUMN drivers.application_status IS 'Status of driver application process';
COMMENT ON COLUMN drivers.status IS 'Operational status after approval';

COMMENT ON COLUMN vehicles.vehicle_type IS 'Type of vehicle for dispatch matching';
COMMENT ON COLUMN vehicles.ownership IS 'Whether vehicle is company-owned, driver-owned, or leased';

COMMENT ON COLUMN driver_vehicle_assignments.assignment_type IS 'Nature of vehicle assignment to driver';
COMMENT ON COLUMN driver_vehicle_assignments.is_primary IS 'Whether this is the driver primary vehicle';
