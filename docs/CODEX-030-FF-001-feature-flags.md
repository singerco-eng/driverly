# CODEX-030: FF-001 Feature Flags System

## Status: READY FOR IMPLEMENTATION

## Overview

Build a **Feature Flag System** that allows Super Admins to enable/disable features globally or per-company. This is foundational infrastructure needed before billing (BILLING-001) can be implemented, as it enables gradual rollout, `never_bill` test accounts, and future feature gating.

**Key Principle:** Feature flags evaluate in priority order: **company override → global default**. This allows targeted access control while maintaining simple global defaults.

**Feature Spec:** `docs/features/platform/FF-001-feature-flags.md`

## Prerequisites

- Super Admin layout and authentication complete (SA-001, SA-002)
- Company management working (`companies` table, CompanyDetail page)
- RLS policies pattern established (using `auth.jwt() -> 'app_metadata'`)

## User Stories

### Super Admin Stories

1. **As a Super Admin**, I want to view all feature flags grouped by category so I can see what's available to control.
2. **As a Super Admin**, I want to enable/disable a feature flag globally so it affects all companies at once.
3. **As a Super Admin**, I want to override a feature flag for a specific company so I can grant or revoke access individually.
4. **As a Super Admin**, I want to see which companies have overrides for each flag so I can audit access.
5. **As a Super Admin**, I want to remove a company override so it reverts to the global default.

### System Stories

6. **As the system**, I need to check feature flags quickly using cached values so that page loads aren't slowed down.
7. **As the system**, I need to evaluate flags in order (company override → global default) so that overrides take precedence.
8. **As the system**, I need to invalidate the cache when flags change so that updates take effect.

### Admin Stories (Read-Only)

9. **As a Company Admin**, I want to see which features are enabled for my company so I understand what I can use.

### Integration Stories

10. **As a developer**, I can use `useFeatureFlag('billing_enabled')` hook to conditionally render billing features.

---

## Tasks

### Task 1: Database Migration

Create `supabase/migrations/026_feature_flags.sql`:

```sql
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
('billing_enabled', 'Billing System', 'Subscription and payment management', 'billing', false, false),
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
```

---

### Task 2: TypeScript Types

Create `src/types/featureFlags.ts`:

```typescript
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
  effective_value: boolean;  // Computed: override?.enabled ?? default_enabled
}

export interface FeatureFlagWithStats extends FeatureFlag {
  override_count: number;    // How many companies have overrides
}

// Strict typing for known flag keys
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

// Category for grouping in UI
export type FeatureFlagCategory =
  | 'billing'
  | 'core'
  | 'operations'
  | 'finance'
  | 'analytics'
  | 'integrations'
  | 'enterprise'
  | 'general';
```

Update `src/types/index.ts` to export:

```typescript
export * from './featureFlags';
```

---

### Task 3: Feature Flags Service

