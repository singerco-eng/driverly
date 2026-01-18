-- =============================================================================
-- Migration: 011_credential_types.sql
-- Description: Creates credential types and credential instance tables
--              for AD-005 Credential Types feature
-- Reference: docs/features/admin/AD-005-credential-types.md
-- =============================================================================

-- =============================================================================
-- 1. BROKERS TABLE (minimal, prerequisite for broker-scoped credentials)
--    Full broker management will be added in AD-007
-- =============================================================================

CREATE TABLE IF NOT EXISTS brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),  -- Short code/identifier
  
  -- Contact
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brokers_company_id ON brokers(company_id);
CREATE INDEX IF NOT EXISTS idx_brokers_active ON brokers(company_id, is_active);

-- RLS for brokers
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to brokers"
  ON brokers FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company brokers"
  ON brokers FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Company members can view brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- 2. CREDENTIAL TYPES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS credential_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,  -- Rich text/markdown with instructions
  
  -- Classification
  category TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'broker')),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,  -- Required if scope = 'broker'
  
  -- Requirements
  employment_type TEXT NOT NULL DEFAULT 'both' CHECK (employment_type IN ('both', 'w2_only', '1099_only')),
  requirement TEXT NOT NULL DEFAULT 'required' CHECK (requirement IN ('required', 'optional', 'recommended')),
  vehicle_types TEXT[],  -- If category='vehicle', which types (null = all)
  
  -- Submission Configuration
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'document_upload',    -- Upload PDF/image
    'photo',              -- Take/upload photo (camera-first UX)
    'signature',          -- E-signature on agreement
    'form',               -- Fill out structured form
    'admin_verified',     -- Admin marks complete manually
    'date_entry'          -- Driver enters date only
  )),
  
  -- Form configuration (if submission_type = 'form')
  form_schema JSONB,
  
  -- Document for signature (if submission_type = 'signature')
  signature_document_url TEXT,
  
  -- Expiration Configuration
  expiration_type TEXT NOT NULL DEFAULT 'never' CHECK (expiration_type IN (
    'never',              -- One-time, never expires
    'fixed_interval',     -- Valid for N days from approval
    'driver_specified'    -- Driver enters expiration date
  )),
  expiration_interval_days INTEGER,  -- If fixed_interval, number of days
  expiration_warning_days INTEGER DEFAULT 30,  -- Days before expiration to warn
  
  -- Grace Period (for new credentials added to existing drivers)
  grace_period_days INTEGER DEFAULT 30,
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_seeded BOOLEAN NOT NULL DEFAULT false,  -- Created by Super Admin template
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT broker_required_for_broker_scope 
    CHECK (scope = 'global' OR broker_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_credential_types_company ON credential_types(company_id);
CREATE INDEX IF NOT EXISTS idx_credential_types_broker ON credential_types(broker_id);
CREATE INDEX IF NOT EXISTS idx_credential_types_active ON credential_types(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_credential_types_category ON credential_types(company_id, category);

-- RLS for credential_types
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to credential_types"
  ON credential_types FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company credential types"
  ON credential_types FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Company members can view credential types"
  ON credential_types FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- =============================================================================
-- 3. DRIVER CREDENTIALS TABLE (instances)
-- =============================================================================

CREATE TABLE IF NOT EXISTS driver_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
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
  
  -- Submission data (varies by submission_type)
  document_url TEXT,        -- For document_upload, photo
  signature_data JSONB,     -- For signature (signature image, timestamp, IP)
  form_data JSONB,          -- For form submissions
  entered_date DATE,        -- For date_entry
  notes TEXT,               -- Driver notes on submission
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,        -- Admin notes (internal)
  rejection_reason TEXT,    -- Shown to driver if rejected
  
  -- Grace period tracking
  grace_period_ends TIMESTAMPTZ,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint - one credential instance per driver per type
  UNIQUE(driver_id, credential_type_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_credentials_driver ON driver_credentials(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_type ON driver_credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_company ON driver_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_status ON driver_credentials(status);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_expiring ON driver_credentials(expires_at) 
  WHERE status = 'approved';

-- RLS for driver_credentials
ALTER TABLE driver_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to driver_credentials"
  ON driver_credentials FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company driver credentials"
  ON driver_credentials FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can submit own credentials"
  ON driver_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update own credentials"
  ON driver_credentials FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
    -- Only allow updating submission fields, not review fields
  );

-- =============================================================================
-- 4. VEHICLE CREDENTIALS TABLE (instances)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicle_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
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
  signature_data JSONB,
  form_data JSONB,
  entered_date DATE,
  notes TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Grace period tracking
  grace_period_ends TIMESTAMPTZ,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(vehicle_id, credential_type_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_vehicle ON vehicle_credentials(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_type ON vehicle_credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_company ON vehicle_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_status ON vehicle_credentials(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_expiring ON vehicle_credentials(expires_at) 
  WHERE status = 'approved';

-- RLS for vehicle_credentials
ALTER TABLE vehicle_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to vehicle_credentials"
  ON vehicle_credentials FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can manage company vehicle credentials"
  ON vehicle_credentials FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

CREATE POLICY "Drivers can view own vehicle credentials"
  ON vehicle_credentials FOR SELECT
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
      WHERE d.user_id = auth.uid() AND dva.unassigned_at IS NULL
    )
  );

-- =============================================================================
-- 5. CREDENTIAL TYPE TEMPLATES (Super Admin)
-- =============================================================================

CREATE TABLE IF NOT EXISTS credential_type_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration (same as credential_types)
  category TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'document_upload', 'photo', 'signature', 'form', 'admin_verified', 'date_entry'
  )),
  employment_type TEXT NOT NULL DEFAULT 'both',
  requirement TEXT NOT NULL DEFAULT 'required',
  expiration_type TEXT NOT NULL DEFAULT 'never',
  expiration_interval_days INTEGER,
  expiration_warning_days INTEGER DEFAULT 30,
  
  -- Form/signature config
  form_schema JSONB,
  signature_document_url TEXT,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for templates - Super Admin only for management, read for all
ALTER TABLE credential_type_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage templates"
  ON credential_type_templates FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Everyone can view active templates"
  ON credential_type_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =============================================================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON brokers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credential_types_updated_at ON credential_types;
CREATE TRIGGER update_credential_types_updated_at
  BEFORE UPDATE ON credential_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_credentials_updated_at ON driver_credentials;
CREATE TRIGGER update_driver_credentials_updated_at
  BEFORE UPDATE ON driver_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_credentials_updated_at ON vehicle_credentials;
CREATE TRIGGER update_vehicle_credentials_updated_at
  BEFORE UPDATE ON vehicle_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credential_type_templates_updated_at ON credential_type_templates;
CREATE TRIGGER update_credential_type_templates_updated_at
  BEFORE UPDATE ON credential_type_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. SEED DEFAULT TEMPLATES
-- =============================================================================

INSERT INTO credential_type_templates (name, description, category, submission_type, requirement, expiration_type, display_order)
VALUES
  ('Background Check', 'Upload your background check certificate from an approved provider. Accepted formats: PDF, JPG, PNG.', 'driver', 'document_upload', 'required', 'never', 1),
  ('Driver''s License', 'Upload photos of the front and back of your valid driver''s license.', 'driver', 'photo', 'required', 'driver_specified', 2),
  ('Vehicle Insurance', 'Upload your current vehicle insurance card or declaration page.', 'vehicle', 'document_upload', 'required', 'driver_specified', 3),
  ('Vehicle Registration', 'Upload your current vehicle registration.', 'vehicle', 'document_upload', 'required', 'driver_specified', 4),
  ('W-9 Form', 'Complete and sign the W-9 tax form for 1099 contractors.', 'driver', 'signature', 'required', 'never', 5),
  ('Vehicle Inspection', 'Upload your most recent vehicle inspection certificate.', 'vehicle', 'document_upload', 'required', 'fixed_interval', 6)
ON CONFLICT DO NOTHING;

-- Set the fixed interval for vehicle inspection (365 days = 1 year)
UPDATE credential_type_templates 
SET expiration_interval_days = 365 
WHERE name = 'Vehicle Inspection';

-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON TABLE brokers IS 'Insurance brokers/partners that companies work with';
COMMENT ON TABLE credential_types IS 'Definitions of required credentials for drivers and vehicles';
COMMENT ON TABLE driver_credentials IS 'Actual credential submissions from drivers';
COMMENT ON TABLE vehicle_credentials IS 'Actual credential submissions for vehicles';
COMMENT ON TABLE credential_type_templates IS 'Templates for seeding credential types to new companies';

COMMENT ON COLUMN credential_types.scope IS 'global = required for all, broker = only for drivers assigned to specific broker';
COMMENT ON COLUMN credential_types.submission_type IS 'How drivers submit this credential';
COMMENT ON COLUMN credential_types.expiration_type IS 'How expiration is calculated';
COMMENT ON COLUMN credential_types.grace_period_days IS 'Days for existing drivers to submit when new credential created';
COMMENT ON COLUMN credential_types.is_seeded IS 'Whether this was created from a Super Admin template';

COMMENT ON COLUMN driver_credentials.status IS 'Current status of the credential submission';
COMMENT ON COLUMN driver_credentials.grace_period_ends IS 'Deadline for existing drivers when new credential type added';
