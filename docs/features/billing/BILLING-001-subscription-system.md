# BILLING-001: Subscription & Billing System

> **Last Updated:** 2026-01-30  
> **Status:** ✅ APPROVED - Ready for Implementation  
> **Phase:** Billing MVP  
> **Dependencies:** SA-001 Company Management, SA-002 Admin Invitations, FF-001 Feature Flags

---

## User Stories

### Phase 1: Foundation

| # | Role | Story |
|---|------|-------|
| B-001 | System | **As the system**, when a new company is created, I automatically assign them to the Free plan so they can start using the platform immediately. |
| B-002 | System | **As the system**, I store billing plan definitions (name, price, operator limits) so that subscription logic can reference them. |
| B-003 | System | **As the system**, I track each company's subscription status and plan so that access can be controlled accordingly. |

### Phase 2: Usage Checking & Limits

| # | Role | Story |
|---|------|-------|
| B-004 | Admin | **As an Admin**, when I try to add a driver or vehicle that would exceed my operator limit, I see an upgrade modal instead of a form so that I understand why I can't proceed. |
| B-005 | System | **As the system**, I calculate operator usage as (drivers + vehicles) so that billing is simple and fair for all fleet configurations. |
| B-006 | System | **As the system**, I respect `never_bill` flags so that test accounts and internal users bypass all limits. |
| B-007 | System | **As the system**, I respect per-company limit overrides so that enterprise deals with custom terms work correctly. |
| B-008 | Admin | **As an Admin** on the Free plan with 4 operators, I cannot add a 5th driver or vehicle until I upgrade, so that free tier limits are enforced. |

### Phase 3: Admin Billing UI

| # | Role | Story |
|---|------|-------|
| B-009 | Admin | **As an Admin**, I can view my current plan name, price, and billing interval on a dedicated Billing page so that I understand what I'm paying. |
| B-010 | Admin | **As an Admin**, I can see my operator usage as a progress bar showing "X/Y operators (drivers + vehicles)" so that I know how close I am to my limit. |
| B-011 | Admin | **As an Admin**, I can see a breakdown of "X drivers · Y vehicles" below the usage bar so that I understand what counts as an operator. |
| B-012 | Admin | **As an Admin**, I can see my next billing date so that I know when I'll be charged. |
| B-013 | Admin | **As an Admin**, I can view my invoice history with dates, amounts, and download links so that I can manage my records. |
| B-014 | Admin | **As an Admin**, I can click "Manage Plan" to open Stripe Customer Portal where I can update my payment method, so that card info never touches Driverly's servers. |

### Phase 4: Stripe Integration

| # | Role | Story |
|---|------|-------|
| B-015 | Admin | **As an Admin**, I can click "Upgrade" and select a plan, which redirects me to Stripe Checkout to enter payment details, so that I can subscribe without entering card info in Driverly. |
| B-016 | Admin | **As an Admin**, after successful Stripe Checkout, I'm redirected back to the Billing page with a success message and my new plan is active. |
| B-017 | Admin | **As an Admin**, if I cancel Stripe Checkout, I'm returned to the Billing page with my plan unchanged. |
| B-018 | Admin | **As an Admin**, I can downgrade my plan through Stripe Customer Portal, and when I do, I'm moved to the lower plan at the end of my billing period. |
| B-019 | Admin | **As an Admin**, I can cancel my subscription through Stripe Customer Portal, and when I do, I'm downgraded to the Free plan at period end. |
| B-020 | System | **As the system**, I process Stripe webhooks to keep subscription status synchronized so that plan changes are reflected immediately. |
| B-021 | System | **As the system**, I log all billing events (payments, upgrades, cancellations) for audit purposes. |

### Phase 5: Super Admin Dashboard

| # | Role | Story |
|---|------|-------|
| B-022 | Super Admin | **As a Super Admin**, I can view a billing dashboard showing total MRR, subscriber counts by plan, and revenue trends so that I can monitor business health. |
| B-023 | Super Admin | **As a Super Admin**, I can see a list of all companies with their plan, status, operator usage, and next billing date so that I have full visibility. |
| B-024 | Super Admin | **As a Super Admin**, I can filter companies by plan or billing status so that I can focus on specific segments. |
| B-025 | Super Admin | **As a Super Admin**, I can click into a company's Billing tab to see their subscription details, usage, and billing history. |
| B-026 | Super Admin | **As a Super Admin**, I can override a company's operator limit to grant them custom limits for enterprise deals. |
| B-027 | Super Admin | **As a Super Admin**, I can toggle a company's `never_bill` flag so that test accounts and partners get unlimited free access. |
| B-028 | Super Admin | **As a Super Admin**, I can add admin notes to a company's subscription to document special arrangements. |
| B-029 | Super Admin | **As a Super Admin**, I can view all billing events across all companies for troubleshooting and auditing. |