Create `src/services/featureFlags.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  FeatureFlag,
  FeatureFlagWithOverride,
  FeatureFlagWithStats,
  CompanyFeatureOverride,
} from '@/types/featureFlags';

// ============ CACHE ============

let flagCache: Map<string, boolean> = new Map();
let cacheCompanyId: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(companyId: string): boolean {
  return (
    cacheCompanyId === companyId &&
    Date.now() - cacheTimestamp < CACHE_TTL
  );
}

export function clearFlagCache(): void {
  flagCache.clear();
  cacheCompanyId = null;
  cacheTimestamp = 0;
}

// ============ FETCH FLAGS ============

export async function getAllFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllFlagsWithStats(): Promise<FeatureFlagWithStats[]> {
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (flagsError) throw flagsError;

  // Get override counts per flag
  const { data: overrides, error: overridesError } = await supabase
    .from('company_feature_overrides')
    .select('flag_id');

  if (overridesError) throw overridesError;

  const overrideCounts = new Map<string, number>();
  for (const override of overrides ?? []) {
    const count = overrideCounts.get(override.flag_id) ?? 0;
    overrideCounts.set(override.flag_id, count + 1);
  }

  return (flags ?? []).map((flag) => ({
    ...flag,
    override_count: overrideCounts.get(flag.id) ?? 0,
  }));
}

export async function getFlagsForCompany(
  companyId: string
): Promise<FeatureFlagWithOverride[]> {
  const { data: flags, error: flagsError } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('is_internal', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (flagsError) throw flagsError;

  const { data: overrides, error: overridesError } = await supabase
    .from('company_feature_overrides')
    .select('*')
    .eq('company_id', companyId);

  if (overridesError) throw overridesError;

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [o.flag_id, o])
  );

  return (flags ?? []).map((flag) => {
    const override = overrideMap.get(flag.id);
    return {
      ...flag,
      override,
      effective_value: override?.enabled ?? flag.default_enabled,
    };
  });
}

export async function getCompanyOverrides(
  companyId: string
): Promise<CompanyFeatureOverride[]> {
  const { data, error } = await supabase
    .from('company_feature_overrides')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw error;
  return data ?? [];
}

export async function getOverridesForFlag(
  flagId: string
): Promise<(CompanyFeatureOverride & { company: { name: string } })[]> {
  const { data, error } = await supabase
    .from('company_feature_overrides')
    .select('*, company:companies(name)')
    .eq('flag_id', flagId);

  if (error) throw error;
  return data ?? [];
}

// ============ CHECK FLAGS ============

export async function isFeatureEnabled(
  companyId: string,
  flagKey: string
): Promise<boolean> {
  // Check cache first
  const cacheKey = `${companyId}:${flagKey}`;
  if (isCacheValid(companyId) && flagCache.has(cacheKey)) {
    return flagCache.get(cacheKey)!;
  }

  // Fetch from database
  const { data: flag, error: flagError } = await supabase
    .from('feature_flags')
    .select('id, default_enabled')
    .eq('key', flagKey)
    .single();

  if (flagError || !flag) return false;

  const { data: override } = await supabase
    .from('company_feature_overrides')
    .select('enabled')
    .eq('company_id', companyId)
    .eq('flag_id', flag.id)
    .maybeSingle();

  const result = override?.enabled ?? flag.default_enabled;

  // Update cache
  if (cacheCompanyId !== companyId) {
    flagCache.clear();
    cacheCompanyId = companyId;
    cacheTimestamp = Date.now();
  }
  flagCache.set(cacheKey, result);

  return result;
}

// Batch check for multiple flags at once
export async function getEnabledFlags(
  companyId: string,
  flagKeys: string[]
): Promise<Record<string, boolean>> {
  const flags = await getFlagsForCompany(companyId);
  const result: Record<string, boolean> = {};

  for (const key of flagKeys) {
    const flag = flags.find((f) => f.key === key);
    result[key] = flag?.effective_value ?? false;
  }

  return result;
}

// ============ MUTATIONS ============

export async function setGlobalDefault(
  flagId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('feature_flags')
    .update({ default_enabled: enabled })
    .eq('id', flagId);

  if (error) throw error;
  clearFlagCache();
}

export async function setCompanyOverride(
  companyId: string,
  flagId: string,
  enabled: boolean,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('company_feature_overrides')
    .upsert(
      {
        company_id: companyId,
        flag_id: flagId,
        enabled,
        reason: reason ?? null,
      },
      { onConflict: 'company_id,flag_id' }
    );

  if (error) throw error;
  clearFlagCache();
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
  clearFlagCache();
}
```

---

### Task 4: React Query Hooks

