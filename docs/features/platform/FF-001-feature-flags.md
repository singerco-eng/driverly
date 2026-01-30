# FF-001: Feature Flag System

> **Last Updated:** 2026-01-24  
> **Status:** Planning  
> **Phase:** Platform Foundation  
> **Dependencies:** None  
> **Blocks:** BILLING-001 Subscription System

---

## Overview

Feature Flags provide a system for Super Admins to enable/disable features globally or per-company. This enables:

1. **Gradual rollouts** - Test features with select companies before full release
2. **Tier-based access** - Lock features to specific billing plans (future)
3. **Kill switches** - Disable problematic features without deployment
4. **Internal testing** - Enable unreleased features for test accounts

---

## User Stories

### Super Admin Stories

1. **As a Super Admin**, I want to view all feature flags so that I can see what's available to toggle.

2. **As a Super Admin**, I want to enable/disable a feature flag globally so that it affects all companies at once.

3. **As a Super Admin**, I want to override a feature flag for a specific company so that I can grant or revoke access individually.

4. **As a Super Admin**, I want to see which companies have overrides for a flag so that I can audit access.

5. **As a Super Admin**, I want to create new feature flags via seed/migration so that new features can be controlled.

6. **As a Super Admin**, I want feature flags to integrate with billing plans so that paid features can be automatically gated (future).

### System Stories

7. **As the system**, I need to check feature flags quickly so that page loads aren't slowed down.

8. **As the system**, I need to cache feature flags so that we don't hit the database on every check.

9. **As the system**, I need to evaluate flags in order: company override → plan entitlement → global default.

### Admin Stories (Read-Only)

10. **As a Company Admin**, I want to see which features are enabled for my company so that I understand what I can use.

---

## Data Model

### New Tables

```sql
-- Migration: 026_feature_flags.sql

-- Feature Flag Definitions
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- 'billing_enabled', 'api_access', etc.
  name TEXT NOT NULL,                 -- 'Billing System', 'API Access'
  description TEXT,
  category TEXT DEFAULT 'general',    -- 'billing', 'operations', 'integrations'
  default_enabled BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false,  -- Hidden from Admin view
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company-Specific Overrides
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

-- Indexes
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_category ON feature_flags(category);
CREATE INDEX idx_company_overrides_company ON company_feature_overrides(company_id);
CREATE INDEX idx_company_overrides_flag ON company_feature_overrides(flag_id);
```

### RLS Policies

```sql
-- Enable RLS
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
```

### Seed Data

```sql
-- Initial feature flags
INSERT INTO feature_flags (key, name, description, category, default_enabled) VALUES
-- Billing (will be enabled after billing implementation)
('billing_enabled', 'Billing System', 'Subscription and payment management', 'billing', false),
('billing_self_service', 'Self-Service Billing', 'Admins can upgrade/downgrade plans', 'billing', false),
('billing_enforcement', 'Limit Enforcement', 'Enforce operator limits', 'billing', false),

-- Core features (enabled by default)
('driver_management', 'Driver Management', 'Manage drivers and applications', 'core', true),
('vehicle_management', 'Vehicle Management', 'Manage vehicles and assignments', 'core', true),
('credential_management', 'Credential Management', 'Credential types and submissions', 'core', true),
('broker_management', 'Broker Management', 'Trip sources and assignments', 'core', true),

-- Future features (disabled by default)
('trip_management', 'Trip Management', 'Trip creation and tracking', 'operations', false),
('driver_payments', 'Driver Payments', 'Pay drivers through the platform', 'finance', false),
('advanced_reports', 'Advanced Reports', 'Enhanced analytics and exports', 'analytics', false),
('api_access', 'API Access', 'REST API for integrations', 'integrations', false),
('white_label', 'White Label', 'Custom branding and domain', 'enterprise', false);
```

---

## Type Definitions

```typescript
// src/types/featureFlags.ts

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  default_enabled: boolean;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyFeatureOverride {
  id: string;
  company_id: string;
  flag_id: string;
  enabled: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagWithOverride extends FeatureFlag {
  override?: CompanyFeatureOverride;
  effective_value: boolean;  // Computed: override ?? default
}

export type FeatureFlagKey = 
  | 'billing_enabled'
  | 'billing_self_service'
  | 'billing_enforcement'
  | 'driver_management'
  | 'vehicle_management'
  | 'credential_management'
  | 'broker_management'
  | 'trip_management'
  | 'driver_payments'
  | 'advanced_reports'
  | 'api_access'
  | 'white_label';
```

---

## Service Layer