### Phase 6: Upgrade Prompts & UX

| # | Role | Story |
|---|------|-------|
| B-030 | Admin | **As an Admin** at 80%+ of my operator limit, I see a warning banner on my Dashboard encouraging me to upgrade before I hit the limit. |
| B-031 | Admin | **As an Admin** who has downgraded but is over my new plan's limit, I see an "Over Limit" banner explaining I can't add operators until I reduce usage or upgrade. |
| B-032 | Admin | **As an Admin** who is over my limit (after downgrade), I can still view, edit, and delete existing drivers and vehicles, but I cannot add new ones. |
| B-033 | Admin | **As an Admin** who is over my limit, I see clear messaging explaining: "You have X operators but your plan allows Y. Remove operators or upgrade to add more." |
| B-034 | Admin | **As an Admin**, the upgrade modal shows all available plans with their prices and operator limits so that I can make an informed decision. |
| B-035 | Admin | **As an Admin**, I can toggle between monthly and annual pricing in the upgrade modal to see the discount for annual billing. |

### Anti-Abuse Stories

| # | Role | Story |
|---|------|-------|
| B-036 | System | **As the system**, when a company downgrades, I immediately enforce the new lower limit (they can't add, but can manage existing). |
| B-037 | System | **As the system**, I prevent gaming by making limit enforcement immediate upon downgrade, not at period end. |

---

## Overview

Billing enables Driverly to charge transportation companies for platform usage. Companies subscribe to tiered plans with **operator limits** (drivers + vehicles combined). This feature adds billing capabilities to **Super Admin** (platform-wide revenue view, manual controls) and **Admin** (self-service subscription management).

### Key Concept: "Operators"

**Operators = Drivers + Vehicles combined.** This simplifies billing and is fairer for fleets with different driver:vehicle ratios.

Example: A company with 10 drivers and 5 vehicles uses **15 operators**.

---

## Context: What We Discovered in Codebase Audit

### Current Architecture (No Hallucination)

| Component | Location | Pattern |
|-----------|----------|---------|
| **Super Admin Pages** | `src/pages/super-admin/` | `Companies.tsx`, `CompanyDetail.tsx`, `Settings.tsx` |
| **Super Admin Components** | `src/components/features/super-admin/` | 7 components (modals, tabs) |
| **Admin Layout** | `src/components/layouts/AdminLayout.tsx` | Sidebar with nav items, company branding |
| **Admin Dashboard** | `src/pages/admin/Dashboard.tsx` | Shows driver/vehicle counts |
| **Company Types** | `src/types/company.ts` | `Company`, `CompanyWithStats`, `CompanyDetail` |
| **Company Service** | `src/services/companies.ts` | CRUD operations, counts via `getCompanyDetail()` |
| **Companies Table** | `supabase/migrations/001_core_tables.sql` | Core tenant table with RLS |
| **Edge Functions** | `supabase/functions/` | 6 functions (invitations, applications) |
| **Auth Context** | `src/contexts/AuthContext.tsx` | Role detection via `app_metadata` |

### Key Observations

1. **CompanyDetail.tsx already has a disabled "Billing" tab** (line 182-185) - perfect integration point
2. **AdminLayout.tsx** has a Settings menu item - billing could go there or new nav item
3. **`getCompanyDetail()`** already counts drivers/vehicles - we can reuse for usage checks
4. **Edge Functions pattern** established - use for Stripe webhook handler
5. **RLS policies** use `auth.jwt() ->> 'role'` pattern - follow same for billing tables

---

## Finalized Decisions ✅

| Decision | Final Answer |
|----------|--------------|
| Billing Model | **Flat subscription** with **operator limits** (drivers + vehicles combined) |
| Free Tier | **Permanent** (not a trial), conservative limits |
| Enforcement | **Hard block** - modal when trying to exceed limit |
| Upgrade Prompts | Dashboard banner at 80% + modal on action |
| Admin Self-Service | **Full** - upgrade, downgrade, cancel, payment method, invoices |
| Super Admin Powers | View all, override limits, grant credits, never-bill accounts, refunds |
| Checkout Flow | **Free first** → upgrade when ready |
| Stripe Integration | **Stripe Checkout (hosted)** + **Customer Portal** |
| Billing State | **Stripe as source of truth** + Supabase mirror via webhooks |
| Annual Billing | **Both** monthly + annual (17% discount) |
| Plan Management | **Static in code** (public page accuracy > flexibility) |
| Downgrade Behavior | **Read-only mode** + anti-abuse (immediate enforcement) |
| Feature Flags | **Build now** as separate FF-001 project |

---

## Tier Structure (FINAL)

| Tier | Monthly | Annual | Operators* | Target Market | Visibility |
|------|---------|--------|------------|---------------|------------|
| **Free** | $0 | $0 | 4 | Solo operators, testing | Public |
| **Starter** | $59 | $490/yr | 20 | Small fleets getting started | Public |
| **Growth** | $149 | $1,240/yr | 50 | Growing companies | Public |
| **Scale** | $349 | $2,900/yr | Unlimited | Large fleets | Public |
| **Enterprise** | Custom | Custom | Unlimited+ | Custom contracts, SLAs | "Contact Sales" |

**\*Operators = Drivers + Vehicles combined**

**Annual = 17% discount (pay for 10 months, get 12)**

---

## Data Model

### New Tables

```sql
-- Migration: 026_billing_system.sql

-- Billing Plans (seeded, managed in code)
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
  operator_limit INTEGER,                -- NULL = unlimited (drivers + vehicles combined)
  features JSONB DEFAULT '[]',           -- Feature flags included in this plan
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,        -- Show on pricing page (false for Enterprise)
  is_contact_sales BOOLEAN DEFAULT false, -- Show "Contact Sales" instead of price
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Subscriptions (synced from Stripe)
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
  -- Limit override (for enterprise/custom deals)
  operator_limit_override INTEGER,       -- NULL = use plan limit
  -- Super Admin controls
  never_bill BOOLEAN DEFAULT false,      -- Test/internal accounts
  admin_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Snapshots (for historical tracking)
CREATE TABLE subscription_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  driver_count INTEGER NOT NULL DEFAULT 0,
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  admin_count INTEGER NOT NULL DEFAULT 0,
  -- Future usage metrics
  trip_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, snapshot_date)
);

-- Billing Events (audit log)
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,              -- 'subscription_created', 'payment_succeeded', etc.
  stripe_event_id TEXT UNIQUE,           -- Idempotency
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_stripe_customer ON company_subscriptions(stripe_customer_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX idx_billing_events_company ON billing_events(company_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_usage_snapshots_company_date ON subscription_usage_snapshots(company_id, snapshot_date);
```

### RLS Policies

```sql
-- billing_plans: Everyone can read active public plans
CREATE POLICY "Anyone can read active public plans"
  ON billing_plans FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Super admins manage all plans"
  ON billing_plans FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- company_subscriptions: Super admin sees all, admin sees own
CREATE POLICY "Super admins can manage all subscriptions"
  ON company_subscriptions FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins can view own subscription"
  ON company_subscriptions FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- billing_events: Super admin only
CREATE POLICY "Super admins can view all billing events"
  ON billing_events FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- usage_snapshots: Super admin all, admin own
CREATE POLICY "Super admins view all usage"
  ON subscription_usage_snapshots FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Admins view own usage"
  ON subscription_usage_snapshots FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

### Type Definitions

```typescript
// src/types/billing.ts

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
  operator_limit: number | null;  // null = unlimited (drivers + vehicles combined)
  features: string[];
  display_order: number;
  is_active: boolean;
  is_public: boolean;
  is_contact_sales: boolean;
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
  operator_limit_override: number | null;  // NULL = use plan limit
  never_bill: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
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
  entity: 'operator';  // Single entity type now
  current: number;
  limit: number | null;
  message?: string;
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Files to Create:**

| File | Purpose |
|------|---------|
| `supabase/migrations/026_billing_system.sql` | Database schema |
| `src/types/billing.ts` | TypeScript types |
| `src/services/billing.ts` | Supabase queries |
| `src/hooks/useBilling.ts` | React Query hooks |
| `src/lib/query-keys.ts` | Add billing keys (update existing) |

**Seed Data (in migration):**

```sql
-- Seed default plans (operators = drivers + vehicles combined)
INSERT INTO billing_plans (name, slug, price_monthly_cents, price_annual_cents, operator_limit, display_order, is_contact_sales) VALUES
('Free', 'free', 0, 0, 4, 0, false),
('Starter', 'starter', 5900, 49000, 20, 1, false),
('Growth', 'growth', 14900, 124000, 50, 2, false),
('Scale', 'scale', 34900, 290000, NULL, 3, false),
('Enterprise', 'enterprise', 0, 0, NULL, 4, true);
```

**Auto-create subscription for new companies:**

```sql
-- Trigger: Auto-assign free plan when company created
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
```

---

### Phase 2: Usage Checking & Limits (Week 2)

**Key Function: Check if adding an operator is allowed**

```typescript
// src/services/billing.ts

export async function getOperatorUsage(companyId: string): Promise<SubscriptionUsage> {
  // Get subscription with plan
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*)')
    .eq('company_id', companyId)
    .single();

  // Get current counts
  const { count: driverCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  const operatorCount = (driverCount ?? 0) + (vehicleCount ?? 0);
  const limit = subscription?.operator_limit_override ?? subscription?.plan?.operator_limit;
  const percentage = limit ? Math.round((operatorCount / limit) * 100) : 0;

  return {
    driver_count: driverCount ?? 0,
    vehicle_count: vehicleCount ?? 0,
    operator_count: operatorCount,
    operator_limit: limit,
    operator_percentage: percentage,
    is_over_limit: limit !== null && operatorCount >= limit,
    is_at_warning_threshold: limit !== null && percentage >= 80,
  };
}

export async function checkCanAddOperator(companyId: string): Promise<UsageCheckResult> {
  // Get subscription with plan
  const { data: subscription } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*)')
    .eq('company_id', companyId)
    .single();

  if (!subscription) {
    return { allowed: false, entity: 'operator', current: 0, limit: 0, message: 'No subscription found' };
  }

  // Never-bill accounts bypass limits
  if (subscription.never_bill) {
    return { allowed: true, entity: 'operator', current: 0, limit: null };
  }

  // Get operator count (drivers + vehicles)
  const usage = await getOperatorUsage(companyId);
  const limit = subscription.operator_limit_override ?? subscription.plan?.operator_limit;

  // Unlimited
  if (limit === null) {
    return { allowed: true, entity: 'operator', current: usage.operator_count, limit };
  }

  const allowed = usage.operator_count < limit;
  return {
    allowed,
    entity: 'operator',
    current: usage.operator_count,
    limit,
    message: allowed ? undefined : `You've reached your operator limit (${usage.operator_count}/${limit}). Upgrade to add more drivers or vehicles.`,
  };
}
```

**Integration Point: CreateVehicleModal.tsx & CreateDriverModal (future)**

```typescript
// In handleSubmit, BEFORE createVehicle.mutateAsync:
const usageCheck = await checkCanAddOperator(companyId);
if (!usageCheck.allowed) {
  setShowUpgradeModal(true);
  setUpgradeMessage(usageCheck.message);
  return;
}
```

---

### Phase 3: Admin Billing UI (Week 2-3)

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/admin/Billing.tsx` | Billing page |
| `src/components/features/admin/SubscriptionCard.tsx` | Current plan display |
| `src/components/features/admin/OperatorUsageBar.tsx` | Operators usage progress |
| `src/components/features/admin/UpgradeModal.tsx` | Plan selection + Stripe redirect |
| `src/components/features/admin/BillingHistory.tsx` | Invoice list (from Stripe) |

