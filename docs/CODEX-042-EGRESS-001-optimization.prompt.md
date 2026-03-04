# CODEX-042: EGRESS-001 Egress Optimization - Implementation Prompts

> **Each user story below is a self-contained task that can be completed by an individual agent.**
> **Reference the context document:** `docs/CODEX-042-EGRESS-001-optimization.md`

---

## Prerequisites

Before starting any task:
1. Read the context document: `docs/CODEX-042-EGRESS-001-optimization.md`
2. Understand the patterns in the "Optimization Patterns Reference" section
3. Check the database schema in `supabase/migrations/` for valid column names

---

## User Story 1: Optimize Broker Service Queries

### Context
The `src/services/brokers.ts` file has 7 instances of `select('*')` returning all columns when only specific fields are needed.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md    # Context and patterns
src/services/brokers.ts                       # File to modify
supabase/migrations/012_broker_management.sql # Schema reference
```

### Task
1. Open `src/services/brokers.ts`
2. Find all `.select('*')` and `.select()` calls
3. For each query, determine which columns are actually used by:
   - Checking the return type
   - Checking callers of the function
4. Replace with specific column lists

### Example Transformations

**getBrokers function:**
```typescript
// Before
.select('*')

// After - only columns needed for list view
.select('id, name, company_id, status, code, trip_rate_type, created_at')
```

**getBrokerById function:**
```typescript
// Before  
.select('*')

// After - full broker detail view needs most columns
.select(`
  id, name, code, status, trip_rate_type, trip_rate_value,
  website, phone, notes, created_at, updated_at, company_id
`)
```

### Verification
- [ ] All `select('*')` replaced with specific columns
- [ ] Broker list page loads without errors
- [ ] Broker detail page displays all expected information
- [ ] Create/edit broker functionality works

### Estimated Impact
~10-15% reduction in broker-related query egress

---

## User Story 2: Optimize Onboarding Service Queries

### Context
The `src/services/onboarding.ts` file has 6 instances of broad column selection.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md    # Context and patterns
src/services/onboarding.ts                    # File to modify
supabase/migrations/014_driver_onboarding.sql # Schema reference
```

### Task
1. Open `src/services/onboarding.ts`
2. Identify each query and what data it actually needs
3. Replace `select('*')` with minimal column lists
4. For insert/update operations, only return `id` if the full object isn't needed

### Key Functions to Review
- `getOnboardingStatus` - may need status fields only
- `updateOnboardingStep` - likely doesn't need full return
- `getCompanyOnboardingConfig` - check what UI consumes

### Verification
- [ ] Driver onboarding flow works end-to-end
- [ ] Onboarding progress displays correctly
- [ ] No TypeScript errors from missing fields

---

## User Story 3: Optimize Companies Service Queries

### Context
The `src/services/companies.ts` file has 6 instances returning all columns.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
src/services/companies.ts
supabase/migrations/001_core_tables.sql
```

### Task
1. Open `src/services/companies.ts`
2. Replace `select('*')` with specific columns
3. For operations that already use `{ count: 'exact', head: true }`, leave as-is (these are already optimized)

### Common Company Columns Needed
```typescript
// List view
'id, name, slug, created_at'

// Detail view
'id, name, slug, logo_url, primary_color, created_at, updated_at'

// With billing
'id, name, slug, plan_id, stripe_customer_id'
```

### Verification
- [ ] Super Admin company list loads
- [ ] Company detail page shows all info
- [ ] Company settings save correctly

---

## User Story 4: Optimize Feature Flags Service Queries

### Context
The `src/services/featureFlags.ts` file has 5 instances of `select('*')`. Feature flag checks are frequent, making this a high-impact optimization.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
src/services/featureFlags.ts
supabase/migrations/026_feature_flags.sql
```

### Task
1. Open `src/services/featureFlags.ts`
2. Optimize each query:

**For flag checks (isFeatureEnabled):**
```typescript
// Only need these columns
.select('id, default_enabled')
```

**For flag listings (getAllFlags):**
```typescript
.select('id, key, name, description, category, default_enabled, is_internal')
```

**For overrides:**
```typescript
.select('id, flag_id, enabled, reason')
```

