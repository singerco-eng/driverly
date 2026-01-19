-- =============================================================================
-- Migration: 015_credential_submission.sql
-- Description: Adds credential submission history for DR-004 Credential Submission
-- Reference: docs/features/driver/DR-004-credential-submission.md
-- =============================================================================

-- =============================================================================
-- 1. CREDENTIAL SUBMISSION HISTORY TABLE
-- Stores a record each time a credential is submitted/reviewed
-- Preserves all historical submissions for audit purposes
-- =============================================================================

CREATE TABLE IF NOT EXISTS credential_submission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References (polymorphic - can link to driver_credentials or vehicle_credentials)
  credential_id UUID NOT NULL,
  credential_table TEXT NOT NULL CHECK (credential_table IN ('driver_credentials', 'vehicle_credentials')),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Snapshot of submission data at time of this record
  submission_data JSONB NOT NULL,  -- Copy of document_url, form_data, signature_data, entered_date, notes
  
  -- Status at time of this record
  status TEXT NOT NULL CHECK (status IN (
    'submitted',
    'pending_review',
    'approved',
    'rejected',
    'expired'
  )),
  
  -- Review info (populated when reviewed)
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,        -- Internal admin notes
  rejection_reason TEXT,    -- Shown to driver if rejected
  
  -- Expiration at time of approval
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for credential_submission_history
CREATE INDEX IF NOT EXISTS idx_cred_history_credential 
  ON credential_submission_history(credential_id, credential_table);
CREATE INDEX IF NOT EXISTS idx_cred_history_company 
  ON credential_submission_history(company_id);
CREATE INDEX IF NOT EXISTS idx_cred_history_status 
  ON credential_submission_history(status);
CREATE INDEX IF NOT EXISTS idx_cred_history_submitted 
  ON credential_submission_history(submitted_at DESC);

-- =============================================================================
-- 2. RLS FOR CREDENTIAL SUBMISSION HISTORY
-- =============================================================================

ALTER TABLE credential_submission_history ENABLE ROW LEVEL SECURITY;

-- Super Admins: Full access
CREATE POLICY "Super admins full access to credential history"
  ON credential_submission_history FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admins: Full access within their company
CREATE POLICY "Admins can manage company credential history"
  ON credential_submission_history FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- Drivers: Can view history of their own credentials
CREATE POLICY "Drivers can view own credential history"
  ON credential_submission_history FOR SELECT
  TO authenticated
  USING (
    -- Driver credentials they own
    (credential_table = 'driver_credentials' AND credential_id IN (
      SELECT dc.id FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE d.user_id = auth.uid()
    ))
    OR
    -- Vehicle credentials for vehicles they own or are assigned to
    (credential_table = 'vehicle_credentials' AND credential_id IN (
      SELECT vc.id FROM vehicle_credentials vc
      WHERE vc.vehicle_id IN (
        -- Vehicles they own
        SELECT v.id FROM vehicles v
        JOIN drivers d ON v.owner_driver_id = d.id
        WHERE d.user_id = auth.uid()
      )
      OR vc.vehicle_id IN (
        -- Vehicles assigned to them
        SELECT dva.vehicle_id FROM driver_vehicle_assignments dva
        JOIN drivers d ON dva.driver_id = d.id
        WHERE d.user_id = auth.uid() AND dva.ended_at IS NULL
      )
    ))
  );

-- Drivers: Can insert history records for their own credentials (when submitting)
CREATE POLICY "Drivers can insert own credential history"
  ON credential_submission_history FOR INSERT
  TO authenticated
  WITH CHECK (
    (credential_table = 'driver_credentials' AND credential_id IN (
      SELECT dc.id FROM driver_credentials dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE d.user_id = auth.uid()
    ))
    OR
    (credential_table = 'vehicle_credentials' AND credential_id IN (
      SELECT vc.id FROM vehicle_credentials vc
      WHERE vc.vehicle_id IN (
        SELECT v.id FROM vehicles v
        JOIN drivers d ON v.owner_driver_id = d.id
        WHERE d.user_id = auth.uid()
      )
    ))
  );

-- =============================================================================
-- 3. EXTEND DRIVER_CREDENTIALS TABLE
-- Add multi-document support and better tracking
-- =============================================================================

-- Add document_urls array for multi-document support
ALTER TABLE driver_credentials 
  ADD COLUMN IF NOT EXISTS document_urls TEXT[];

-- Add version tracking for submissions
ALTER TABLE driver_credentials 
  ADD COLUMN IF NOT EXISTS submission_version INTEGER NOT NULL DEFAULT 1;

-- Add driver-specified expiration date (for driver_specified expiration types)
ALTER TABLE driver_credentials 
  ADD COLUMN IF NOT EXISTS driver_expiration_date DATE;

-- =============================================================================
-- 4. EXTEND VEHICLE_CREDENTIALS TABLE
-- Same extensions as driver_credentials
-- =============================================================================