**Route Addition (App.tsx):**

```typescript
// Add to admin routes:
<Route path="billing" element={<Billing />} />
```

**AdminLayout.tsx - Add Nav Item:**

```typescript
// Add to navItems array:
{ path: '/admin/billing', label: 'Billing', icon: CreditCard },
```

**UI Wireframe: Admin Billing Page**

```
┌─────────────────────────────────────────────────────────────────┐
│  Billing                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Current Plan                                               │ │
│  │                                                            │ │
│  │  [Starter]  $59/month                    [Manage Plan →]   │ │
│  │                                                            │ │
│  │  Next billing: Feb 24, 2026                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Operators (Drivers + Vehicles)                             │ │
│  │ █████████████████░░░░░░░░ 12/15                            │ │
│  │ 80%                                                        │ │
│  │                                                            │ │
│  │ Breakdown: 8 drivers · 4 vehicles                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⚠️ Approaching limit! [Upgrade Now]                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Billing History                                            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Jan 24, 2026  |  $59.00  |  Paid  |  [Download]            │ │
│  │ Dec 24, 2025  |  $59.00  |  Paid  |  [Download]            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Stripe Integration (Week 3)

**Edge Functions to Create:**

| Function | Purpose |
|----------|---------|
| `supabase/functions/create-checkout-session/index.ts` | Redirect to Stripe Checkout |
| `supabase/functions/create-portal-session/index.ts` | Redirect to Customer Portal |
| `supabase/functions/stripe-webhook/index.ts` | Handle Stripe events |

**create-checkout-session/index.ts:**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-12-18.acacia',
  });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { priceId, companyId, interval } = await req.json();

    // Get company and subscription
    const { data: subscription } = await supabaseAdmin
      .from('company_subscriptions')
      .select('stripe_customer_id, company:companies(name, email)')
      .eq('company_id', companyId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: subscription?.company?.email,
        name: subscription?.company?.name,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;

      // Save customer ID
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

**stripe-webhook/index.ts:**

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
  await supabaseAdmin.from('billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object,
    company_id: (event.data.object as any).metadata?.company_id,
  });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = sub.metadata?.company_id;
      
      if (companyId) {
        // Find plan by price ID
        const priceId = sub.items.data[0]?.price.id;
        const { data: plan } = await supabaseAdmin
          .from('billing_plans')
          .select('id')
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
          .single();

        await supabaseAdmin
          .from('company_subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            plan_id: plan?.id,
            status: sub.status === 'active' ? 'active' : sub.status,
            billing_interval: sub.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
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
        // Downgrade to free plan
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

### Phase 5: Super Admin Dashboard (Week 4)

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/super-admin/Billing.tsx` | Revenue dashboard |
| `src/components/features/super-admin/RevenueStats.tsx` | MRR, subscriber counts |
| `src/components/features/super-admin/CompanyBillingTable.tsx` | All companies' billing status |
| `src/components/features/super-admin/OverrideLimitsModal.tsx` | Manual limit overrides |
| `src/components/features/super-admin/NeverBillToggle.tsx` | Mark as test account |

