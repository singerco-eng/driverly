# CODEX-031: BILLING-001 Subscription System

## Status: READY FOR IMPLEMENTATION

## Overview

Build the **Billing & Subscription System** for Driverly. This enables transportation companies to subscribe to tiered plans with **operator limits** (drivers + vehicles combined). Companies start on the Free plan and can upgrade via Stripe Checkout.

**Key Concept: "Operators"** = Drivers + Vehicles combined. A company with 10 drivers and 5 vehicles uses 15 operators.

**Feature Spec:** `docs/features/billing/BILLING-001-subscription-system.md`

## Prerequisites

- ✅ FF-001 Feature Flags implemented (CODEX-030)
- Super Admin and Admin layouts complete
- Companies, drivers, vehicles tables exist
- Supabase Edge Functions pattern established

## Tier Structure

| Tier | Monthly | Annual | Operators | Target |
|------|---------|--------|-----------|--------|
| **Free** | $0 | $0 | 4 | Solo operators, testing |
| **Starter** | $59 | $490/yr | 20 | Small fleets |
| **Growth** | $149 | $1,240/yr | 50 | Growing companies |
| **Scale** | $349 | $2,900/yr | Unlimited | Large fleets |
| **Enterprise** | Custom | Custom | Unlimited+ | Custom contracts |

---

## User Stories

### Phase 1: Foundation (B-001 to B-003)

| # | Role | Story |
|---|------|-------|
| B-001 | System | When a new company is created, automatically assign them to the Free plan. |
| B-002 | System | Store billing plan definitions (name, price, operator limits). |
| B-003 | System | Track each company's subscription status and plan. |

### Phase 2: Usage Checking & Limits (B-004 to B-008)

| # | Role | Story |
|---|------|-------|
| B-004 | Admin | When I try to add a driver/vehicle exceeding my limit, show an upgrade modal. |
| B-005 | System | Calculate operator usage as (drivers + vehicles). |
| B-006 | System | Respect `never_bill` flags - test accounts bypass all limits. |
| B-007 | System | Respect per-company limit overrides for enterprise deals. |
| B-008 | Admin | On Free plan with 4 operators, I cannot add a 5th until I upgrade. |

### Phase 3: Admin Billing UI (B-009 to B-014)

| # | Role | Story |
|---|------|-------|
| B-009 | Admin | View my current plan name, price, and billing interval. |
| B-010 | Admin | See operator usage as a progress bar "X/Y operators". |
| B-011 | Admin | See breakdown "X drivers · Y vehicles". |
| B-012 | Admin | See my next billing date. |
| B-013 | Admin | View invoice history with download links. |
| B-014 | Admin | Click "Manage Plan" to open Stripe Customer Portal. |

### Phase 4: Stripe Integration (B-015 to B-021)

| # | Role | Story |
|---|------|-------|
| B-015 | Admin | Click "Upgrade" to redirect to Stripe Checkout. |
| B-016 | Admin | After successful checkout, return to Billing page with new plan active. |
| B-017 | Admin | If I cancel checkout, return to Billing page unchanged. |
| B-018 | Admin | Downgrade via Stripe Customer Portal. |
| B-019 | Admin | Cancel subscription via Customer Portal (reverts to Free). |
| B-020 | System | Process Stripe webhooks to sync subscription status. |
| B-021 | System | Log all billing events for audit. |

### Phase 5: Super Admin Dashboard (B-022 to B-029)

| # | Role | Story |
|---|------|-------|
| B-022 | Super Admin | View billing dashboard with MRR and subscriber counts. |
| B-023 | Super Admin | See list of all companies with plan, status, usage. |
| B-024 | Super Admin | Filter companies by plan or billing status. |
| B-025 | Super Admin | View company billing details in CompanyDetail. |
| B-026 | Super Admin | Override company operator limits. |
| B-027 | Super Admin | Toggle `never_bill` flag for test accounts. |
| B-028 | Super Admin | Add admin notes to subscriptions. |
| B-029 | Super Admin | View all billing events. |

### Phase 6: Upgrade Prompts (B-030 to B-037)

