# CODEX-033: BILLING-001 Remaining Items

> **Created:** 2026-01-30  
> **Status:** Ready for Implementation  
> **Priority:** High (P0/P1 items block launch)  
> **Depends On:** BILLING-001 (Mostly Complete)

---

## Overview

Complete the remaining items for the BILLING-001 Subscription System. The core infrastructure is built; these tasks add missing limit enforcement, UI improvements, and Stripe configuration.

---

## Task Summary

| Priority | Task | Description | Effort |
|----------|------|-------------|--------|
| **P0** | 1 | Driver limit enforcement | 30 min |
| **P0** | 2 | Dashboard usage banner | 15 min |
| **P0** | 3 | Enable billing feature flag | 5 min |
| **P1** | 4 | Stripe configuration guide | 30 min |
| **P2** | 5 | Super Admin billing dashboard | 2-3 hours |
| **P2** | 6 | Invoice history display | 1 hour |

---

## Task 1: Driver Limit Enforcement (P0)

**Problem:** Vehicle creation checks `checkCanAddOperator()` before allowing creation, but driver creation/approval does NOT check limits.

**User Story:** B-004 - When I try to add a driver exceeding my limit, show an upgrade modal.

### Files to Update

1. **Driver Approval Flow** - `src/pages/admin/DriverDetail.tsx`
2. **Driver Application Approval** - Check where driver status changes to "approved"

### Implementation

Find the driver approval action and add limit check:

```typescript
// In the approve driver handler (wherever driver status is set to 'active' or 'approved')
import { checkCanAddOperator } from '@/services/billing';
import { UpgradeModal } from '@/components/features/admin/UpgradeModal';

// Before approving:
const usageCheck = await checkCanAddOperator(companyId);
if (!usageCheck.allowed) {
  // Show upgrade modal instead of approving
  setShowUpgradeModal(true);
  toast({
    title: 'Upgrade required',
    description: usageCheck.message,
    variant: 'destructive',
  });
  return;
}
// Proceed with approval...
```

### Reference

See how `CreateVehicleModal.tsx` implements this:

```typescript:119:135:src/components/features/admin/CreateVehicleModal.tsx
const handleSubmit = async () => {
  if (!canSubmit) return;
  const companyId = profile?.company_id;
  if (companyId) {
    const usageCheck = await checkCanAddOperator(companyId);
    if (!usageCheck.allowed) {
      setShowUpgradeModal(true);
      toast({
        title: 'Upgrade required',
        description: usageCheck.message,
        variant: 'destructive',
      });
      return;
    }
    // ... proceed with creation
  }
};
```

### Acceptance Criteria

- [ ] When approving a driver that would exceed limit, upgrade modal shows
- [ ] Approval is blocked until company upgrades or removes operators
- [ ] "Never-bill" companies bypass this check
- [ ] Companies with unlimited plans bypass this check

---

## Task 2: Dashboard Usage Banner (P0)

**Problem:** The usage warning banner only shows on `/admin/billing` page, not on the main Dashboard.

**User Story:** B-030 - At 80%+ usage, see warning banner on Dashboard.

### File to Update

`src/pages/admin/Dashboard.tsx`

### Implementation

```typescript
// Add imports
import { useOperatorUsage } from '@/hooks/useBilling';
import { UsageBanner } from '@/components/features/admin/UsageBanner';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

// Inside component
const { data: usage } = useOperatorUsage();
const billingEnabled = useFeatureFlag('billing_enabled');

// In JSX, after PageHeader and before main content
{billingEnabled && <UsageBanner usage={usage} />}
```

### Acceptance Criteria

- [ ] Warning banner appears on Dashboard when at 80%+ usage
- [ ] Over-limit banner appears on Dashboard when over limit
- [ ] Banner only shows when `billing_enabled` feature flag is true
- [ ] Banner has "Upgrade" button linking to `/admin/billing`

---

## Task 3: Enable Billing Feature Flag (P0)