**CompanyDetail.tsx - Enable Billing Tab:**

```typescript
// Change line 182-185 from:
<TabsTrigger value="billing" disabled>
  Billing
</TabsTrigger>

// To:
<TabsTrigger value="billing">Billing</TabsTrigger>

// And add TabsContent:
<TabsContent value="billing">
  <CompanyBillingTab companyId={company.id} />
</TabsContent>
```

**Route Addition:**

```typescript
// Add to super-admin routes in App.tsx:
<Route path="billing" element={<SuperAdminBilling />} />
```

---

### Phase 6: Upgrade Prompts & UX (Week 4-5)

**Dashboard Banner Component:**

```typescript
// src/components/features/admin/OperatorUsageBanner.tsx
export function OperatorUsageBanner() {
  const { data: usage } = useOperatorUsage();
  const navigate = useNavigate();
  
  if (!usage?.is_at_warning_threshold) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-medium">Approaching operator limit</p>
            <p className="text-sm text-muted-foreground">
              You're using {usage.operator_count} of {usage.operator_limit} operators 
              ({usage.operator_percentage}%).
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/billing')}>
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}
```

**Over-limit Banner (for downgrades):**

```typescript
// src/components/features/admin/OverLimitBanner.tsx
export function OverLimitBanner() {
  const { data: usage } = useOperatorUsage();
  const navigate = useNavigate();
  
  if (!usage?.is_over_limit) return null;

  const overBy = usage.operator_count - (usage.operator_limit ?? 0);

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Over plan limit</p>
            <p className="text-sm text-muted-foreground">
              You have {overBy} more operators than your plan allows. 
              Remove operators or upgrade to add new ones.
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/billing')}>
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}
```