| # | Role | Story |
|---|------|-------|
| B-030 | Admin | At 80%+ usage, see warning banner on Dashboard. |
| B-031 | Admin | After downgrade over limit, see "Over Limit" banner. |
| B-032 | Admin | When over limit, can edit/delete but not add operators. |
| B-033 | Admin | See clear messaging about limit status. |
| B-034 | Admin | Upgrade modal shows all plans with prices and limits. |
| B-035 | Admin | Toggle monthly/annual pricing in upgrade modal. |
| B-036 | System | Immediate limit enforcement on downgrade. |
| B-037 | System | Prevent upgrade/downgrade gaming. |

---

## Tasks

### Task 1: Database Migration

Create `supabase/migrations/027_billing_system.sql`:

```sql
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
```

---

### Task 2: TypeScript Types

Create `src/types/billing.ts`:

```typescript
export type SubscriptionStatus = 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'trialing' 
  | 'paused' 
  | 'never_bill';

export type BillingInterval = 'monthly' | 'annual';

export interface BillingPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  price_monthly_cents: number;
  price_annual_cents: number;
  operator_limit: number | null;  // null = unlimited
  features: string[];
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  is_contact_sales: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  plan?: BillingPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  operator_limit_override: number | null;
  never_bill: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends CompanySubscription {
  plan: BillingPlan;
}

export interface OperatorUsage {
  driver_count: number;
  vehicle_count: number;
  operator_count: number;       // driver_count + vehicle_count
  operator_limit: number | null;
  operator_percentage: number;  // 0-100
  is_over_limit: boolean;
  is_at_warning_threshold: boolean;  // >= 80%
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  message?: string;
}

export interface BillingEvent {
  id: string;
  company_id: string | null;
  event_type: string;
  stripe_event_id: string | null;
  payload: Record<string, unknown>;
  processed_at: string;
}

export interface BillingStats {
  total_mrr_cents: number;
  subscriber_counts: {
    free: number;
    starter: number;
    growth: number;
    scale: number;
    enterprise: number;
  };
  total_companies: number;
}
```

Update `src/types/index.ts`:

```typescript
export * from './billing';
```

---

### Task 3: Billing Service

Create `src/services/billing.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  BillingPlan,
  CompanySubscription,
  SubscriptionWithPlan,
  OperatorUsage,
  UsageCheckResult,
  BillingStats,
  BillingEvent,
} from '@/types/billing';

// ============ PLANS ============

export async function getAllPlans(): Promise<BillingPlan[]> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data ?? [];
}

export async function getPlanBySlug(slug: string): Promise<BillingPlan | null> {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

// ============ SUBSCRIPTIONS ============

export async function getCompanySubscription(
  companyId: string
): Promise<SubscriptionWithPlan | null> {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*)')
    .eq('company_id', companyId)
    .single();

  if (error) return null;
  return data as SubscriptionWithPlan;
}

export async function getAllSubscriptions(): Promise<SubscriptionWithPlan[]> {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*), company:companies(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ============ USAGE ============

export async function getOperatorUsage(companyId: string): Promise<OperatorUsage> {
  // Get subscription with plan
  const subscription = await getCompanySubscription(companyId);

  // Get driver count
  const { count: driverCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  // Get vehicle count
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const operatorCount = (driverCount ?? 0) + (vehicleCount ?? 0);
  const limit = subscription?.operator_limit_override ?? subscription?.plan?.operator_limit ?? null;
  const percentage = limit ? Math.round((operatorCount / limit) * 100) : 0;

  return {
    driver_count: driverCount ?? 0,
    vehicle_count: vehicleCount ?? 0,
    operator_count: operatorCount,
    operator_limit: limit,
    operator_percentage: Math.min(percentage, 100),
    is_over_limit: limit !== null && operatorCount >= limit,
    is_at_warning_threshold: limit !== null && percentage >= 80,
  };
}

export async function checkCanAddOperator(companyId: string): Promise<UsageCheckResult> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0, message: 'No subscription found' };
  }

  // Never-bill accounts bypass limits
  if (subscription.never_bill || subscription.status === 'never_bill') {
    return { allowed: true, current: 0, limit: null };
  }

  const usage = await getOperatorUsage(companyId);
  const limit = subscription.operator_limit_override ?? subscription.plan?.operator_limit ?? null;

  // Unlimited
  if (limit === null) {
    return { allowed: true, current: usage.operator_count, limit };
  }

  const allowed = usage.operator_count < limit;
  return {
    allowed,
    current: usage.operator_count,
    limit,
    message: allowed
      ? undefined
      : `You've reached your operator limit (${usage.operator_count}/${limit}). Upgrade to add more drivers or vehicles.`,
  };
}

