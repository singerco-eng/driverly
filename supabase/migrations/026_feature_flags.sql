-- Migration: 026_feature_flags.sql
-- Purpose: Feature flag system for gradual rollout and per-company access control

-- ============================================
-- 1. Feature Flag Definitions
-- ============================================

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- 'billing_enabled', 'api_access', etc.
  name TEXT NOT NULL,                 -- 'Billing System', 'API Access'
  description TEXT,
  category TEXT DEFAULT 'general',    -- 'billing', 'core', 'operations', etc.
  default_enabled BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false,  -- Hidden from Admin view (super admin only)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Company-Specific Overrides
-- ============================================

CREATE TABLE company_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  reason TEXT,                        -- Why was this overridden?
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, flag_id)
);

-- ============================================
-- 3. Indexes
-- ============================================

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_category ON feature_flags(category);
CREATE INDEX idx_company_overrides_company ON company_feature_overrides(company_id);
CREATE INDEX idx_company_overrides_flag ON company_feature_overrides(flag_id);

-- ============================================
-- 4. RLS Policies
-- ============================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_feature_overrides ENABLE ROW LEVEL SECURITY;

-- feature_flags: Super Admin full access, others read non-internal
CREATE POLICY "Super admins manage all flags"
  ON feature_flags FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Authenticated users read public flags"
  ON feature_flags FOR SELECT
  USING (is_internal = false);

-- company_feature_overrides: Super Admin all, Admin read own
CREATE POLICY "Super admins manage all overrides"
  ON company_feature_overrides FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins view own company overrides"
  ON company_feature_overrides FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- ============================================
-- 5. Seed Initial Flags
-- ============================================

INSERT INTO feature_flags (key, name, description, category, default_enabled, is_internal) VALUES
-- Billing (disabled until BILLING-001 complete)
('billing_enabled', 'Billing System', 'Subscription and payment management', 'billing', true, false),
('billing_self_service', 'Self-Service Billing', 'Admins can upgrade/downgrade plans', 'billing', false, false),
('billing_enforcement', 'Limit Enforcement', 'Enforce operator limits on drivers/vehicles', 'billing', false, false),

-- Core features (enabled by default)
('driver_management', 'Driver Management', 'Manage drivers and applications', 'core', true, false),
('vehicle_management', 'Vehicle Management', 'Manage vehicles and assignments', 'core', true, false),
('credential_management', 'Credential Management', 'Credential types and submissions', 'core', true, false),
('broker_management', 'Broker Management', 'Trip sources and broker assignments', 'core', true, false),

-- Future features (disabled by default)
('trip_management', 'Trip Management', 'Trip creation and tracking', 'operations', false, false),
('driver_payments', 'Driver Payments', 'Pay drivers through the platform', 'finance', false, false),
('advanced_reports', 'Advanced Reports', 'Enhanced analytics and exports', 'analytics', false, false),
('api_access', 'API Access', 'REST API for external integrations', 'integrations', false, false),
('white_label', 'White Label', 'Custom branding and domain', 'enterprise', false, false);

-- ============================================
-- 6. Updated At Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_timestamp
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flag_timestamp();

CREATE TRIGGER update_company_feature_overrides_timestamp
  BEFORE UPDATE ON company_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION update_feature_flag_timestamp();