```typescript
// src/services/featureFlags.ts

import { supabase } from '@/integrations/supabase/client';
import type { FeatureFlag, FeatureFlagWithOverride } from '@/types/featureFlags';

// Cache for feature flags (invalidate on changes)
let flagCache: Map<string, boolean> = new Map();
let cacheCompanyId: string | null = null;

export async function getAllFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getFlagsForCompany(
  companyId: string
): Promise<FeatureFlagWithOverride[]> {
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('is_internal', false);

  const { data: overrides } = await supabase
    .from('company_feature_overrides')
    .select('*')
    .eq('company_id', companyId);

  const overrideMap = new Map(overrides?.map(o => [o.flag_id, o]));

  return (flags ?? []).map(flag => ({
    ...flag,
    override: overrideMap.get(flag.id),
    effective_value: overrideMap.get(flag.id)?.enabled ?? flag.default_enabled,
  }));
}

export async function isFeatureEnabled(
  companyId: string,
  flagKey: string
): Promise<boolean> {
  // Check cache first
  const cacheKey = `${companyId}:${flagKey}`;
  if (cacheCompanyId === companyId && flagCache.has(cacheKey)) {
    return flagCache.get(cacheKey)!;
  }

  // Fetch from database
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('id, default_enabled')
    .eq('key', flagKey)
    .single();

  if (!flag) return false;

  const { data: override } = await supabase
    .from('company_feature_overrides')
    .select('enabled')
    .eq('company_id', companyId)
    .eq('flag_id', flag.id)
    .single();

  const result = override?.enabled ?? flag.default_enabled;

  // Update cache
  if (cacheCompanyId !== companyId) {
    flagCache.clear();
    cacheCompanyId = companyId;
  }
  flagCache.set(cacheKey, result);

  return result;
}

export async function setGlobalDefault(
  flagId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('feature_flags')
    .update({ default_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', flagId);

  if (error) throw error;
  flagCache.clear();
}

export async function setCompanyOverride(
  companyId: string,
  flagId: string,
  enabled: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('company_feature_overrides')
    .upsert({
      company_id: companyId,
      flag_id: flagId,
      enabled,
      reason,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'company_id,flag_id',
    });

  if (error) throw error;
  flagCache.clear();
}

export async function removeCompanyOverride(
  companyId: string,
  flagId: string
): Promise<void> {
  const { error } = await supabase
    .from('company_feature_overrides')
    .delete()
    .eq('company_id', companyId)
    .eq('flag_id', flagId);

  if (error) throw error;
  flagCache.clear();
}

export function clearFlagCache(): void {
  flagCache.clear();
  cacheCompanyId = null;
}
```

---

## React Hook

```typescript
// src/hooks/useFeatureFlags.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllFlags,
  getFlagsForCompany,
  isFeatureEnabled,
  setGlobalDefault,
  setCompanyOverride,
  removeCompanyOverride,
} from '@/services/featureFlags';
import type { FeatureFlagKey } from '@/types/featureFlags';

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
  forCompany: (companyId: string) => [...featureFlagKeys.all, 'company', companyId] as const,
  check: (companyId: string, key: string) => [...featureFlagKeys.all, 'check', companyId, key] as const,
};

export function useAllFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.list(),
    queryFn: getAllFlags,
  });
}

export function useCompanyFeatureFlags(companyId: string) {
  return useQuery({
    queryKey: featureFlagKeys.forCompany(companyId),
    queryFn: () => getFlagsForCompany(companyId),
    enabled: !!companyId,
  });
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data } = useQuery({
    queryKey: featureFlagKeys.check(companyId ?? '', key),
    queryFn: () => isFeatureEnabled(companyId!, key),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return data ?? false;
}

export function useSetGlobalDefault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      setGlobalDefault(flagId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
    },
  });
}

export function useSetCompanyOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      companyId,
      flagId,
      enabled,
      reason,
    }: {
      companyId: string;
      flagId: string;
      enabled: boolean;
      reason?: string;
    }) => setCompanyOverride(companyId, flagId, enabled, reason),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.forCompany(companyId) });
    },
  });
}

export function useRemoveCompanyOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, flagId }: { companyId: string; flagId: string }) =>
      removeCompanyOverride(companyId, flagId),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.forCompany(companyId) });
    },
  });
}
```

---

