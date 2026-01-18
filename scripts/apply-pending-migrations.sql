-- =============================================================================
-- COMBINED MIGRATION: 007 + 008 + 009
-- Run this in Supabase SQL Editor to apply pending migrations
-- =============================================================================

-- =============================================================================
-- PREREQUISITE: Helper Function (from migration 006)
-- =============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION 007: Driver Applications
-- =============================================================================

-- Add 'draft' to application_status check constraint
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_application_status_check;
ALTER TABLE drivers ADD CONSTRAINT drivers_application_status_check 
  CHECK (application_status IN ('draft', 'pending', 'under_review', 'approved', 'rejected', 'withdrawn'));

-- Add application-specific columns
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_front_url TEXT,
  ADD COLUMN IF NOT EXISTS license_back_url TEXT,
  ADD COLUMN IF NOT EXISTS experience_notes TEXT,
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS can_reapply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eula_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eula_version VARCHAR(50);

-- Index for application submitted date
CREATE INDEX IF NOT EXISTS idx_drivers_application_submitted_at 
  ON drivers(application_submitted_at DESC);

-- Create application_drafts table
CREATE TABLE IF NOT EXISTS application_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT application_drafts_user_company_unique UNIQUE(user_id, company_id)
);

-- Index for drafts
CREATE INDEX IF NOT EXISTS idx_application_drafts_user_company 
  ON application_drafts(user_id, company_id);

-- Updated at trigger for drafts
DROP TRIGGER IF EXISTS update_application_drafts_updated_at ON application_drafts;
CREATE TRIGGER update_application_drafts_updated_at
  BEFORE UPDATE ON application_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on application_drafts
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies for application_drafts (use DO blocks to avoid duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can view own drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can view own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can create own drafts"
      ON application_drafts FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can create own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can create own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can update own drafts"
      ON application_drafts FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can update own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can update own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Users can delete own drafts"
      ON application_drafts FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can delete own drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can delete own drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view company drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Admins can view company drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      );
    RAISE NOTICE 'Created policy: Admins can view company drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Admins can view company drafts';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Super admins can view all drafts' 
    AND tablename = 'application_drafts'
  ) THEN
    CREATE POLICY "Super admins can view all drafts"
      ON application_drafts FOR SELECT
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
    RAISE NOTICE 'Created policy: Super admins can view all drafts';
  ELSE
    RAISE NOTICE 'Policy already exists: Super admins can view all drafts';
  END IF;
END $$;

-- Additional driver RLS policies for applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can create own driver application' 
    AND tablename = 'drivers'
  ) THEN
    CREATE POLICY "Users can create own driver application"
      ON drivers FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Users can create own driver application';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can create own driver application';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Rejected drivers can reapply' 
    AND tablename = 'drivers'
  ) THEN
    CREATE POLICY "Rejected drivers can reapply"
      ON drivers FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid()
        AND application_status = 'rejected'
        AND can_reapply_at IS NOT NULL
        AND can_reapply_at <= NOW()
      )
      WITH CHECK (user_id = auth.uid());
    RAISE NOTICE 'Created policy: Rejected drivers can reapply';
  ELSE
    RAISE NOTICE 'Policy already exists: Rejected drivers can reapply';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 008: Public Company Access
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public can view active companies' 
    AND tablename = 'companies'
  ) THEN
    CREATE POLICY "Public can view active companies"
      ON companies FOR SELECT
      TO anon
      USING (status = 'active');
    RAISE NOTICE 'Created policy: Public can view active companies';
  ELSE
    RAISE NOTICE 'Policy already exists: Public can view active companies';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 009: Credential Storage Bucket
-- =============================================================================

-- Create the storage bucket for credential documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'credential-documents',
  'credential-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload to own application folder' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload to own application folder"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'credential-documents' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can upload to own application folder';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can upload to own application folder';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can view own uploads"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can view own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update own uploads"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can update own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can update own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete own uploads' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete own uploads"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    RAISE NOTICE 'Created policy: Users can delete own uploads';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can delete own uploads';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view company credential documents' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can view company credential documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND EXISTS (
          SELECT 1 FROM drivers d
          JOIN users u ON d.user_id = u.id
          WHERE u.id::text = (storage.foldername(name))[1]
            AND d.company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
        )
      );
    RAISE NOTICE 'Created policy: Admins can view company credential documents';
  ELSE
    RAISE NOTICE 'Policy already exists: Admins can view company credential documents';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Super admins can view all credential documents' 
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Super admins can view all credential documents"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'credential-documents'
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      );
    RAISE NOTICE 'Created policy: Super admins can view all credential documents';
  ELSE
    RAISE NOTICE 'Policy already exists: Super admins can view all credential documents';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 008b: Authenticated users can view active companies (for application)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Authenticated users can view active companies' 
    AND tablename = 'companies'
  ) THEN
    CREATE POLICY "Authenticated users can view active companies"
      ON companies FOR SELECT
      TO authenticated
      USING (status = 'active');
    RAISE NOTICE 'Created policy: Authenticated users can view active companies';
  ELSE
    RAISE NOTICE 'Policy already exists: Authenticated users can view active companies';
  END IF;
