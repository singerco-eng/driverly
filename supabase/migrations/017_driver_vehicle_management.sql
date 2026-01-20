-- =============================================================================
-- Migration: 017_driver_vehicle_management.sql
-- Description: Extends vehicles table for DR-003 Driver Vehicle Management
--              Adds photo fields, status tracking, completion, and driver RLS
-- Reference: CODEX-TASK-011, DR-003 Driver Vehicle Management
-- =============================================================================

-- =============================================================================
-- 1. EXTEND VEHICLES TABLE
-- =============================================================================

-- Add photo URLs
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS exterior_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS interior_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS wheelchair_lift_photo_url TEXT;

-- Add fleet management
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fleet_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mileage_updated_at TIMESTAMPTZ;

-- Add seat_capacity (maps to ambulatory_capacity conceptually)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS seat_capacity INTEGER DEFAULT 4;

-- Add status tracking
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id);

-- Add completeness tracking
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;

-- Add creator tracking
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Update status constraint to match TypeScript types
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_status_check 
  CHECK (status IN ('active', 'inactive', 'retired'));

-- Update vehicle_type constraint to include additional types
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check 
  CHECK (vehicle_type IN ('sedan', 'suv', 'minivan', 'van', 'wheelchair_van', 'stretcher_van'));

-- =============================================================================
-- 2. VEHICLE PHOTOS STORAGE BUCKET
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. STORAGE POLICIES FOR VEHICLE PHOTOS
-- =============================================================================

-- 1099 drivers can upload photos for their own vehicles
CREATE POLICY "1099 drivers can upload own vehicle photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      JOIN drivers d ON d.id = v.owner_driver_id
      WHERE v.id::text = (storage.foldername(name))[1]
        AND d.user_id = auth.uid()
        AND d.employment_type = '1099'
    )
  );

-- Drivers can view photos for their owned or assigned vehicles
CREATE POLICY "Drivers can view own vehicle photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      -- Owner
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN drivers d ON d.id = v.owner_driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = auth.uid()
      )
      OR
      -- Assigned
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
        JOIN drivers d ON d.id = dva.driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = auth.uid()
          AND dva.ended_at IS NULL
      )
    )
  );

-- Drivers can update photos on their owned vehicles (1099) or assigned vehicles (W2)
CREATE POLICY "Drivers can update vehicle photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (
      -- 1099 owner
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN drivers d ON d.id = v.owner_driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = auth.uid()
          AND d.employment_type = '1099'
      )
      OR
      -- W2 assigned (photos only)
      EXISTS (
        SELECT 1 FROM vehicles v
        JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
        JOIN drivers d ON d.id = dva.driver_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND d.user_id = auth.uid()
          AND d.employment_type = 'w2'
          AND dva.ended_at IS NULL
      )
    )
  );

-- 1099 drivers can delete photos on their own vehicles
CREATE POLICY "1099 drivers can delete own vehicle photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      JOIN drivers d ON d.id = v.owner_driver_id
      WHERE v.id::text = (storage.foldername(name))[1]
        AND d.user_id = auth.uid()
        AND d.employment_type = '1099'
    )
  );

-- Admins can manage photos for company vehicles
CREATE POLICY "Admins can manage company vehicle photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    )
  );

-- Super admins full access
CREATE POLICY "Super admins full access to vehicle photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'vehicle-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'vehicle-photos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- =============================================================================
-- 4. RLS POLICIES FOR DRIVERS MANAGING VEHICLES
-- =============================================================================

-- 1099 drivers can insert their own vehicles
CREATE POLICY "1099 drivers can create own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.user_id = auth.uid()
        AND d.employment_type = '1099'
        AND d.id = owner_driver_id
        AND d.company_id = company_id
    )
  );

-- 1099 drivers can update their own vehicles
CREATE POLICY "1099 drivers can update own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = auth.uid()
        AND d.employment_type = '1099'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = vehicles.owner_driver_id
        AND d.user_id = auth.uid()
        AND d.employment_type = '1099'
    )
  );

-- W2 drivers can update ONLY photo fields on assigned vehicles
-- Note: This is enforced at app level; RLS allows the update but service limits fields
CREATE POLICY "W2 drivers can update assigned vehicle photos"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_vehicle_assignments dva
      JOIN drivers d ON d.id = dva.driver_id
      WHERE dva.vehicle_id = vehicles.id
        AND d.user_id = auth.uid()
        AND d.employment_type = 'w2'
        AND dva.ended_at IS NULL
    )
  );

-- =============================================================================
-- 5. RLS POLICIES FOR DRIVER VEHICLE ASSIGNMENTS (DRIVER-SIDE)
-- =============================================================================