**Add to AdminDashboard.tsx:**

```typescript
// At top of return, after the header:
<UsageBanner />
```

---

## Feature Flags

```typescript
// src/lib/feature-flags.ts
export const BILLING_FLAGS = {
  // Enables all billing features
  BILLING_ENABLED: true,
  
  // Shows upgrade prompts when near limits
  SHOW_UPGRADE_PROMPTS: true,
  
  // Enforces hard limits (blocks adding over limit)
  ENFORCE_LIMITS: true,
  
  // Super Admin billing dashboard
  SUPER_ADMIN_BILLING: true,
  
  // Self-service plan changes
  SELF_SERVICE_BILLING: true,
} as const;
```

---

## Acceptance Criteria

### AC-1: Database & Foundation

- [ ] Migration creates all billing tables with correct constraints
- [ ] RLS policies correctly restrict access by role
- [ ] New companies auto-assigned to Free plan via trigger
- [ ] Types exported from `src/types/index.ts`
- [ ] Seed data includes all 5 plans (Free, Starter, Growth, Scale, Enterprise)

### AC-2: Operator Usage Checking

- [ ] `getOperatorUsage()` returns combined driver + vehicle count
- [ ] `checkCanAddOperator()` correctly returns allowed/blocked status
- [ ] Limits respect plan defaults and overrides
- [ ] `never_bill` accounts bypass all limits
- [ ] CreateVehicleModal shows upgrade prompt when operator limit reached
- [ ] Driver application approval checks operator limit (future)

