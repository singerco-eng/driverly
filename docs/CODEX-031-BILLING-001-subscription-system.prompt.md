# CODEX-031: BILLING-001 Subscription System - Implementation Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

You are implementing the **Billing & Subscription System** for Driverly, a multi-tenant SaaS platform for NEMT (Non-Emergency Medical Transportation) companies.

### What You're Building

A billing system where transportation companies subscribe to tiered plans:

| Tier | Monthly | Operators (Drivers + Vehicles) |
|------|---------|-------------------------------|
| Free | $0 | 4 |
| Starter | $59 | 20 |
| Growth | $149 | 50 |
| Scale | $349 | Unlimited |
| Enterprise | Custom | Unlimited+ |

**Key Concept:** "Operators" = Drivers + Vehicles combined.

### How It Works

1. **New companies** auto-start on Free plan
2. **Admin** can upgrade via Stripe Checkout
3. **Admin** manages subscription via Stripe Customer Portal
4. **System** enforces operator limits (hard block at limit)
5. **Super Admin** can override limits, mark accounts as `never_bill`

---

## Prerequisites

- ✅ FF-001 Feature Flags is complete (use `useFeatureFlag()` hook)
- Stripe account with Products/Prices created
- Supabase Edge Functions deployable

---

## Required Reading (In Order)

### 1. Architecture & Existing Patterns

```
docs/01-ARCHITECTURE.md          # Tech stack, data flow
docs/03-AUTHENTICATION.md        # Auth, roles, JWT claims
docs/04-FRONTEND-GUIDELINES.md   # Design system, components
```

### 2. Feature Flags (Just Implemented - Follow This Pattern)

```
src/types/featureFlags.ts        # Type definitions pattern
src/services/featureFlags.ts     # Service layer pattern
src/hooks/useFeatureFlags.ts     # React Query hooks pattern
src/pages/super-admin/FeatureFlags.tsx  # Page component pattern
```

### 3. Admin Patterns to Follow

```
src/pages/admin/Dashboard.tsx    # Admin page layout
src/components/layouts/AdminLayout.tsx  # Admin navigation
src/pages/admin/Drivers.tsx      # List page pattern
src/pages/admin/DriverDetail.tsx # Detail page pattern
```

### 4. Super Admin Patterns (for billing tab)

```
src/pages/super-admin/CompanyDetail.tsx  # Tabs pattern
src/components/features/super-admin/CompanyFeaturesTab.tsx  # Tab component
```

### 5. Existing Edge Functions

```
supabase/functions/send-invitation/index.ts  # Edge Function pattern
supabase/functions/_shared/cors.ts           # CORS headers
```

### 6. The Implementation Spec

```
docs/CODEX-031-BILLING-001-subscription-system.md   # Full implementation spec
docs/features/billing/BILLING-001-subscription-system.md  # Feature specification
```

---

## Key Patterns to Follow

### RLS Policy Pattern (Same as Feature Flags)

```sql
-- Super Admin
(auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'

-- Company-scoped
company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
```

### Service Layer Pattern

```typescript
// src/services/billing.ts
import { supabase } from '@/integrations/supabase/client';

export async function getCompanySubscription(companyId: string) {
  const { data, error } = await supabase
    .from('company_subscriptions')
    .select('*, plan:billing_plans(*)')
    .eq('company_id', companyId)
    .single();

  if (error) return null;
  return data;
}
```

### React Query Hook Pattern

```typescript
// src/hooks/useBilling.ts
export const billingKeys = {
  all: ['billing'] as const,
  subscription: (companyId: string) => [...billingKeys.all, 'subscription', companyId] as const,
};

export function useSubscription(companyId?: string) {
  return useQuery({
    queryKey: billingKeys.subscription(companyId ?? ''),
    queryFn: () => getCompanySubscription(companyId!),
    enabled: !!companyId,
  });
}
```

### Feature Flag Integration

```typescript
// Conditionally show billing nav
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

const billingEnabled = useFeatureFlag('billing_enabled');

// In nav items:
...(billingEnabled ? [
  { path: '/admin/billing', label: 'Billing', icon: CreditCard },
] : []),
```

### Edge Function Pattern

```typescript
// supabase/functions/create-checkout-session/index.ts
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
  // ... implementation
});
```

---

## Implementation Order

Execute tasks in this order:

1. **Task 1: Migration** - Database tables, RLS, seed data
2. **Task 2: Types** - TypeScript interfaces
3. **Task 3: Service** - Database operations
4. **Task 4: Hooks** - React Query wrappers
5. **Task 5-9: UI Components** - Admin billing page and components
6. **Task 10: Edge Functions** - Stripe Checkout/Portal/Webhooks
7. **Task 11: Routes** - Wire up navigation
8. **Task 12: Super Admin** - CompanyBillingTab

---

## Stripe Setup Required

Before testing, ensure Stripe has:

1. **Products** created for each plan (Starter, Growth, Scale)
2. **Prices** created for monthly and annual billing
3. **Price IDs** added to the `billing_plans` table
4. **Webhook endpoint** configured pointing to your Edge Function
5. **Secrets** set in Supabase: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`

---

## Testing Checklist

1. Create new company → should have Free plan subscription
2. View `/admin/billing` → should show current plan and usage
3. Add operators to limit → should show upgrade modal
4. Click upgrade → should redirect to Stripe Checkout
5. Complete checkout → should return with new plan active
6. Super Admin can toggle `never_bill` → limits bypassed
7. Super Admin can set operator override → new limit applies

---

## Quick Reference: Files to Study

| Pattern | Reference File |
|---------|----------------|
| Types | `src/types/featureFlags.ts` |
| Service | `src/services/featureFlags.ts` |
| Hooks | `src/hooks/useFeatureFlags.ts` |
| Admin page | `src/pages/admin/Dashboard.tsx` |
| Super Admin tab | `src/components/features/super-admin/CompanyFeaturesTab.tsx` |
| Edge Function | `supabase/functions/send-invitation/index.ts` |
| RLS patterns | `supabase/migrations/026_feature_flags.sql` |

---

## Component Structure

```
src/components/features/admin/
├── OperatorUsageBar.tsx      # Progress bar with colors
├── CurrentPlanCard.tsx       # Plan display with manage button
├── UsageBanner.tsx           # Warning/over-limit alerts
├── UpgradeModal.tsx          # Plan selection with Stripe redirect
└── ... existing components

src/components/features/super-admin/
├── CompanyBillingTab.tsx     # NEW: Billing tab for CompanyDetail
└── ... existing components
```

---

## Important Notes

1. **Never store card data** - All payment goes through Stripe Checkout/Portal
2. **Use feature flags** - Billing nav only shows when `billing_enabled` is true
3. **Operators = Drivers + Vehicles** - Combined count, not separate limits
4. **Immediate enforcement** - When over limit, block adds (not edits/deletes)
5. **Test with Stripe test mode** - Use `sk_test_` and `pk_test_` keys

---

## Start Here

1. Read the full implementation spec: `docs/CODEX-031-BILLING-001-subscription-system.md`
2. Study the Feature Flags implementation you just built
3. Begin with Task 1 (migration) and work through sequentially
4. Test each phase before moving to the next

Good luck! 🚀