-- 1099 drivers can create assignments for their own vehicles
CREATE POLICY "1099 drivers can create own vehicle assignments"
  ON driver_vehicle_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers d
      JOIN vehicles v ON v.owner_driver_id = d.id
      WHERE d.user_id = auth.uid()
        AND d.employment_type = '1099'
        AND d.id = driver_id
        AND v.id = vehicle_id
    )
  );

-- 1099 drivers can update their own vehicle assignments (primary, etc.)
CREATE POLICY "1099 drivers can update own assignments"
  ON driver_vehicle_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers d
      WHERE d.id = driver_vehicle_assignments.driver_id
        AND d.user_id = auth.uid()
        AND d.employment_type = '1099'
    )
  );

-- =============================================================================
-- 6. HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate vehicle completeness
CREATE OR REPLACE FUNCTION calculate_vehicle_completeness(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_vehicle vehicles%ROWTYPE;
  v_is_complete BOOLEAN := true;
BEGIN
  SELECT * INTO v_vehicle FROM vehicles WHERE id = p_vehicle_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Required fields for all vehicles
  IF v_vehicle.make IS NULL OR v_vehicle.make = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.model IS NULL OR v_vehicle.model = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.year IS NULL THEN v_is_complete := false; END IF;
  IF v_vehicle.color IS NULL OR v_vehicle.color = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.license_plate IS NULL OR v_vehicle.license_plate = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.license_state IS NULL THEN v_is_complete := false; END IF;
  IF v_vehicle.vin IS NULL OR v_vehicle.vin = '' THEN v_is_complete := false; END IF;
  IF v_vehicle.exterior_photo_url IS NULL THEN v_is_complete := false; END IF;
  
  -- Wheelchair van requires lift photo
  IF v_vehicle.vehicle_type = 'wheelchair_van' AND v_vehicle.wheelchair_lift_photo_url IS NULL THEN
    v_is_complete := false;
  END IF;
  
  RETURN v_is_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update vehicle completeness
CREATE OR REPLACE FUNCTION update_vehicle_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_complete := calculate_vehicle_completeness(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update completeness on vehicle changes
DROP TRIGGER IF EXISTS update_vehicle_completeness_trigger ON vehicles;
CREATE TRIGGER update_vehicle_completeness_trigger
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_completeness();

-- Function to set primary vehicle (ensures only one primary per driver)
CREATE OR REPLACE FUNCTION set_primary_vehicle(
  p_driver_id UUID,
  p_vehicle_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Unset all other primaries for this driver
  UPDATE driver_vehicle_assignments
  SET is_primary = false
  WHERE driver_id = p_driver_id
    AND is_primary = true
    AND ended_at IS NULL;
  
  -- Set the new primary
  UPDATE driver_vehicle_assignments
  SET is_primary = true
  WHERE driver_id = p_driver_id
    AND vehicle_id = p_vehicle_id
    AND ended_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-set first vehicle as primary
CREATE OR REPLACE FUNCTION auto_set_primary_vehicle()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count existing active assignments for this driver
  SELECT COUNT(*) INTO v_count
  FROM driver_vehicle_assignments
  WHERE driver_id = NEW.driver_id
    AND ended_at IS NULL
    AND id != NEW.id;
  
  -- If this is the first/only vehicle, set as primary
  IF v_count = 0 THEN
    NEW.is_primary := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_primary_vehicle_trigger ON driver_vehicle_assignments;
CREATE TRIGGER auto_set_primary_vehicle_trigger
  BEFORE INSERT ON driver_vehicle_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_primary_vehicle();

-- =============================================================================
-- 7. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_complete 
  ON vehicles(owner_driver_id, is_complete) 
  WHERE owner_driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_status_reason 
  ON vehicles(status) 
  WHERE status = 'inactive';

-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON COLUMN vehicles.exterior_photo_url IS 'URL to exterior side-view photo';
COMMENT ON COLUMN vehicles.interior_photo_url IS 'URL to interior photo';
COMMENT ON COLUMN vehicles.wheelchair_lift_photo_url IS 'URL to wheelchair lift/ramp photo (required for wheelchair_van)';
COMMENT ON COLUMN vehicles.is_complete IS 'Auto-calculated completeness based on required fields';
COMMENT ON COLUMN vehicles.status_reason IS 'Reason for inactive/retired status';

COMMENT ON FUNCTION calculate_vehicle_completeness IS 'Calculates if vehicle has all required fields filled';
COMMENT ON FUNCTION set_primary_vehicle IS 'Sets a vehicle as primary for a driver, unsetting others';