// ============ SUPER ADMIN ============

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<CompanySubscription>
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update(updates)
    .eq('id', subscriptionId);

  if (error) throw error;
}

export async function setNeverBill(
  companyId: string,
  neverBill: boolean
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update({ 
      never_bill: neverBill,
      status: neverBill ? 'never_bill' : 'active'
    })
    .eq('company_id', companyId);

  if (error) throw error;
}

export async function setOperatorLimitOverride(
  companyId: string,
  limit: number | null
): Promise<void> {
  const { error } = await supabase
    .from('company_subscriptions')
    .update({ operator_limit_override: limit })
    .eq('company_id', companyId);

  if (error) throw error;
}

export async function getBillingStats(): Promise<BillingStats> {
  const { data: subscriptions } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(slug, price_monthly_cents)');

  const counts = { free: 0, starter: 0, growth: 0, scale: 0, enterprise: 0 };
  let totalMrr = 0;

  for (const sub of subscriptions ?? []) {
    const slug = sub.plan?.slug as keyof typeof counts;
    if (slug && counts[slug] !== undefined) {
      counts[slug]++;
    }
    if (sub.status === 'active' && sub.plan?.price_monthly_cents) {
      totalMrr += sub.plan.price_monthly_cents;
    }
  }

  return {
    total_mrr_cents: totalMrr,
    subscriber_counts: counts,
    total_companies: subscriptions?.length ?? 0,
  };
}

export async function getBillingEvents(limit = 50): Promise<BillingEvent[]> {
  const { data, error } = await supabase
    .from('billing_events')
    .select('*')
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ============ STRIPE HELPERS ============

export async function createCheckoutSession(
  companyId: string,
  priceId: string,
  interval: 'monthly' | 'annual'
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { companyId, priceId, interval },
  });

  if (error) throw error;
  return data;
}

export async function createPortalSession(companyId: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { companyId },
  });

  if (error) throw error;
  return data;
}
```

---

### Task 4: Billing Hooks

Create `src/hooks/useBilling.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as billingService from '@/services/billing';

export const billingKeys = {
  all: ['billing'] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  subscription: (companyId: string) => [...billingKeys.all, 'subscription', companyId] as const,
  usage: (companyId: string) => [...billingKeys.all, 'usage', companyId] as const,
  allSubscriptions: () => [...billingKeys.all, 'subscriptions'] as const,
  stats: () => [...billingKeys.all, 'stats'] as const,
  events: () => [...billingKeys.all, 'events'] as const,
};

// ============ PLANS ============

export function useBillingPlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: billingService.getAllPlans,
    staleTime: 10 * 60 * 1000, // Plans rarely change
  });
}

// ============ SUBSCRIPTION ============

export function useSubscription(companyId?: string) {
  const { profile } = useAuth();
  const effectiveCompanyId = companyId ?? profile?.company_id;

  return useQuery({
    queryKey: billingKeys.subscription(effectiveCompanyId ?? ''),
    queryFn: () => billingService.getCompanySubscription(effectiveCompanyId!),
    enabled: !!effectiveCompanyId,
  });
}

export function useMySubscription() {
  const { profile } = useAuth();
  return useSubscription(profile?.company_id);
}

// ============ USAGE ============

export function useOperatorUsage(companyId?: string) {
  const { profile } = useAuth();
  const effectiveCompanyId = companyId ?? profile?.company_id;

  return useQuery({
    queryKey: billingKeys.usage(effectiveCompanyId ?? ''),
    queryFn: () => billingService.getOperatorUsage(effectiveCompanyId!),
    enabled: !!effectiveCompanyId,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useCanAddOperator() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: [...billingKeys.usage(companyId ?? ''), 'canAdd'],
    queryFn: () => billingService.checkCanAddOperator(companyId!),
    enabled: !!companyId,
  });
}

// ============ SUPER ADMIN ============

