# CODEX-030: FF-001 Feature Flags - Implementation Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

You are implementing a **Feature Flags System** for Driverly, a multi-tenant SaaS platform for NEMT (Non-Emergency Medical Transportation) companies. This is **Phase 0** of the billing initiative and must be completed before billing can be implemented.

### What is Driverly?

Driverly is a driver and vehicle credentialing platform where:
- **Super Admins** manage the platform (companies, settings, feature flags)
- **Company Admins** manage their transportation company (drivers, vehicles, credentials)
- **Drivers** submit credentials and manage their profiles

### What are Feature Flags?

A system for Super Admins to enable/disable features:
- **Globally** - affects all companies
- **Per-company** - overrides the global default for specific companies

This enables gradual rollouts, `never_bill` test accounts, and tier-based feature gating.

---

## Required Reading (In Order)

Before writing any code, read these documents to understand the architecture and patterns:

### 1. Architecture & Patterns

```
docs/01-ARCHITECTURE.md          # Tech stack, data flow
docs/03-AUTHENTICATION.md        # Auth system, roles, JWT claims
docs/04-FRONTEND-GUIDELINES.md   # Design system, UI components
```

### 2. Database & RLS Patterns

```
docs/02-DATABASE-SCHEMA.md       # Table structure (historical reference)
supabase/migrations/001_core_tables.sql    # RLS policy patterns
supabase/migrations/004_fix_rls_jwt_claims.sql  # JWT claim access pattern
```

### 3. Existing Super Admin Implementation (CRITICAL - Follow These Patterns)

```
src/pages/super-admin/Companies.tsx        # List page pattern
src/pages/super-admin/CompanyDetail.tsx    # Detail page with tabs
src/components/layouts/SuperAdminLayout.tsx  # Navigation structure
src/components/features/super-admin/        # All super admin components
```

### 4. Service & Hook Patterns

```
src/services/companies.ts        # Service layer pattern
src/hooks/useCompanies.ts        # React Query hook pattern
src/lib/query-keys.ts            # Query key organization
```

### 5. The Implementation Spec

```
docs/CODEX-030-FF-001-feature-flags.md     # Full implementation spec
docs/features/platform/FF-001-feature-flags.md  # Feature specification
```

---

## Key Patterns to Follow

### RLS Policy Pattern

All RLS policies use this pattern for role checking:

```sql
-- Super Admin access
(auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'

-- Company-scoped access
company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
```

### Service Layer Pattern

```typescript
// src/services/featureFlags.ts
import { supabase } from '@/integrations/supabase/client';

export async function getAllFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
}
```

### React Query Hook Pattern

```typescript
// src/hooks/useFeatureFlags.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
};

export function useAllFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.list(),
    queryFn: getAllFlags,
  });
}
```

### Page Component Pattern

Look at `src/pages/super-admin/Companies.tsx` for:
- PageHeader usage
- Filter/search UI
- EnhancedDataView or Card layouts
- Loading and empty states

### Component Organization

```
src/components/features/super-admin/
├── FeatureFlagTable.tsx           # NEW: List flags with toggles
├── FlagOverridesList.tsx          # NEW: Companies with overrides
├── CompanyFeaturesTab.tsx         # NEW: Tab for CompanyDetail
├── FeatureOverrideModal.tsx       # NEW: Set override with reason
└── ... existing components
```

---

## Implementation Order

Execute tasks in this order:

1. **Task 1: Migration** - Create database tables and seed data
2. **Task 2: Types** - Define TypeScript interfaces
3. **Task 3: Service** - Database operations with caching
4. **Task 4: Hooks** - React Query wrapper hooks
5. **Task 5-9: UI** - Pages and components
6. **Task 10: Routes** - Wire up navigation

---

## Acceptance Criteria Summary

After implementation, verify:

- [ ] Super Admin can view all flags at `/super-admin/feature-flags`
- [ ] Super Admin can toggle global defaults
- [ ] Super Admin can set per-company overrides in CompanyDetail → Features tab
- [ ] `useFeatureFlag('billing_enabled')` returns correct boolean
- [ ] Cache invalidates on mutations
- [ ] RLS properly restricts Admin to viewing (not editing) non-internal flags

---

## Code Style Notes

- Use `cn()` from `@/lib/utils` for className merging
- Use shadcn/ui components from `@/components/ui/`
- Use `PageHeader` from `@/components/shared/PageHeader`
- Toast notifications via `useToast()` hook
- Follow existing file naming: `PascalCase.tsx` for components

---

## Quick Reference: Existing Files to Study

| Pattern | File to Reference |
|---------|-------------------|
| Super Admin page layout | `src/pages/super-admin/Companies.tsx` |
| Tabs in detail page | `src/pages/super-admin/CompanyDetail.tsx` |
| Service with CRUD | `src/services/companies.ts` |
| Hooks with mutations | `src/hooks/useCompanies.ts` |
| Modal component | `src/components/features/super-admin/CreateCompanyModal.tsx` |
| Table component | Any file using `<Table>` from ui |
| Card layout | `src/components/features/super-admin/CompanyCard.tsx` |
| RLS patterns | `supabase/migrations/001_core_tables.sql` |

---

## Start Here

1. Read the full implementation spec: `docs/CODEX-030-FF-001-feature-flags.md`
2. Study the Super Admin patterns in the files listed above
3. Begin with Task 1 (migration) and work through sequentially
4. Test each task before moving to the next

Good luck! 🚀
