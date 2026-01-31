-- Migration: 027_billing_system.sql
-- Purpose: Billing plans, subscriptions, usage tracking

-- ============================================
-- 1. Billing Plans (seeded, managed in code)
-- ============================================

CREATE TABLE billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 'Free', 'Starter', 'Growth', 'Scale'
  slug TEXT NOT NULL UNIQUE,             -- 'free', 'starter', 'growth', 'scale'
  description TEXT,
  stripe_product_id TEXT,                -- Stripe Product ID
  stripe_price_id_monthly TEXT,          -- Stripe Price ID for monthly
  stripe_price_id_annual TEXT,           -- Stripe Price ID for annual
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_annual_cents INTEGER NOT NULL DEFAULT 0,
  operator_limit INTEGER,                -- NULL = unlimited
  features JSONB DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  is_contact_sales BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Company Subscriptions
-- ============================================

CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  plan_id UUID NOT NULL REFERENCES billing_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused', 'never_bill')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  operator_limit_override INTEGER,
  never_bill BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Usage Snapshots
-- ============================================

CREATE TABLE subscription_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  driver_count INTEGER NOT NULL DEFAULT 0,
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  admin_count INTEGER NOT NULL DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, snapshot_date)
);

-- ============================================
-- 4. Billing Events (audit log)
-- ============================================

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. Indexes
-- ============================================

CREATE INDEX idx_billing_plans_slug ON billing_plans(slug);
CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_stripe_customer ON company_subscriptions(stripe_customer_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX idx_billing_events_company ON billing_events(company_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_usage_snapshots_company_date ON subscription_usage_snapshots(company_id, snapshot_date);

-- ============================================
-- 6. RLS Policies
-- ============================================

ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- billing_plans: Public read for active plans, super admin all
CREATE POLICY "Anyone can read active public plans"
  ON billing_plans FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Super admins manage all plans"
  ON billing_plans FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- company_subscriptions: Super admin all, admin view own
CREATE POLICY "Super admins manage all subscriptions"
  ON company_subscriptions FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins view own subscription"
  ON company_subscriptions FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- usage_snapshots: Super admin all, admin own
CREATE POLICY "Super admins view all usage"
  ON subscription_usage_snapshots FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins view own usage"
  ON subscription_usage_snapshots FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

-- billing_events: Super admin only
CREATE POLICY "Super admins view all billing events"
  ON billing_events FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- ============================================
-- 7. Seed Plans
-- ============================================

INSERT INTO billing_plans (name, slug, description, price_monthly_cents, price_annual_cents, operator_limit, display_order, is_contact_sales) VALUES
('Free', 'free', 'Get started with basic features', 0, 0, 4, 0, false),
('Starter', 'starter', 'For small transportation companies', 5900, 49000, 20, 1, false),
('Growth', 'growth', 'For growing fleets', 14900, 124000, 50, 2, false),
('Scale', 'scale', 'For large operations', 34900, 290000, NULL, 3, false),
('Enterprise', 'enterprise', 'Custom solutions for enterprises', 0, 0, NULL, 4, true);

-- ============================================
-- 8. Auto-create subscription trigger
-- ============================================

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_subscriptions (company_id, plan_id, status)
  SELECT NEW.id, id, 'active'
  FROM billing_plans
  WHERE slug = 'free'
  LIMIT 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_created_subscription
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();

-- ============================================
-- 9. Updated At Trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_plans_timestamp
  BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER update_company_subscriptions_timestamp
  BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();