### Verification
- [ ] Feature flag checks work correctly
- [ ] Super Admin feature flags page loads
- [ ] Company feature overrides work
- [ ] Cache behavior unchanged

---

## User Story 5: Optimize Vehicle Assignments Service

### Context
The `src/services/vehicleAssignments.ts` file has 4 instances returning all columns, plus some insert/update operations returning full objects unnecessarily.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
src/services/vehicleAssignments.ts
supabase/migrations/013_vehicle_assignment.sql
```

### Task
1. Open `src/services/vehicleAssignments.ts`
2. Optimize select queries
3. For insert/update operations, return only `id, status` or nothing if not used

### Column Recommendations
```typescript
// Assignment list
'id, driver_id, vehicle_id, status, start_date, end_date, created_at'

// After create/update - minimal return
.select('id, status')
```

### Verification
- [ ] Vehicle assignment list displays
- [ ] Creating assignments works
- [ ] Updating assignment status works
- [ ] Driver-vehicle relationships display correctly

---

## User Story 6: Optimize Remaining Service Files

### Context
Several other service files have 2-4 instances each of broad column selection.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
```

### Files to Optimize

| File | Priority | Notes |
|------|----------|-------|
| `src/services/billing.ts` | Medium | 3 instances |
| `src/services/applications.ts` | Medium | 4 instances |
| `src/services/drivers.ts` | Medium | 2 instances |
| `src/services/vehicles.ts` | Medium | 4 instances |
| `src/services/profile.ts` | Medium | 2 instances |
| `src/services/credentialProgress.ts` | Low | 1 instance |
| `src/services/driverVehicles.ts` | Low | 2 instances |
| `src/services/invitations.ts` | Low | 1 instance |
| `src/contexts/AuthContext.tsx` | Low | 2 instances |

### Task
For each file:
1. Find `select('*')` and `select()` calls
2. Check the migration files for valid column names
3. Determine minimum columns needed
4. Replace with specific selections

### Verification
- [ ] Each modified file's functionality tested
- [ ] No TypeScript errors
- [ ] No missing data in UI

---

## User Story 7: Add Storage Upload cacheControl Headers

### Context
All storage uploads lack `cacheControl` headers, meaning browsers cannot cache downloaded assets. Adding cache headers reduces repeat downloads.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
```

### Files to Modify

| File | Line | Bucket | Recommended Cache |
|------|------|--------|-------------------|
| `src/services/profile.ts` | ~328 | profile-photos | 3600 (1 hour) |
| `src/services/credentials.ts` | ~349 | credential-documents | 3600 (1 hour) |
| `src/services/driverVehicles.ts` | ~297 | vehicle-photos | 3600 (1 hour) |
| `src/components/features/apply/LicensePhotoUpload.tsx` | ~86 | credential-documents | 3600 |
| `src/components/features/driver/EditLicenseModal.tsx` | ~100 | credential-documents | 3600 |

### Task
For each file, update the upload call:

**Before:**
```typescript
await supabase.storage
  .from('bucket-name')
  .upload(path, file, { upsert: true });
```

**After:**
```typescript
await supabase.storage
  .from('bucket-name')
  .upload(path, file, { 
    upsert: true,
    cacheControl: '3600'  // 1 hour browser cache
  });
```

### Verification
- [ ] Profile photo upload works
- [ ] Credential document upload works
- [ ] Vehicle photo upload works
- [ ] License photo upload works
- [ ] Check Network tab: Response headers should include `cache-control: max-age=3600`

---

## User Story 8: Configure QueryClient Default Caching

### Context
TanStack Query is configured without default `staleTime`, causing immediate refetches. Adding default caching reduces redundant API calls.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
src/App.tsx
```

### Task
1. Open `src/App.tsx`
2. Find the `QueryClient` instantiation
3. Add default options:

**Before:**
```typescript
const queryClient = new QueryClient();
```