ALTER TABLE vehicle_credentials 
  ADD COLUMN IF NOT EXISTS document_urls TEXT[];

ALTER TABLE vehicle_credentials 
  ADD COLUMN IF NOT EXISTS submission_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE vehicle_credentials 
  ADD COLUMN IF NOT EXISTS driver_expiration_date DATE;

-- =============================================================================
-- 5. HELPER FUNCTION: Create History Record on Submission
-- =============================================================================

CREATE OR REPLACE FUNCTION create_credential_submission_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history when status changes to pending_review (new submission)
  IF (TG_OP = 'UPDATE' AND OLD.status != 'pending_review' AND NEW.status = 'pending_review') THEN
    INSERT INTO credential_submission_history (
      credential_id,
      credential_table,
      company_id,
      submission_data,
      status,
      submitted_at
    ) VALUES (
      NEW.id,
      TG_TABLE_NAME,
      NEW.company_id,
      jsonb_build_object(
        'document_url', NEW.document_url,
        'document_urls', NEW.document_urls,
        'signature_data', NEW.signature_data,
        'form_data', NEW.form_data,
        'entered_date', NEW.entered_date,
        'notes', NEW.notes,
        'driver_expiration_date', NEW.driver_expiration_date
      ),
      'submitted',
      NEW.submitted_at
    );
  END IF;
  
  -- Create history when reviewed (approved/rejected)
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending_review' AND NEW.status IN ('approved', 'rejected')) THEN
    UPDATE credential_submission_history
    SET 
      status = NEW.status,
      reviewed_at = NEW.reviewed_at,
      reviewed_by = NEW.reviewed_by,
      review_notes = NEW.review_notes,
      rejection_reason = NEW.rejection_reason,
      expires_at = NEW.expires_at
    WHERE id = (
      SELECT id FROM credential_submission_history
      WHERE credential_id = NEW.id
        AND credential_table = TG_TABLE_NAME
        AND status = 'submitted'
      ORDER BY submitted_at DESC
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to driver_credentials
DROP TRIGGER IF EXISTS driver_credentials_history_trigger ON driver_credentials;
CREATE TRIGGER driver_credentials_history_trigger
  AFTER UPDATE ON driver_credentials
  FOR EACH ROW
  EXECUTE FUNCTION create_credential_submission_history();

-- Apply trigger to vehicle_credentials
DROP TRIGGER IF EXISTS vehicle_credentials_history_trigger ON vehicle_credentials;
CREATE TRIGGER vehicle_credentials_history_trigger
  AFTER UPDATE ON vehicle_credentials
  FOR EACH ROW
  EXECUTE FUNCTION create_credential_submission_history();

-- =============================================================================
-- 6. HELPER FUNCTION: Get Driver's Required Credentials
-- Returns all credential types a driver should have based on their profile
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
    b.name AS broker_name,
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

-- =============================================================================
-- 7. HELPER FUNCTION: Get Vehicle's Required Credentials
-- Returns all credential types a vehicle should have
-- =============================================================================

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
    b.name AS broker_name,
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

-- =============================================================================
-- 8. HELPER FUNCTION: Calculate Credential Expiration
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_credential_expiration(
  p_credential_type_id UUID,
  p_driver_expiration_date DATE DEFAULT NULL,
  p_approval_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_expiration_type TEXT;
  v_interval_days INTEGER;
BEGIN
  SELECT expiration_type, expiration_interval_days
  INTO v_expiration_type, v_interval_days
  FROM credential_types WHERE id = p_credential_type_id;

  CASE v_expiration_type
    WHEN 'never' THEN RETURN NULL;
    WHEN 'fixed_interval' THEN RETURN p_approval_date + (v_interval_days || ' days')::INTERVAL;
    WHEN 'driver_specified' THEN RETURN p_driver_expiration_date::TIMESTAMPTZ;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- 9. COMMENTS
-- =============================================================================

COMMENT ON TABLE credential_submission_history IS 'Historical record of all credential submissions and reviews for audit trail';
COMMENT ON COLUMN credential_submission_history.credential_table IS 'Which table the credential_id references: driver_credentials or vehicle_credentials';
COMMENT ON COLUMN credential_submission_history.submission_data IS 'Snapshot of all submission data at time of submission';
COMMENT ON COLUMN driver_credentials.document_urls IS 'Array of document URLs for multi-file uploads';
COMMENT ON COLUMN driver_credentials.submission_version IS 'Incremented each time driver resubmits';
COMMENT ON COLUMN driver_credentials.driver_expiration_date IS 'Expiration date entered by driver (for driver_specified expiration type)';

COMMENT ON FUNCTION get_driver_required_credentials IS 'Returns all credential types a driver needs based on employment type and broker assignments';
COMMENT ON FUNCTION get_vehicle_required_credentials IS 'Returns all credential types a vehicle needs based on type and owner broker assignments';
COMMENT ON FUNCTION calculate_credential_expiration IS 'Calculates when a credential expires based on type configuration';
