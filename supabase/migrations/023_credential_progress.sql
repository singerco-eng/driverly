-- Migration: 023_credential_progress
-- Purpose: Track step-by-step progress through multi-step credentials
-- Part of: Unified Credential Detail Interface (CODEX-017)

-- ============================================
-- TABLE: credential_progress
-- ============================================
-- Stores per-credential progress through instruction steps
-- Polymorphic reference to either driver_credentials or vehicle_credentials

CREATE TABLE credential_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Polymorphic reference to credential instance
  credential_id   uuid NOT NULL,
  credential_table text NOT NULL CHECK (credential_table IN ('driver_credentials', 'vehicle_credentials')),
  
  -- Progress state
  current_step_id text,                         -- ID of the step user is currently on
  step_data       jsonb NOT NULL DEFAULT '{}',  -- Per-step completion state and form data
  
  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  
  -- Each credential can only have one progress record
  UNIQUE(credential_id, credential_table)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_credential_progress_lookup 
  ON credential_progress(credential_id, credential_table);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_credential_progress_updated_at
  BEFORE UPDATE ON credential_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE credential_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can manage progress for their own driver credentials
CREATE POLICY "drivers_own_driver_credential_progress" 
  ON credential_progress
  FOR ALL 
  USING (
    credential_table = 'driver_credentials' 
    AND credential_id IN (
      SELECT dc.id 
      FROM driver_credentials dc
      JOIN drivers d ON d.id = dc.driver_id
      WHERE d.user_id = auth.uid()
    )
  );

-- Policy: Drivers can manage progress for vehicle credentials on their assigned vehicles
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
      WHERE d.user_id = auth.uid() 
        AND dva.ended_at IS NULL
    )
  );

-- Policy: Admins can manage all progress within their company
CREATE POLICY "admins_company_credential_progress" 
  ON credential_progress
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
        AND u.role = 'admin'
        AND (
          -- Driver credentials in admin's company
          (credential_table = 'driver_credentials' AND credential_id IN (
            SELECT id FROM driver_credentials WHERE company_id = u.company_id
          ))
          OR
          -- Vehicle credentials in admin's company
          (credential_table = 'vehicle_credentials' AND credential_id IN (
            SELECT id FROM vehicle_credentials WHERE company_id = u.company_id
          ))
        )
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE credential_progress IS 
  'Tracks step-by-step progress through multi-step credential submissions';

COMMENT ON COLUMN credential_progress.credential_table IS 
  'Which table the credential_id references: driver_credentials or vehicle_credentials';

COMMENT ON COLUMN credential_progress.current_step_id IS 
  'ID of the instruction step the user is currently on';

COMMENT ON COLUMN credential_progress.step_data IS 
  'JSONB containing per-step state: { steps: { stepId: { completed, formData, uploadedFiles, etc } } }';