export function useAllSubscriptions() {
  return useQuery({
    queryKey: billingKeys.allSubscriptions(),
    queryFn: billingService.getAllSubscriptions,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: billingKeys.stats(),
    queryFn: billingService.getBillingStats,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useBillingEvents() {
  return useQuery({
    queryKey: billingKeys.events(),
    queryFn: () => billingService.getBillingEvents(),
  });
}

export function useSetNeverBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, neverBill }: { companyId: string; neverBill: boolean }) =>
      billingService.setNeverBill(companyId, neverBill),
    onSuccess: (_, { neverBill }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast({ title: neverBill ? 'Marked as never-bill' : 'Billing enabled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetOperatorLimitOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, limit }: { companyId: string; limit: number | null }) =>
      billingService.setOperatorLimitOverride(companyId, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast({ title: 'Operator limit updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ STRIPE ============

export function useCreateCheckoutSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      companyId,
      priceId,
      interval,
    }: {
      companyId: string;
      priceId: string;
      interval: 'monthly' | 'annual';
    }) => billingService.createCheckoutSession(companyId, priceId, interval),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: 'Checkout failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreatePortalSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (companyId: string) => billingService.createPortalSession(companyId),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: 'Portal failed', description: error.message, variant: 'destructive' });
    },
  });
}
```

---

### Task 5: Admin Billing Page

Create `src/pages/admin/Billing.tsx`:

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMySubscription, useOperatorUsage, useCreatePortalSession } from '@/hooks/useBilling';
import { OperatorUsageBar } from '@/components/features/admin/OperatorUsageBar';
import { CurrentPlanCard } from '@/components/features/admin/CurrentPlanCard';
import { UpgradeModal } from '@/components/features/admin/UpgradeModal';
import { UsageBanner } from '@/components/features/admin/UsageBanner';

export default function Billing() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useAuth();

  const { data: subscription, isLoading: subLoading } = useMySubscription();
  const { data: usage, isLoading: usageLoading } = useOperatorUsage();
  const createPortal = useCreatePortalSession();

  // Handle Stripe redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Subscription updated!', description: 'Your plan is now active.' });
    } else if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Checkout canceled', description: 'No changes were made.' });
    }
  }, [searchParams, toast]);

  const handleManagePlan = () => {
    if (profile?.company_id) {
      createPortal.mutate(profile.company_id);
    }
  };

  const isLoading = subLoading || usageLoading;
  const isPaid = subscription?.plan?.slug !== 'free';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Billing"
        description="Manage your subscription and view usage"
      />

      <UsageBanner usage={usage} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan */}
        <CurrentPlanCard
          subscription={subscription}
          isLoading={isLoading}
          onManage={handleManagePlan}
          isManaging={createPortal.isPending}
        />

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operator Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {usage && <OperatorUsageBar usage={usage} showBreakdown />}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Section - Only for free users */}
      {!isPaid && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Get more operators and unlock additional features.
            </p>
            <UpgradeModal companyId={profile?.company_id ?? ''} />
          </CardContent>
        </Card>
      )}

      {/* Manage for paid users */}
      {isPaid && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Update payment method, change plan, or view invoices.
            </p>
            <Button onClick={handleManagePlan} disabled={createPortal.isPending}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Billing Portal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### Task 6: Operator Usage Bar Component

Create `src/components/features/admin/OperatorUsageBar.tsx`:

```typescript
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { OperatorUsage } from '@/types/billing';

interface OperatorUsageBarProps {
  usage: OperatorUsage;
  showBreakdown?: boolean;
  className?: string;
}

export function OperatorUsageBar({ usage, showBreakdown, className }: OperatorUsageBarProps) {
  const isUnlimited = usage.operator_limit === null;
  const percentage = isUnlimited ? 0 : usage.operator_percentage;

  const getProgressColor = () => {
    if (usage.is_over_limit) return 'bg-destructive';
    if (usage.is_at_warning_threshold) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {usage.operator_count}
          {!isUnlimited && ` / ${usage.operator_limit}`} operators
        </span>
        {!isUnlimited && (
          <span className="text-muted-foreground">{percentage}%</span>
        )}
        {isUnlimited && (
          <span className="text-muted-foreground">Unlimited</span>
        )}
      </div>

      {!isUnlimited && (
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2"
          indicatorClassName={getProgressColor()}
        />
      )}

      {showBreakdown && (
        <p className="text-xs text-muted-foreground">
          {usage.driver_count} driver{usage.driver_count !== 1 ? 's' : ''} · {usage.vehicle_count} vehicle{usage.vehicle_count !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
```

---

### Task 7: Current Plan Card Component

Create `src/components/features/admin/CurrentPlanCard.tsx`:

```typescript
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubscriptionWithPlan } from '@/types/billing';

interface CurrentPlanCardProps {
  subscription: SubscriptionWithPlan | null | undefined;
  isLoading: boolean;
  onManage: () => void;
  isManaging: boolean;
}

export function CurrentPlanCard({
  subscription,
  isLoading,
  onManage,
  isManaging,
}: CurrentPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.plan;
  const isFree = plan?.slug === 'free';
  const price = subscription?.billing_interval === 'annual'
    ? plan?.price_annual_cents
    : plan?.price_monthly_cents;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Current Plan</CardTitle>
        {!isFree && (
          <Button variant="outline" size="sm" onClick={onManage} disabled={isManaging}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Manage
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{plan?.name}</span>
          {subscription?.cancel_at_period_end && (
            <Badge variant="destructive">Canceling</Badge>
          )}
        </div>

        {!isFree && price !== undefined && (
          <p className="text-muted-foreground">
            {formatPrice(price)}/{subscription?.billing_interval === 'annual' ? 'year' : 'month'}
          </p>
        )}

        {subscription?.current_period_end && !isFree && (
          <p className="text-sm text-muted-foreground">
            {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on{' '}
            {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}
          </p>
        )}

        {isFree && (
          <p className="text-sm text-muted-foreground">
            Limited to {plan?.operator_limit} operators
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Task 8: Usage Banner Component

Create `src/components/features/admin/UsageBanner.tsx`:

```typescript
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { OperatorUsage } from '@/types/billing';

interface UsageBannerProps {
  usage: OperatorUsage | undefined;
}

export function UsageBanner({ usage }: UsageBannerProps) {
  const navigate = useNavigate();

  if (!usage) return null;

  // Over limit (after downgrade)
  if (usage.is_over_limit) {
    const overBy = usage.operator_count - (usage.operator_limit ?? 0);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Over plan limit:</strong> You have {overBy} more operator{overBy !== 1 ? 's' : ''} than 
            your plan allows. Remove operators or upgrade to add new ones.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/billing')}
            className="ml-4"
          >
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Warning threshold (80%+)
  if (usage.is_at_warning_threshold && usage.operator_limit) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Approaching limit:</strong> You're using {usage.operator_count} of{' '}
            {usage.operator_limit} operators ({usage.operator_percentage}%).
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/billing')}
            className="ml-4"
          >
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
```

---

### Task 9: Upgrade Modal Component

Create `src/components/features/admin/UpgradeModal.tsx`:

```typescript
import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useBillingPlans, useCreateCheckoutSession } from '@/hooks/useBilling';
import type { BillingPlan } from '@/types/billing';

interface UpgradeModalProps {
  companyId: string;
}

export function UpgradeModal({ companyId }: UpgradeModalProps) {
  const [open, setOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: plans } = useBillingPlans();
  const checkout = useCreateCheckoutSession();

  const paidPlans = (plans ?? []).filter(
    (p) => p.slug !== 'free' && !p.is_contact_sales
  );

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleSelect = (plan: BillingPlan) => {
    const priceId = isAnnual
      ? plan.stripe_price_id_annual
      : plan.stripe_price_id_monthly;

    if (priceId) {
      checkout.mutate({
        companyId,
        priceId,
        interval: isAnnual ? 'annual' : 'monthly',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>View Plans</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </DialogHeader>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 py-4">
          <Label className={cn(!isAnnual && 'font-semibold')}>Monthly</Label>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label className={cn(isAnnual && 'font-semibold')}>
            Annual <span className="text-green-600">(Save 17%)</span>
          </Label>
        </div>

        {/* Plans grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {paidPlans.map((plan) => {
            const price = isAnnual ? plan.price_annual_cents : plan.price_monthly_cents;
            const monthlyEquivalent = isAnnual
              ? Math.round(plan.price_annual_cents / 12)
              : plan.price_monthly_cents;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  plan.slug === 'growth' && 'border-primary ring-2 ring-primary'
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.slug === 'growth' && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Popular
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">
                      {formatPrice(monthlyEquivalent)}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(price)} billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {plan.operator_limit ?? 'Unlimited'} operators
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      All core features
                    </li>
                  </ul>

                  <Button
                    className="w-full"
                    onClick={() => handleSelect(plan)}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending ? 'Redirecting...' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 10: Edge Functions

Create `supabase/functions/create-checkout-session/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { companyId, priceId, interval } = await req.json();

    // Get company subscription
    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('stripe_customer_id, company:companies(name)')
      .eq('company_id', companyId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: subscription?.company?.name,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('company_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('company_id', companyId);
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/admin/billing?success=true`,
      cancel_url: `${appUrl}/admin/billing?canceled=true`,
      metadata: { company_id: companyId },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

Create `supabase/functions/create-portal-session/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { companyId } = await req.json();

    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', companyId)
      .single();

    if (!subscription?.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/admin/billing`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

Create `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Log event
  const eventData = event.data.object as any;
  await supabaseAdmin.from('billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: eventData,
    company_id: eventData.metadata?.company_id,
  });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;

      if (companyId) {
        const priceId = sub.items.data[0]?.price.id;
        const { data: plan } = await supabaseAdmin
          .from('billing_plans')
          .select('id')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
          .single();

        const status = sub.status === 'active' ? 'active' : sub.status;

        await supabaseAdmin
          .from('company_subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            plan_id: plan?.id,
            status,
            billing_interval:
              sub.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq('company_id', companyId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;

      if (companyId) {
        const { data: freePlan } = await supabaseAdmin
          .from('billing_plans')
          .select('id')
          .eq('slug', 'free')
          .single();

        await supabaseAdmin
          .from('company_subscriptions')
          .update({
            plan_id: freePlan?.id,
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            stripe_subscription_id: null,
          })
          .eq('company_id', companyId);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

---

### Task 11: Routes and Navigation

**Update `src/App.tsx`:**

```typescript
import Billing from '@/pages/admin/Billing';

// Add to admin routes:
<Route path="billing" element={<Billing />} />
```

**Update `src/components/layouts/AdminLayout.tsx`:**

```typescript
import { CreditCard } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

// Inside component:
const billingEnabled = useFeatureFlag('billing_enabled');

// Add to nav items (conditionally):
...(billingEnabled ? [
  { path: '/admin/billing', label: 'Billing', icon: CreditCard },
] : []),
```

---

### Task 12: Super Admin Billing Tab

Create `src/components/features/super-admin/CompanyBillingTab.tsx`:

Enable the billing tab in `CompanyDetail.tsx` and show:
- Current plan and status
- Operator usage
- Never-bill toggle
- Operator limit override input
- Admin notes field

---

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/027_billing_system.sql` | Database schema |
| `src/types/billing.ts` | TypeScript types |
| `src/services/billing.ts` | Database operations |
| `src/hooks/useBilling.ts` | React Query hooks |
| `src/pages/admin/Billing.tsx` | Admin billing page |
| `src/components/features/admin/OperatorUsageBar.tsx` | Usage progress bar |
| `src/components/features/admin/CurrentPlanCard.tsx` | Current plan display |
| `src/components/features/admin/UsageBanner.tsx` | Warning/over-limit banners |
| `src/components/features/admin/UpgradeModal.tsx` | Plan selection modal |
| `src/components/features/super-admin/CompanyBillingTab.tsx` | Super Admin billing tab |
| `supabase/functions/create-checkout-session/index.ts` | Stripe Checkout |
| `supabase/functions/create-portal-session/index.ts` | Stripe Portal |
| `supabase/functions/stripe-webhook/index.ts` | Webhook handler |

### Updates

| File | Change |
|------|--------|
| `src/types/index.ts` | Export billing types |
| `src/App.tsx` | Add billing route |
| `src/components/layouts/AdminLayout.tsx` | Add conditional billing nav |
| `src/pages/super-admin/CompanyDetail.tsx` | Enable billing tab |

---

## Environment Variables

```bash
# Supabase Edge Functions (set via supabase secrets set)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://your-app.vercel.app

# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Acceptance Criteria

- [ ] New companies auto-assigned to Free plan
- [ ] `useOperatorUsage()` returns correct counts
- [ ] `checkCanAddOperator()` blocks at limit
- [ ] Admin billing page shows plan and usage
- [ ] Upgrade modal redirects to Stripe Checkout
- [ ] Stripe webhooks sync subscription status
- [ ] Super Admin can override limits and toggle never_bill
- [ ] Usage banner shows at 80% and when over limit
- [ ] Billing nav only shows when `billing_enabled` flag is true

---

## Testing

1. Create company → verify Free plan assigned
2. Add operators to limit → verify blocked with modal
3. Complete Stripe Checkout → verify plan updated
4. Downgrade and verify read-only mode
5. Toggle never_bill → verify limits bypassed
6. Set operator override → verify new limit applies

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Initial CODEX task created | AI |