END $$;

-- =============================================================================
-- MIGRATION 010: Auto-Create User Profile on Signup
-- =============================================================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_app_meta_data ->> 'role', 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: Create profiles for any auth users that don't have one
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_app_meta_data ->> 'role', 'driver')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATION 011: Credential Types
-- =============================================================================

-- 1. BROKERS TABLE (minimal, prerequisite for broker-scoped credentials)
CREATE TABLE IF NOT EXISTS brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_brokers_company_id ON brokers(company_id);
CREATE INDEX IF NOT EXISTS idx_brokers_active ON brokers(company_id, is_active);

ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to brokers" ON brokers;
CREATE POLICY "Super admins full access to brokers"
  ON brokers FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company brokers" ON brokers;
CREATE POLICY "Admins can manage company brokers"
  ON brokers FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view brokers" ON brokers;
CREATE POLICY "Company members can view brokers"
  ON brokers FOR SELECT TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- 2. CREDENTIAL TYPES TABLE
CREATE TABLE IF NOT EXISTS credential_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'broker')),
  broker_id UUID REFERENCES brokers(id) ON DELETE CASCADE,
  employment_type TEXT NOT NULL DEFAULT 'both' CHECK (employment_type IN ('both', 'w2_only', '1099_only')),
  requirement TEXT NOT NULL DEFAULT 'required' CHECK (requirement IN ('required', 'optional', 'recommended')),
  vehicle_types TEXT[],
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'document_upload', 'photo', 'signature', 'form', 'admin_verified', 'date_entry'
  )),
  form_schema JSONB,
  signature_document_url TEXT,
  expiration_type TEXT NOT NULL DEFAULT 'never' CHECK (expiration_type IN (
    'never', 'fixed_interval', 'driver_specified'
  )),
  expiration_interval_days INTEGER,
  expiration_warning_days INTEGER DEFAULT 30,
  grace_period_days INTEGER DEFAULT 30,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_seeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT broker_required_for_broker_scope CHECK (scope = 'global' OR broker_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_credential_types_company ON credential_types(company_id);
CREATE INDEX IF NOT EXISTS idx_credential_types_broker ON credential_types(broker_id);
CREATE INDEX IF NOT EXISTS idx_credential_types_active ON credential_types(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_credential_types_category ON credential_types(company_id, category);

ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to credential_types" ON credential_types;
CREATE POLICY "Super admins full access to credential_types"
  ON credential_types FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company credential types" ON credential_types;
CREATE POLICY "Admins can manage company credential types"
  ON credential_types FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view credential types" ON credential_types;
CREATE POLICY "Company members can view credential types"
  ON credential_types FOR SELECT TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- 3. DRIVER CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS driver_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  document_url TEXT,
  signature_data JSONB,
  form_data JSONB,
  entered_date DATE,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason TEXT,
  grace_period_ends TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, credential_type_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_credentials_driver ON driver_credentials(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_type ON driver_credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_company ON driver_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_credentials_status ON driver_credentials(status);

ALTER TABLE driver_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to driver_credentials" ON driver_credentials;
CREATE POLICY "Super admins full access to driver_credentials"
  ON driver_credentials FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company driver credentials" ON driver_credentials;
CREATE POLICY "Admins can manage company driver credentials"
  ON driver_credentials FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own credentials" ON driver_credentials;
CREATE POLICY "Drivers can view own credentials"
  ON driver_credentials FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can submit own credentials" ON driver_credentials;
CREATE POLICY "Drivers can submit own credentials"
  ON driver_credentials FOR INSERT TO authenticated
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can update own credentials" ON driver_credentials;
CREATE POLICY "Drivers can update own credentials"
  ON driver_credentials FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- 4. VEHICLE CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS vehicle_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  document_url TEXT,
  signature_data JSONB,
  form_data JSONB,
  entered_date DATE,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason TEXT,
  grace_period_ends TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id, credential_type_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_vehicle ON vehicle_credentials(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_type ON vehicle_credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_company ON vehicle_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_status ON vehicle_credentials(status);

ALTER TABLE vehicle_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to vehicle_credentials" ON vehicle_credentials;
CREATE POLICY "Super admins full access to vehicle_credentials"
  ON vehicle_credentials FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage company vehicle credentials" ON vehicle_credentials;
CREATE POLICY "Admins can manage company vehicle credentials"
  ON vehicle_credentials FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- 5. CREDENTIAL TYPE TEMPLATES (Super Admin)
CREATE TABLE IF NOT EXISTS credential_type_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('driver', 'vehicle')),
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'document_upload', 'photo', 'signature', 'form', 'admin_verified', 'date_entry'
  )),
  employment_type TEXT NOT NULL DEFAULT 'both',
  requirement TEXT NOT NULL DEFAULT 'required',
  expiration_type TEXT NOT NULL DEFAULT 'never',
  expiration_interval_days INTEGER,
  expiration_warning_days INTEGER DEFAULT 30,
  form_schema JSONB,
  signature_document_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credential_type_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admins can manage templates" ON credential_type_templates;
CREATE POLICY "Super Admins can manage templates"
  ON credential_type_templates FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Everyone can view active templates" ON credential_type_templates;
CREATE POLICY "Everyone can view active templates"
  ON credential_type_templates FOR SELECT TO authenticated
  USING (is_active = true);

-- 6. UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON brokers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credential_types_updated_at ON credential_types;
CREATE TRIGGER update_credential_types_updated_at
  BEFORE UPDATE ON credential_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_credentials_updated_at ON driver_credentials;
CREATE TRIGGER update_driver_credentials_updated_at
  BEFORE UPDATE ON driver_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicle_credentials_updated_at ON vehicle_credentials;
CREATE TRIGGER update_vehicle_credentials_updated_at
  BEFORE UPDATE ON vehicle_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credential_type_templates_updated_at ON credential_type_templates;
CREATE TRIGGER update_credential_type_templates_updated_at
  BEFORE UPDATE ON credential_type_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. SEED DEFAULT TEMPLATES
INSERT INTO credential_type_templates (name, description, category, submission_type, requirement, expiration_type, display_order)
VALUES
  ('Background Check', 'Upload your background check certificate from an approved provider.', 'driver', 'document_upload', 'required', 'never', 1),
  ('Driver''s License', 'Upload photos of the front and back of your valid driver''s license.', 'driver', 'photo', 'required', 'driver_specified', 2),
  ('Vehicle Insurance', 'Upload your current vehicle insurance card or declaration page.', 'vehicle', 'document_upload', 'required', 'driver_specified', 3),
  ('Vehicle Registration', 'Upload your current vehicle registration.', 'vehicle', 'document_upload', 'required', 'driver_specified', 4),
  ('W-9 Form', 'Complete and sign the W-9 tax form for 1099 contractors.', 'driver', 'signature', 'required', 'never', 5),
  ('Vehicle Inspection', 'Upload your most recent vehicle inspection certificate.', 'vehicle', 'document_upload', 'required', 'fixed_interval', 6)
ON CONFLICT DO NOTHING;

UPDATE credential_type_templates SET expiration_interval_days = 365 WHERE name = 'Vehicle Inspection';

-- =============================================================================
-- MIGRATION 012: Broker Management
-- =============================================================================

-- 1. EXTEND BROKERS TABLE
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS service_states TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_vehicle_types TEXT[] NOT NULL DEFAULT ARRAY['sedan', 'wheelchair_van', 'stretcher_van', 'suv', 'minivan'],
  ADD COLUMN IF NOT EXISTS accepted_employment_types TEXT[] NOT NULL DEFAULT ARRAY['w2', '1099'],
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE brokers DROP CONSTRAINT IF EXISTS brokers_status_check;
ALTER TABLE brokers ADD CONSTRAINT brokers_status_check CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_brokers_status ON brokers(company_id, status);

-- 2. DRIVER-BROKER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS driver_broker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'removed')),
  requested_by TEXT NOT NULL CHECK (requested_by IN ('admin', 'driver')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, broker_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_broker_driver ON driver_broker_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_broker ON driver_broker_assignments(broker_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_company ON driver_broker_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_broker_status ON driver_broker_assignments(status);

ALTER TABLE driver_broker_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to broker assignments" ON driver_broker_assignments;
CREATE POLICY "Super admins full access to broker assignments"
  ON driver_broker_assignments FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker assignments" ON driver_broker_assignments;
CREATE POLICY "Admins can manage broker assignments"
  ON driver_broker_assignments FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company staff can view broker assignments" ON driver_broker_assignments;
CREATE POLICY "Company staff can view broker assignments"
  ON driver_broker_assignments FOR SELECT TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

DROP POLICY IF EXISTS "Drivers can view own broker assignments" ON driver_broker_assignments;
CREATE POLICY "Drivers can view own broker assignments"
  ON driver_broker_assignments FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can request broker assignment" ON driver_broker_assignments;
CREATE POLICY "Drivers can request broker assignment"
  ON driver_broker_assignments FOR INSERT TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    AND requested_by = 'driver'
    AND status = 'pending'
  );

-- 3. BROKER RATES TABLE
CREATE TABLE IF NOT EXISTS broker_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van')),
  base_rate DECIMAL(10,2) NOT NULL,
  per_mile_rate DECIMAL(10,4) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(broker_id, vehicle_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_broker_rates_broker ON broker_rates(broker_id);
CREATE INDEX IF NOT EXISTS idx_broker_rates_company ON broker_rates(company_id);

ALTER TABLE broker_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to broker rates" ON broker_rates;
CREATE POLICY "Super admins full access to broker rates"
  ON broker_rates FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can manage broker rates" ON broker_rates;
CREATE POLICY "Admins can manage broker rates"
  ON broker_rates FOR ALL TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Company members can view broker rates" ON broker_rates;
CREATE POLICY "Company members can view broker rates"
  ON broker_rates FOR SELECT TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- 4. TRIGGERS
DROP TRIGGER IF EXISTS update_broker_rates_updated_at ON broker_rates;
CREATE TRIGGER update_broker_rates_updated_at
  BEFORE UPDATE ON broker_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- MIGRATION 013: Vehicle Assignment Extensions
-- =============================================================================

-- 1. EXTEND DRIVER_VEHICLE_ASSIGNMENTS TABLE
ALTER TABLE driver_vehicle_assignments
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS end_reason TEXT;

-- Update assignment_type check constraint to include 'borrowed'
ALTER TABLE driver_vehicle_assignments DROP CONSTRAINT IF EXISTS driver_vehicle_assignments_assignment_type_check;
ALTER TABLE driver_vehicle_assignments ADD CONSTRAINT driver_vehicle_assignments_assignment_type_check 
  CHECK (assignment_type IN ('owned', 'assigned', 'borrowed'));

-- Migrate 'shared' to 'borrowed' if any exist
UPDATE driver_vehicle_assignments SET assignment_type = 'borrowed' WHERE assignment_type = 'shared';

CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_active 
  ON driver_vehicle_assignments(vehicle_id) WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_vehicle_assignments_primary 
  ON driver_vehicle_assignments(driver_id) WHERE is_primary = true AND ended_at IS NULL;

-- 2. VEHICLE ASSIGNMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS vehicle_assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  action TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned', 'transferred', 'primary_changed', 'extended', 'ended_early')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  performed_by UUID REFERENCES users(id),
  reason TEXT,
  notes TEXT,
  assignment_id UUID REFERENCES driver_vehicle_assignments(id) ON DELETE SET NULL,
  transferred_to_driver_id UUID REFERENCES drivers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_vehicle ON vehicle_assignment_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_driver ON vehicle_assignment_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_company ON vehicle_assignment_history(company_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_created ON vehicle_assignment_history(created_at DESC);

-- 3. RLS FOR VEHICLE ASSIGNMENT HISTORY
ALTER TABLE vehicle_assignment_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins full access to assignment history" ON vehicle_assignment_history;
CREATE POLICY "Super admins full access to assignment history"
  ON vehicle_assignment_history FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

DROP POLICY IF EXISTS "Admins can view company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can view company assignment history"
  ON vehicle_assignment_history FOR SELECT TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Admins can insert company assignment history" ON vehicle_assignment_history;
CREATE POLICY "Admins can insert company assignment history"
  ON vehicle_assignment_history FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Drivers can view own assignment history" ON vehicle_assignment_history;
CREATE POLICY "Drivers can view own assignment history"
  ON vehicle_assignment_history FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'Migrations 007-013 applied successfully!' as status;

-- Verify tables exist
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'application_drafts') as application_drafts_exists;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'credential_types') as credential_types_exists;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_credentials') as driver_credentials_exists;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_broker_assignments') as driver_broker_assignments_exists;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'broker_rates') as broker_rates_exists;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicle_assignment_history') as vehicle_assignment_history_exists;

-- Verify bucket exists
SELECT id, name, public FROM storage.buckets WHERE id = 'credential-documents';

-- Verify trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Verify templates seeded
SELECT COUNT(*) as template_count FROM credential_type_templates;

-- Verify key policies
SELECT policyname FROM pg_policies WHERE tablename = 'vehicle_assignment_history' ORDER BY policyname;