Create `src/hooks/useFeatureFlags.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as featureFlagService from '@/services/featureFlags';
import type { FeatureFlagKey } from '@/types/featureFlags';

// ============ QUERY KEYS ============

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
  listWithStats: () => [...featureFlagKeys.all, 'listWithStats'] as const,
  forCompany: (companyId: string) =>
    [...featureFlagKeys.all, 'company', companyId] as const,
  overridesForFlag: (flagId: string) =>
    [...featureFlagKeys.all, 'overrides', flagId] as const,
  check: (companyId: string, key: string) =>
    [...featureFlagKeys.all, 'check', companyId, key] as const,
};

// ============ QUERIES ============

// Super Admin: All flags with override counts
export function useAllFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.listWithStats(),
    queryFn: featureFlagService.getAllFlagsWithStats,
  });
}

// Get flags for a specific company with effective values
export function useCompanyFeatureFlags(companyId: string | undefined) {
  return useQuery({
    queryKey: featureFlagKeys.forCompany(companyId ?? ''),
    queryFn: () => featureFlagService.getFlagsForCompany(companyId!),
    enabled: !!companyId,
  });
}

// Get companies that have overrides for a specific flag
export function useOverridesForFlag(flagId: string | undefined) {
  return useQuery({
    queryKey: featureFlagKeys.overridesForFlag(flagId ?? ''),
    queryFn: () => featureFlagService.getOverridesForFlag(flagId!),
    enabled: !!flagId,
  });
}

// ============ MAIN HOOK: Check if feature is enabled ============

/**
 * Check if a feature is enabled for the current company.
 * Returns false while loading or if no company context.
 *
 * @example
 * const billingEnabled = useFeatureFlag('billing_enabled');
 * if (billingEnabled) {
 *   return <BillingPage />;
 * }
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data } = useQuery({
    queryKey: featureFlagKeys.check(companyId ?? '', key),
    queryFn: () => featureFlagService.isFeatureEnabled(companyId!, key),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  });

  // Super admins always have access (no company context)
  if (profile?.role === 'super_admin') {
    return true;
  }

  return data ?? false;
}

// Batch check multiple flags at once
export function useFeatureFlags(keys: FeatureFlagKey[]): Record<string, boolean> {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data } = useQuery({
    queryKey: [...featureFlagKeys.forCompany(companyId ?? ''), 'batch', keys],
    queryFn: () => featureFlagService.getEnabledFlags(companyId!, keys),
    enabled: !!companyId && keys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Super admins always have access
  if (profile?.role === 'super_admin') {
    return Object.fromEntries(keys.map((k) => [k, true]));
  }

  return data ?? Object.fromEntries(keys.map((k) => [k, false]));
}

// ============ MUTATIONS ============

export function useSetGlobalDefault() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      featureFlagService.setGlobalDefault(flagId, enabled),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: `Flag ${enabled ? 'enabled' : 'disabled'} globally`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSetCompanyOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    }) => featureFlagService.setCompanyOverride(companyId, flagId, enabled, reason),
    onSuccess: (_, { companyId, enabled }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: `Override ${enabled ? 'enabled' : 'disabled'}`,
        description: 'Company-specific access updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to set override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveCompanyOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, flagId }: { companyId: string; flagId: string }) =>
      featureFlagService.removeCompanyOverride(companyId, flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: 'Override removed',
        description: 'Company will now use global default.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

---

### Task 5: Super Admin Feature Flags Page

Create `src/pages/super-admin/FeatureFlags.tsx`:

```typescript
import { useState } from 'react';
import { ToggleLeft, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { FeatureFlagTable } from '@/components/features/super-admin/FeatureFlagTable';
import { useAllFeatureFlags } from '@/hooks/useFeatureFlags';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'core', label: 'Core' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function FeatureFlags() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: flags, isLoading } = useAllFeatureFlags();

  const filteredFlags = (flags ?? []).filter((flag) => {
    const matchesSearch =
      !search ||
      flag.name.toLowerCase().includes(search.toLowerCase()) ||
      flag.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || flag.category === category;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedFlags = filteredFlags.reduce(
    (acc, flag) => {
      const cat = flag.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(flag);
      return acc;
    },
    {} as Record<string, typeof filteredFlags>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ToggleLeft}
        title="Feature Flags"
        description="Control feature availability globally or per-company"
      />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search flags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Flag Groups */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading flags...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFlags).map(([cat, catFlags]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
                {cat}
                <Badge variant="secondary">{catFlags.length}</Badge>
              </h3>
              <FeatureFlagTable flags={catFlags} />
            </div>
          ))}

          {filteredFlags.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No flags found matching your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Task 6: Feature Flag Table Component

Create `src/components/features/super-admin/FeatureFlagTable.tsx`:

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { useSetGlobalDefault, useOverridesForFlag } from '@/hooks/useFeatureFlags';
import type { FeatureFlagWithStats } from '@/types/featureFlags';
import { FlagOverridesList } from './FlagOverridesList';

interface FeatureFlagTableProps {
  flags: FeatureFlagWithStats[];
}

export function FeatureFlagTable({ flags }: FeatureFlagTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {flags.map((flag) => (
            <FeatureFlagRow key={flag.id} flag={flag} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureFlagRow({ flag }: { flag: FeatureFlagWithStats }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const setGlobalDefault = useSetGlobalDefault();

  const handleToggle = (enabled: boolean) => {
    setGlobalDefault.mutate({ flagId: flag.id, enabled });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{flag.name}</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {flag.key}
              </code>
            </div>
            {flag.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {flag.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Override count */}
            {flag.override_count > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Users className="h-4 w-4" />
                  {flag.override_count} override{flag.override_count !== 1 ? 's' : ''}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}

            {/* Global toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {flag.default_enabled ? 'On' : 'Off'}
              </span>
              <Switch
                checked={flag.default_enabled}
                onCheckedChange={handleToggle}
                disabled={setGlobalDefault.isPending}
              />
            </div>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0">
          <FlagOverridesList flagId={flag.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

### Task 7: Flag Overrides List Component

Create `src/components/features/super-admin/FlagOverridesList.tsx`:

```typescript
import { Check, X, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOverridesForFlag, useRemoveCompanyOverride } from '@/hooks/useFeatureFlags';

interface FlagOverridesListProps {
  flagId: string;
}

export function FlagOverridesList({ flagId }: FlagOverridesListProps) {
  const { data: overrides, isLoading } = useOverridesForFlag(flagId);
  const removeOverride = useRemoveCompanyOverride();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading overrides...</div>;
  }

  if (!overrides?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No company-specific overrides.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Override</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map((override) => (
            <TableRow key={override.id}>
              <TableCell className="font-medium">
                {override.company.name}
              </TableCell>
              <TableCell>
                {override.enabled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Check className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {override.reason || '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    removeOverride.mutate({
                      companyId: override.company_id,
                      flagId,
                    })
                  }
                  disabled={removeOverride.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### Task 8: Company Features Tab

Create `src/components/features/super-admin/CompanyFeaturesTab.tsx`:

```typescript
import { useState } from 'react';
import { Check, X, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCompanyFeatureFlags,
  useSetCompanyOverride,
  useRemoveCompanyOverride,
} from '@/hooks/useFeatureFlags';
import { FeatureOverrideModal } from './FeatureOverrideModal';
import type { FeatureFlagWithOverride } from '@/types/featureFlags';

interface CompanyFeaturesTabProps {
  companyId: string;
  companyName: string;
}

export function CompanyFeaturesTab({ companyId, companyName }: CompanyFeaturesTabProps) {
  const { data: flags, isLoading } = useCompanyFeatureFlags(companyId);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagWithOverride | null>(null);

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading features...</div>;
  }

  // Group by category
  const groupedFlags = (flags ?? []).reduce(
    (acc, flag) => {
      const cat = flag.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(flag);
      return acc;
    },
    {} as Record<string, FeatureFlagWithOverride[]>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Feature Access</h3>
        <p className="text-sm text-muted-foreground">
          Manage which features are enabled for {companyName}.
        </p>
      </div>

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium capitalize">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="w-[100px]">Global</TableHead>
                  <TableHead className="w-[100px]">Override</TableHead>
                  <TableHead className="w-[100px]">Effective</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryFlags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    companyId={companyId}
                    onEdit={() => setSelectedFlag(flag)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {selectedFlag && (
        <FeatureOverrideModal
          open={!!selectedFlag}
          onOpenChange={(open) => !open && setSelectedFlag(null)}
          flag={selectedFlag}
          companyId={companyId}
          companyName={companyName}
        />
      )}
    </div>
  );
}

function FlagRow({
  flag,
  companyId,
  onEdit,
}: {
  flag: FeatureFlagWithOverride;
  companyId: string;
  onEdit: () => void;
}) {
  const removeOverride = useRemoveCompanyOverride();

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{flag.name}</div>
          {flag.description && (
            <div className="text-xs text-muted-foreground">{flag.description}</div>
          )}
        </div>
      </TableCell>

      {/* Global default */}
      <TableCell>
        {flag.default_enabled ? (
          <Badge variant="outline" className="text-green-600">
            On
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Off
          </Badge>
        )}
      </TableCell>

      {/* Override */}
      <TableCell>
        {flag.override ? (
          <Badge
            variant={flag.override.enabled ? 'default' : 'destructive'}
            className="cursor-pointer"
            onClick={onEdit}
          >
            {flag.override.enabled ? 'On' : 'Off'}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Effective value */}
      <TableCell>
        {flag.effective_value ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </TableCell>

      {/* Actions */}
      <TableCell>
        {flag.override ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              removeOverride.mutate({ companyId, flagId: flag.id })
            }
            disabled={removeOverride.isPending}
          >
            Reset
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Override
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
```

---

### Task 9: Feature Override Modal

Create `src/components/features/super-admin/FeatureOverrideModal.tsx`:

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSetCompanyOverride } from '@/hooks/useFeatureFlags';
import type { FeatureFlagWithOverride } from '@/types/featureFlags';

interface FeatureOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FeatureFlagWithOverride;
  companyId: string;
  companyName: string;
}

export function FeatureOverrideModal({
  open,
  onOpenChange,
  flag,
  companyId,
  companyName,
}: FeatureOverrideModalProps) {
  const [enabled, setEnabled] = useState(
    flag.override?.enabled ?? !flag.default_enabled
  );
  const [reason, setReason] = useState(flag.override?.reason ?? '');

  const setOverride = useSetCompanyOverride();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await setOverride.mutateAsync({
      companyId,
      flagId: flag.id,
      enabled,
      reason: reason || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override: {flag.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Set a company-specific override for <strong>{companyName}</strong>.
              This takes precedence over the global default.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Enable Feature</Label>
              <p className="text-sm text-muted-foreground">
                Global default: {flag.default_enabled ? 'On' : 'Off'}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why is this override being set?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={setOverride.isPending}>
              {setOverride.isPending ? 'Saving...' : 'Save Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 10: Routes and Navigation

**Update `src/App.tsx`:**

Add route for super-admin feature flags page:

```typescript
import FeatureFlags from '@/pages/super-admin/FeatureFlags';

// In super-admin routes:
<Route path="feature-flags" element={<FeatureFlags />} />
```

**Update `src/components/layouts/SuperAdminLayout.tsx`:**

Add nav item:

```typescript
import { ToggleLeft } from 'lucide-react';

// Add to nav items array:
{ path: '/super-admin/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
```

**Update `src/pages/super-admin/CompanyDetail.tsx`:**

Add Features tab:

```typescript
import { CompanyFeaturesTab } from '@/components/features/super-admin/CompanyFeaturesTab';

// Add tab trigger after existing tabs:
<TabsTrigger value="features">Features</TabsTrigger>

// Add tab content:
<TabsContent value="features">
  <CompanyFeaturesTab companyId={company.id} companyName={company.name} />
</TabsContent>
```

---

## Output Summary

When complete:

- ✅ Database tables: `feature_flags`, `company_feature_overrides`
- ✅ RLS policies for Super Admin and Admin access
- ✅ Types: `FeatureFlag`, `CompanyFeatureOverride`, `FeatureFlagKey`
- ✅ Service: CRUD + caching for flag checks
- ✅ Hook: `useFeatureFlag(key)` returns boolean for current company
- ✅ Super Admin page: `/super-admin/feature-flags`
- ✅ Company Features tab in CompanyDetail
- ✅ Override modal with reason field

---

## Acceptance Criteria

### AC-1: Database & Schema

- [ ] Migration creates `feature_flags` table with all columns
- [ ] Migration creates `company_feature_overrides` table
- [ ] RLS policies correctly restrict access by role
- [ ] Seed data includes billing, core, and future feature flags
- [ ] Indexes created for performance

### AC-2: Super Admin - Global Management

- [ ] Can view all feature flags grouped by category
- [ ] Can toggle global default for any flag
- [ ] Can see count of company overrides per flag
- [ ] Can expand to see which companies have overrides
- [ ] Can filter/search flags

### AC-3: Super Admin - Company Overrides

- [ ] "Features" tab visible in CompanyDetail page
- [ ] Shows all flags with global value, override, and effective value
- [ ] Can add override with optional reason
- [ ] Can remove override (reverts to global)
- [ ] Changes reflected immediately

### AC-4: Hook & Service

- [ ] `useFeatureFlag('key')` returns correct boolean for current company
- [ ] Flag values cached for 5 minutes
- [ ] Cache invalidated on mutations
- [ ] Super admins always get `true` (bypass)
- [ ] Works correctly when no company context

### AC-5: Integration Ready

- [ ] Types exported from `src/types/index.ts`
- [ ] Hook ready for conditional rendering in components
- [ ] Billing flags seeded and ready for BILLING-001

---

## Testing

1. **Global toggle:** Toggle a flag, verify all companies affected
2. **Company override:** Add override for one company, verify only that company affected
3. **Override removal:** Remove override, verify company reverts to global
4. **Cache:** Change flag, verify update visible within 5 minutes
5. **RLS:** Verify admin can only see non-internal flags
6. **Hook usage:** Use `useFeatureFlag()` in a component, verify correct value

---

## Example Usage

```typescript
// Conditional navigation item
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

function AdminLayout() {
  const billingEnabled = useFeatureFlag('billing_enabled');

  const navItems = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/drivers', label: 'Drivers' },
    ...(billingEnabled
      ? [{ path: '/admin/billing', label: 'Billing' }]
      : []),
  ];
}

// Conditional page access
function BillingPage() {
  const billingEnabled = useFeatureFlag('billing_enabled');

  if (!billingEnabled) {
    return <Navigate to="/admin" replace />;
  }

  return <BillingContent />;
}

// Conditional feature display
function DriverCard() {
  const paymentsEnabled = useFeatureFlag('driver_payments');

  return (
    <Card>
      <h3>John Smith</h3>
      {paymentsEnabled && <PaymentHistory driverId={driver.id} />}
    </Card>
  );
}
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Initial CODEX task created | AI |