### AC-3: Admin Billing Page

- [ ] Shows current plan name and price
- [ ] Shows next billing date
- [ ] Operator usage bar shows combined driver/vehicle count
- [ ] Breakdown shows "X drivers · Y vehicles"
- [ ] Warning banner at 80%+
- [ ] Over-limit banner when downgraded and over limit
- [ ] "Manage Plan" opens Stripe Customer Portal
- [ ] Invoice history shows past payments with download links

### AC-3.1: Anti-Abuse (Downgrade Protection)

- [ ] When downgraded and over limit, user enters "read-only mode"
- [ ] Read-only mode: Can view/edit/delete operators, cannot add new
- [ ] Banner explains situation and shows upgrade CTA
- [ ] CreateVehicle/CreateDriver blocked with clear message

### AC-4: Stripe Integration

- [ ] Checkout session created correctly with company metadata
- [ ] Webhook handler processes subscription events
- [ ] Subscription status synced to `company_subscriptions`
- [ ] Customer Portal works for payment method updates
- [ ] Cancellation correctly downgrades to Free plan

### AC-5: Super Admin

- [ ] Billing dashboard shows MRR and subscriber counts
- [ ] Can view any company's subscription
- [ ] Can override limits for specific companies
- [ ] Can mark company as `never_bill`
- [ ] Can view all billing events/audit log

### AC-6: Upgrade Prompts

- [ ] Dashboard banner shows when at 80%+ usage
- [ ] Modal appears when trying to exceed limit
- [ ] Banner links to billing page
- [ ] Modal offers upgrade or shows limit message

---

## Environment Variables

```bash
# .env.local (frontend - exposed)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase Edge Functions secrets (set via CLI)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/billing.test.ts
describe('Billing System', () => {
  describe('checkUsageLimit', () => {
    it('allows when under limit');
    it('blocks when at limit');
    it('allows unlimited plans');
    it('respects overrides over plan limits');
    it('bypasses limits for never_bill accounts');
  });
});
```

### E2E Tests

```typescript
// tests/e2e/billing.spec.ts
test('admin can view billing page', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/billing');
  await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
});

test('upgrade prompt appears at limit', async ({ page }) => {
  // Setup: Company at vehicle limit
  await loginAsAdmin(page);
  await page.goto('/admin/vehicles');
  await page.click('[data-testid="add-vehicle"]');
  await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
});
```

---

## Out of Scope (Future)

- Proration for mid-cycle upgrades (Stripe handles automatically)
- Usage-based billing (per trip)
- Multi-currency support
- Dunning/failed payment retry flows (Stripe handles)
- Custom enterprise contracts (manual process)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Added 37 user stories organized by phase | AI |
| 2026-01-24 | Initial spec from codebase audit | AI |
