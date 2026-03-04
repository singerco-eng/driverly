-- =============================================================================
-- Migration: 033_company_locations.sql
-- Description: Adds company locations, location credentials, and location-broker
--              assignments with RLS policies and related schema updates.
-- Reference: docs/CODEX-043-LOCATIONS-001-company-locations.md
-- =============================================================================

-- =============================================================================
-- 1. COMPANY LOCATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, name),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_company_locations_company_id ON company_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_locations_status ON company_locations(status);
CREATE INDEX IF NOT EXISTS idx_company_locations_company_status ON company_locations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_locations_primary ON company_locations(company_id, is_primary);

-- Enforce single primary location per company
CREATE OR REPLACE FUNCTION enforce_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE company_locations SET is_primary = false 
    WHERE company_id = NEW.company_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_single_primary_location ON company_locations;
CREATE TRIGGER trg_enforce_single_primary_location
  BEFORE INSERT OR UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_location();

-- RLS for company_locations
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to company_locations"
  ON company_locations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company locations"
  ON company_locations FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Company members can view locations"
  ON company_locations FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- 2. LOCATION CREDENTIALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS location_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted',
    'pending_review',
    'approved',
    'rejected',
    'expired'
  )),
  
  -- Submission data
  document_url TEXT,
  document_urls TEXT[],
  form_data JSONB,
  entered_date DATE,
  notes TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  driver_expiration_date DATE,
  
  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  
  -- Grace period
  grace_period_ends TIMESTAMPTZ,
  
  -- Version tracking
  submission_version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(location_id, credential_type_id)
);

CREATE INDEX IF NOT EXISTS idx_location_credentials_location ON location_credentials(location_id);
CREATE INDEX IF NOT EXISTS idx_location_credentials_type ON location_credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_location_credentials_company ON location_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_location_credentials_status ON location_credentials(status);
CREATE INDEX IF NOT EXISTS idx_location_credentials_expiring ON location_credentials(expires_at) 
  WHERE status = 'approved';

-- RLS for location_credentials
ALTER TABLE location_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to location_credentials"
  ON location_credentials FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage location credentials"
  ON location_credentials FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Coordinators can view location credentials"
  ON location_credentials FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
  );

-- =============================================================================
-- 3. LOCATION-BROKER ASSIGNMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS location_broker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(location_id, broker_id)
);

CREATE INDEX IF NOT EXISTS idx_location_broker_assignments_location ON location_broker_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_location_broker_assignments_broker ON location_broker_assignments(broker_id);
CREATE INDEX IF NOT EXISTS idx_location_broker_assignments_company ON location_broker_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_location_broker_assignments_active ON location_broker_assignments(location_id, broker_id) 
  WHERE is_active = true;

-- RLS for location_broker_assignments
ALTER TABLE location_broker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to location broker assignments"
  ON location_broker_assignments FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage location broker assignments"
  ON location_broker_assignments FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Company staff can view location broker assignments"
  ON location_broker_assignments FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- =============================================================================
-- 4. SCHEMA MODIFICATIONS
-- =============================================================================

ALTER TABLE drivers 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_location_id ON drivers(location_id);

ALTER TABLE vehicles 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_location_id ON vehicles(location_id);

ALTER TABLE credential_types 
  DROP CONSTRAINT IF EXISTS credential_types_category_check;

ALTER TABLE credential_types 
  ADD CONSTRAINT credential_types_category_check 
  CHECK (category IN ('driver', 'vehicle', 'location'));

ALTER TABLE credential_type_templates 
  DROP CONSTRAINT IF EXISTS credential_type_templates_category_check;

ALTER TABLE credential_type_templates 
  ADD CONSTRAINT credential_type_templates_category_check 
  CHECK (category IN ('driver', 'vehicle', 'location'));

-- =============================================================================
-- 5. UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_company_locations_updated_at ON company_locations;
CREATE TRIGGER update_company_locations_updated_at
  BEFORE UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_credentials_updated_at ON location_credentials;
CREATE TRIGGER update_location_credentials_updated_at
  BEFORE UPDATE ON location_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_broker_assignments_updated_at ON location_broker_assignments;
CREATE TRIGGER update_location_broker_assignments_updated_at
  BEFORE UPDATE ON location_broker_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. COMMENTS
-- =============================================================================

COMMENT ON TABLE company_locations IS 'Company-defined locations/branches for organizing drivers and vehicles';
COMMENT ON TABLE location_credentials IS 'Admin-submitted credential instances for locations';
COMMENT ON TABLE location_broker_assignments IS 'Associations between locations and brokers (trip sources)';

COMMENT ON COLUMN company_locations.is_primary IS 'Whether this is the primary location for the company';
COMMENT ON COLUMN location_credentials.status IS 'Current status of the location credential submission';
COMMENT ON COLUMN location_broker_assignments.is_active IS 'Whether the broker association is active';