**After:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,  // 2 minutes - data considered fresh
      gcTime: 10 * 60 * 1000,    // 10 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      retry: 1, // Only retry failed requests once
    },
  },
});
```

### Important Notes
- `staleTime: 2 minutes` means data won't refetch for 2 minutes after initial fetch
- This is appropriate for most admin workflows where data doesn't change frequently
- Individual hooks can override with shorter/longer times as needed
- `refetchOnWindowFocus: false` prevents unnecessary refetches when switching tabs

### Verification
- [ ] App loads without errors
- [ ] Navigate between pages - data should persist without refetching
- [ ] Mutations still work and invalidate cache appropriately
- [ ] No stale data issues in critical flows

---

## User Story 9: Fix Realtime Subscription Cleanup

### Context
The `useRealtime` hook has a race condition where cleanup may run before the channel is assigned. While realtime isn't actively used, fixing this prevents future issues.

### Required Reading
```
docs/CODEX-042-EGRESS-001-optimization.md
src/hooks/useRealtime.tsx
```

### Task
1. Open `src/hooks/useRealtime.tsx`
2. Fix the race condition by using a ref for the channel:

**Before (problematic):**
```typescript
useEffect(() => {
  let channel: RealtimeChannel;
  
  const setupRealtime = async () => {
    channel = supabase.channel(...);
    // ...
  };
  
  setupRealtime();
  
  return () => {
    supabase.removeChannel(channel); // May be undefined!
  };
}, [...]);
```

**After (fixed):**
```typescript
const channelRef = useRef<RealtimeChannel | null>(null);

useEffect(() => {
  const setupRealtime = async () => {
    const channel = supabase.channel(...);
    channelRef.current = channel;
    // ...
  };
  
  setupRealtime();
  
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [...]);
```

3. Also change the default event from `'*'` to require explicit specification:

```typescript
// Change default to require explicit event type
const event = config.event; // Remove || '*' default
if (!event) {
  console.warn('useRealtime: event type should be specified');
}
```

### Verification
- [ ] No TypeScript errors
- [ ] If realtime is tested, subscriptions clean up properly on unmount
- [ ] No memory leaks in React DevTools

---

## Implementation Order

Recommended sequence for maximum impact:

| Order | Story | Impact | Effort |
|-------|-------|--------|--------|
| 1 | Story 8: QueryClient Caching | HIGH | LOW |
| 2 | Story 1: Broker Service | HIGH | MEDIUM |
| 3 | Story 4: Feature Flags | HIGH | LOW |
| 4 | Story 7: Storage cacheControl | MEDIUM | LOW |
| 5 | Story 2: Onboarding Service | MEDIUM | MEDIUM |
| 6 | Story 3: Companies Service | MEDIUM | LOW |
| 7 | Story 5: Vehicle Assignments | MEDIUM | MEDIUM |
| 8 | Story 6: Remaining Services | LOW | HIGH |
| 9 | Story 9: Realtime Cleanup | LOW | LOW |

---

## Global Verification Checklist

After completing all stories:

### Admin Functionality
- [ ] Dashboard loads with all stats
- [ ] Driver list and detail pages work
- [ ] Vehicle list and detail pages work  
- [ ] Broker management works
- [ ] Credential types load
- [ ] Application review works
- [ ] Billing page loads (if enabled)

### Driver Functionality
- [ ] Driver can view credentials
- [ ] Driver can submit documents
- [ ] Profile photo upload/display works
- [ ] Vehicle photos display

### Super Admin Functionality
- [ ] Company list loads
- [ ] Company detail with all tabs works
- [ ] Feature flags management works

### Performance
- [ ] Network tab shows smaller response payloads
- [ ] Pages feel responsive (no extra loading)
- [ ] Browser caching working for images

---

## Rollback Plan

If issues arise after deployment:

1. **Query Issues:** Revert specific column selections back to `select('*')` for affected queries
2. **Cache Issues:** Remove or reduce `staleTime` in QueryClient config
3. **Storage Issues:** Remove `cacheControl` from upload options

Keep original code commented for quick rollback if needed during testing.

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Average query payload size | ~5-10KB | ~2-4KB |
| Queries per page load | 3-5 | 3-5 (same, but smaller) |
| Cache hit rate (images) | 0% | 80%+ |
| Estimated egress reduction | - | 40-60% |

---

## Notes for Agents

1. **Don't guess column names** - always check the migration file for the table
2. **Test after each change** - don't batch too many changes before testing
3. **Check TypeScript types** - if types expect certain fields, include them
4. **Preserve existing logic** - only change column selections, not query logic
5. **Document decisions** - if a query needs more columns than expected, add a comment explaining why