## UI Components

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/super-admin/FeatureFlags.tsx` | Global flags management page |
| `src/components/features/super-admin/FeatureFlagTable.tsx` | List all flags with toggles |
| `src/components/features/super-admin/CompanyFlagsTab.tsx` | Tab in CompanyDetail for overrides |
| `src/components/features/super-admin/FeatureFlagOverrideModal.tsx` | Set override with reason |

### Super Admin Feature Flags Page

**Route:** `/super-admin/feature-flags`

```
┌─────────────────────────────────────────────────────────────────┐
│  Feature Flags                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  These control feature availability across the platform.        │
│                                                                 │
│  [Billing ▾]  [Search flags...]                                 │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Billing                                                    │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Billing System              [○ Off]     0 overrides        │ │
│  │ Subscription and payment management                        │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Self-Service Billing        [○ Off]     0 overrides        │ │
│  │ Admins can upgrade/downgrade plans                         │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Limit Enforcement           [○ Off]     0 overrides        │ │
│  │ Enforce operator limits                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Core                                                       │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Driver Management           [● On]      0 overrides        │ │
│  │ Manage drivers and applications                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Company Feature Overrides Tab

**Location:** `/super-admin/companies/:id?tab=features`

```
┌─────────────────────────────────────────────────────────────────┐
│  [Overview]  [Info]  [Admins]  [Invitations]  [Features]  [Billing] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Feature Access for Acme Transport                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Flag                    │ Global │ Override │ Effective   │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ Billing System          │ Off    │ ● On     │ ✓ Enabled   │ │
│  │ Self-Service Billing    │ Off    │ —        │ ✗ Disabled  │ │
│  │ Driver Management       │ On     │ —        │ ✓ Enabled   │ │
│  │ API Access              │ Off    │ —        │ ✗ Disabled  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Click a flag to add/remove override                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage in Components

```typescript
// Example: Conditionally render billing nav item
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

function AdminLayout() {
  const billingEnabled = useFeatureFlag('billing_enabled');

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/drivers', label: 'Drivers', icon: Users },
    // ... other items
    
    // Only show if billing is enabled
    ...(billingEnabled ? [
      { path: '/admin/billing', label: 'Billing', icon: CreditCard },
    ] : []),
  ];

  // ...
}
```

```typescript
// Example: Conditional feature access
function SomeFeaturePage() {
  const hasApiAccess = useFeatureFlag('api_access');

  if (!hasApiAccess) {
    return <FeatureLockedMessage feature="API Access" />;
  }

  return <ActualFeatureContent />;
}
```

---

## Acceptance Criteria

### AC-1: Database & Schema

- [ ] Migration creates `feature_flags` table with all columns
- [ ] Migration creates `company_feature_overrides` table
- [ ] RLS policies correctly restrict access by role
- [ ] Seed data includes all initial flags
- [ ] Indexes created for performance

### AC-2: Super Admin - Global Management

- [ ] Can view all feature flags grouped by category
- [ ] Can toggle global default for any flag
- [ ] Can see count of company overrides per flag
- [ ] Can filter/search flags

### AC-3: Super Admin - Company Overrides

- [ ] New "Features" tab in CompanyDetail page
- [ ] Shows all flags with global value, override, and effective value
- [ ] Can add override with reason
- [ ] Can remove override (reverts to global)
- [ ] Changes reflected immediately

### AC-4: Hook & Service

- [ ] `useFeatureFlag()` returns correct value for current company
- [ ] Flag values cached for 5 minutes
- [ ] Cache invalidated on changes
- [ ] Works correctly when no company (super admin)

### AC-5: Integration Ready

- [ ] Types exported from `src/types/index.ts`
- [ ] Hook ready for use in components
- [ ] Billing flags seeded and ready for BILLING-001

---

## Implementation Files

| File | Purpose |
|------|---------|
| `supabase/migrations/026_feature_flags.sql` | Database schema + seed |
| `src/types/featureFlags.ts` | TypeScript types |
| `src/services/featureFlags.ts` | Database operations |
| `src/hooks/useFeatureFlags.ts` | React Query hooks |
| `src/pages/super-admin/FeatureFlags.tsx` | Global management page |
| `src/components/features/super-admin/FeatureFlagTable.tsx` | Flag list with toggles |
| `src/components/features/super-admin/CompanyFlagsTab.tsx` | Company override tab |
| `src/components/features/super-admin/FeatureFlagOverrideModal.tsx` | Override modal |

---

## Route Changes

```typescript
// Add to App.tsx super-admin routes:
<Route path="feature-flags" element={<FeatureFlags />} />
```

```typescript
// Add to SuperAdminLayout nav:
{ path: '/super-admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
```

---

## Out of Scope

- User-level feature flags (only company-level for now)
- A/B testing / percentage rollouts
- Feature flag history/audit log
- API for external flag management
- Plan-based entitlements (handled in BILLING-001)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-24 | Initial spec | AI |