**Problem:** The `billing_enabled` flag is `default_enabled = false`, so billing nav is hidden.

### Option A: Enable Globally (Recommended for Launch)

Run SQL in Supabase:

```sql
UPDATE feature_flags 
SET default_enabled = true 
WHERE key = 'billing_enabled';
```

### Option B: Enable Per-Company (For Gradual Rollout)

Use Super Admin UI:
1. Go to `/super-admin/feature-flags`
2. Find "Billing System" in the billing category
3. Toggle it ON

Or create per-company overrides:
1. Go to `/super-admin/companies/{id}`
2. Click "Features" tab
3. Override `billing_enabled` to ON for specific companies

### Acceptance Criteria

- [ ] Billing nav item appears in Admin sidebar
- [ ] `/admin/billing` page is accessible
- [ ] UsageBanner appears when applicable

---

## Task 4: Stripe Configuration Guide (P1)

**Problem:** Stripe Price IDs are not configured in the database.

### Step 1: Create Products in Stripe Dashboard

Go to Stripe Dashboard > Products and create:

| Product | Monthly Price | Annual Price |
|---------|---------------|--------------|
| Starter | $59 | $490 |
| Growth | $149 | $1,240 |
| Scale | $349 | $2,900 |

For each product:
1. Click "Add Product"
2. Enter name (e.g., "Driverly Starter")
3. Add monthly price (recurring)
4. Add annual price (recurring)
5. Copy the Price IDs (e.g., `price_1ABC...`)

### Step 2: Update Database

```sql
UPDATE billing_plans SET
  stripe_product_id = 'prod_STARTER_ID',
  stripe_price_id_monthly = 'price_STARTER_MONTHLY',
  stripe_price_id_annual = 'price_STARTER_ANNUAL'
WHERE slug = 'starter';

UPDATE billing_plans SET
  stripe_product_id = 'prod_GROWTH_ID',
  stripe_price_id_monthly = 'price_GROWTH_MONTHLY',
  stripe_price_id_annual = 'price_GROWTH_ANNUAL'
WHERE slug = 'growth';

UPDATE billing_plans SET
  stripe_product_id = 'prod_SCALE_ID',
  stripe_price_id_monthly = 'price_SCALE_MONTHLY',
  stripe_price_id_annual = 'price_SCALE_ANNUAL'
WHERE slug = 'scale';
```

### Step 3: Set Environment Variables in Supabase

Go to Supabase Dashboard > Edge Functions > Secrets:

```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://yourdomain.com
```

### Step 4: Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Step 5: Configure Stripe Customer Portal

1. Go to Stripe Dashboard > Settings > Billing > Customer Portal
2. Enable features:
   - Switch plans
   - Cancel subscriptions
   - Update payment methods
   - View invoices

### Acceptance Criteria

- [ ] All 3 paid plans have Stripe Price IDs in database
- [ ] Environment variables are set in Supabase
- [ ] Webhook endpoint is configured and receiving events
- [ ] Customer Portal is enabled

---

## Task 5: Super Admin Billing Dashboard (P2)

**Problem:** No dedicated page for Super Admin to see aggregate billing metrics.

**User Stories:** B-022 to B-024

### Create New Page

Create `src/pages/super-admin/Billing.tsx`:

```typescript
import { useMemo } from 'react';
import { DollarSign, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderIcon,
  PageHeaderLeft,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { useBillingStats, useAllSubscriptions } from '@/hooks/useBilling';
import { OperatorUsageBar } from '@/components/features/admin/OperatorUsageBar';

export default function SuperAdminBilling() {
  const { data: stats, isLoading: statsLoading } = useBillingStats();
  const { data: subscriptions, isLoading: subsLoading } = useAllSubscriptions();

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderLeft>
            <PageHeaderIcon>
              <DollarSign className="h-6 w-6 text-white" />
            </PageHeaderIcon>
            <PageHeaderTitle
              title="Billing Overview"
              description="Revenue metrics and subscription management"
            />
          </PageHeaderLeft>
        </PageHeaderContent>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatCurrency(stats?.total_mrr_cents ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_companies ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.subscriber_counts.starter ?? 0) +
                (stats?.subscriber_counts.growth ?? 0) +
                (stats?.subscriber_counts.scale ?? 0) +
                (stats?.subscriber_counts.enterprise ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Free Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subscriber_counts.free ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscribers by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats?.subscriber_counts ?? {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {plan}
                </Badge>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Operators</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {(sub as any).company?.name ?? sub.company_id}
                  </TableCell>
                  <TableCell>{sub.plan?.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.status === 'active'
                          ? 'default'
                          : sub.status === 'never_bill'
                          ? 'outline'
                          : 'secondary'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sub.billing_interval}</TableCell>
                  <TableCell>
                    {sub.operator_limit_override ?? sub.plan?.operator_limit ?? '∞'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Add Route and Navigation

In `src/App.tsx`:

```typescript
import SuperAdminBilling from '@/pages/super-admin/Billing';

// Add route inside super-admin routes
<Route path="billing" element={<SuperAdminBilling />} />
```

In `src/components/layouts/SuperAdminLayout.tsx`:

```typescript
// Add to navItems
{ path: '/super-admin/billing', label: 'Billing', icon: DollarSign },
```

### Acceptance Criteria

- [ ] MRR displayed correctly
- [ ] Subscriber counts by plan shown
- [ ] Company list with plan, status, operators
- [ ] Link in Super Admin navigation

---

## Task 6: Invoice History Display (P2)

**Problem:** Admins can't see invoice history in the app (must go to Stripe Portal).

**User Story:** B-013 - View invoice history with download links.

### Implementation Notes

This requires fetching invoice data from Stripe via an Edge Function:

1. Create `supabase/functions/get-invoices/index.ts`
2. Fetch invoices using `stripe.invoices.list({ customer: customerId })`
3. Display in a table on the Billing page

### Edge Function

```typescript
// supabase/functions/get-invoices/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { corsHeaders } from '../_shared/cors.ts';

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
      return new Response(
        JSON.stringify({ invoices: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    });

    const formatted = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      status: inv.status,
      created: inv.created,
      pdf_url: inv.invoice_pdf,
    }));

    return new Response(
      JSON.stringify({ invoices: formatted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Acceptance Criteria

- [ ] Invoice list shows on Billing page (for paid plans)
- [ ] Each invoice shows date, amount, status
- [ ] Download PDF link works

---

## Files Summary

| Task | Files to Create/Update |
|------|------------------------|
| 1 | `src/pages/admin/DriverDetail.tsx` (update) |
| 2 | `src/pages/admin/Dashboard.tsx` (update) |
| 3 | SQL or Super Admin UI |
| 4 | Stripe Dashboard + SQL |
| 5 | `src/pages/super-admin/Billing.tsx` (create), `App.tsx`, `SuperAdminLayout.tsx` |
| 6 | `supabase/functions/get-invoices/index.ts` (create), update Billing page |

---

## Testing Checklist

### P0 Tests
- [ ] Create driver that would exceed limit → Upgrade modal appears
- [ ] Dashboard shows warning banner at 80%+ usage
- [ ] Dashboard shows over-limit banner when over limit
- [ ] Billing nav appears when flag is enabled

### P1 Tests
- [ ] Upgrade button redirects to Stripe Checkout
- [ ] Successful checkout updates subscription in DB
- [ ] Webhook processes subscription events correctly
- [ ] Customer Portal opens for paid subscribers

### P2 Tests
- [ ] Super Admin billing page loads with correct stats
- [ ] MRR calculation is accurate
- [ ] Invoice list displays for paid companies

---

## Notes

1. **Test in Stripe Test Mode first** - Use `sk_test_` keys until ready for production
2. **Webhook signature verification** - Critical for security, already implemented
3. **Annual billing MRR** - The stats calculation divides annual by 12 for MRR
4. **Never-bill accounts** - Bypass all limits and don't count toward paid subscribers
