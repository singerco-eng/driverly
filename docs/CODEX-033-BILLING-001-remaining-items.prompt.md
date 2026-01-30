# CODEX-033: BILLING-001 Remaining Items - Implementation Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

You are completing the **Billing System** for Driverly. The core infrastructure is already built (database, types, services, hooks, UI components). This task adds missing limit enforcement and UI improvements.

### What's Already Built

| Component | Status |
|-----------|--------|
| Database migration (027_billing_system.sql) | ✅ Complete |
| Types (`src/types/billing.ts`) | ✅ Complete |
| Service layer (`src/services/billing.ts`) | ✅ Complete |
| React hooks (`src/hooks/useBilling.ts`) | ✅ Complete |
| Admin Billing page | ✅ Complete |
| OperatorUsageBar, CurrentPlanCard, UsageBanner, UpgradeModal | ✅ Complete |
| Edge Functions (checkout, portal, webhook) | ✅ Complete |
| Super Admin CompanyBillingTab | ✅ Complete |

### What's Missing (Your Tasks)

| Priority | Task | Issue |
|----------|------|-------|
| **P0** | Driver limit enforcement | Only vehicles check limits, not drivers |
| **P0** | Dashboard usage banner | Banner only on Billing page, not Dashboard |
| **P0** | Enable feature flag | `billing_enabled` is off by default |
| **P2** | Super Admin billing dashboard | No aggregate MRR/stats view |

---

## Required Reading (In Order)

### 1. Implementation Spec

```
docs/CODEX-033-BILLING-001-remaining-items.md   # Full task spec
```

### 2. Reference Files (Already Implemented)

```
src/services/billing.ts                          # checkCanAddOperator function
src/components/features/admin/CreateVehicleModal.tsx  # How vehicle creation checks limits
src/components/features/admin/UsageBanner.tsx    # Banner component to reuse
src/hooks/useBilling.ts                          # useOperatorUsage hook
```

### 3. Files to Update

```
src/pages/admin/DriverDetail.tsx    # Add limit check to driver approval
src/pages/admin/Dashboard.tsx       # Add UsageBanner
```

---

## Task 1: Driver Limit Enforcement (P0)

**Problem:** When an admin approves a driver that would exceed the operator limit, the approval goes through anyway.

### Find the Approval Code

Look in `src/pages/admin/DriverDetail.tsx` for where driver status changes to 'active' or 'approved'. Find the handler function.

### Add Limit Check

Add imports at the top:

```typescript
import { checkCanAddOperator } from '@/services/billing';
import { UpgradeModal } from '@/components/features/admin/UpgradeModal';
```

Add state for upgrade modal:

```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

Before approving the driver, check limits:

```typescript
// In the approve handler, before updating status
const usageCheck = await checkCanAddOperator(companyId);
if (!usageCheck.allowed) {
  setShowUpgradeModal(true);
  toast({
    title: 'Upgrade required',
    description: usageCheck.message,
    variant: 'destructive',
  });
  return; // Don't proceed with approval
}
// ... proceed with approval
```

Add the modal to the JSX:

```typescript
{showUpgradeModal && (
  <UpgradeModal
    companyId={profile?.company_id ?? ''}
    open={showUpgradeModal}
    onOpenChange={setShowUpgradeModal}
    showTrigger={false}
  />
)}
```

### Reference: How CreateVehicleModal Does It

```typescript
// From CreateVehicleModal.tsx
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

---

## Task 2: Dashboard Usage Banner (P0)

**Problem:** The warning/over-limit banner only shows on `/admin/billing`, not on the main Dashboard.

### Update Dashboard.tsx

Add imports:

```typescript
import { useOperatorUsage } from '@/hooks/useBilling';
import { UsageBanner } from '@/components/features/admin/UsageBanner';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
```

In the component, add hooks:

```typescript
const { data: usage } = useOperatorUsage();
const billingEnabled = useFeatureFlag('billing_enabled');
```

In the JSX, after PageHeader but before main content:

```typescript
{billingEnabled && <UsageBanner usage={usage} />}
```

This ensures:
- Banner only shows when billing feature is enabled
- Shows warning at 80%+ usage
- Shows error banner when over limit

---

## Task 3: Enable Feature Flag (P0)

### Option A: Run SQL (Recommended)

```sql
UPDATE feature_flags 
SET default_enabled = true 
WHERE key = 'billing_enabled';
```

### Option B: Via Super Admin UI

1. Login as Super Admin
2. Navigate to `/super-admin/feature-flags`
3. Find "Billing System" in the billing category
4. Toggle ON

---

## Task 4: Super Admin Billing Dashboard (P2)

Only do this if time permits. The spec has full code in `CODEX-033-BILLING-001-remaining-items.md`.

**Create:** `src/pages/super-admin/Billing.tsx`

**Add route** in `App.tsx`:
```typescript
<Route path="billing" element={<SuperAdminBilling />} />
```

**Add nav item** in `SuperAdminLayout.tsx`:
```typescript
{ path: '/super-admin/billing', label: 'Billing', icon: DollarSign },
```

---

## Verification Checklist

### Task 1: Driver Limit Enforcement
- [ ] Create a company on Free plan (4 operator limit)
- [ ] Add 4 drivers/vehicles
- [ ] Try to approve a 5th driver
- [ ] Upgrade modal should appear
- [ ] Approval should be blocked

### Task 2: Dashboard Banner
- [ ] Login as Admin
- [ ] Go to Dashboard
- [ ] If at 80%+ usage, warning banner visible
- [ ] Banner has "Upgrade" button
- [ ] Clicking upgrade goes to `/admin/billing`

### Task 3: Feature Flag
- [ ] Billing nav item visible in Admin sidebar
- [ ] `/admin/billing` page loads

### Task 4: Super Admin Dashboard (if implemented)
- [ ] MRR displays correctly
- [ ] Subscriber counts accurate
- [ ] Company list shows

---

## Key Patterns

### Checking Limits

```typescript
import { checkCanAddOperator } from '@/services/billing';

const result = await checkCanAddOperator(companyId);
// result = { allowed: boolean, current: number, limit: number | null, message?: string }

if (!result.allowed) {
  // Block the action, show upgrade modal
}
```

### Using Feature Flags

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

const billingEnabled = useFeatureFlag('billing_enabled');

// In JSX:
{billingEnabled && <SomeComponent />}
```

### UpgradeModal Props

```typescript
<UpgradeModal
  companyId={companyId}        // Required
  open={isOpen}                 // Controlled open state
  onOpenChange={setIsOpen}      // Controlled setter
  showTrigger={false}           // Hide default button trigger
/>
```

---

## Files Summary

| Task | File | Action |
|------|------|--------|
| 1 | `src/pages/admin/DriverDetail.tsx` | Add limit check to approval |
| 2 | `src/pages/admin/Dashboard.tsx` | Add UsageBanner |
| 3 | SQL or Super Admin UI | Enable `billing_enabled` flag |
| 4 | `src/pages/super-admin/Billing.tsx` | Create new page |
| 4 | `src/App.tsx` | Add route |
| 4 | `src/components/layouts/SuperAdminLayout.tsx` | Add nav item |

---

## Start Here

1. Read the full spec: `docs/CODEX-033-BILLING-001-remaining-items.md`
2. Open `src/pages/admin/DriverDetail.tsx` and find the approve handler
3. Add the limit check following the CreateVehicleModal pattern
4. Open `src/pages/admin/Dashboard.tsx` and add UsageBanner
5. Enable the feature flag
6. Test all flows

Good luck!
