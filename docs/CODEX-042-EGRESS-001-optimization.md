# CODEX-042: EGRESS-001 Supabase Egress Optimization

## Status: READY FOR IMPLEMENTATION

## Overview

Optimize Supabase egress (bandwidth) costs by implementing best practices recommended by Supabase documentation. Egress is charged at **$0.09/GB** for uncached and **$0.03/GB** for cached traffic beyond plan quotas.

**Key Principle:** Reduce data transferred from Supabase to clients by selecting only needed columns, implementing pagination, leveraging browser caching, and optimizing realtime subscriptions.

**Reference Documentation:**
- [Manage Egress Usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [All About Supabase Egress](https://supabase.com/docs/guides/troubleshooting/all-about-supabase-egress-a_Sg_e)
- [Storage Optimizations](https://supabase.com/docs/guides/storage/production/scaling)

---

## Egress Sources in Driverly

| Source | Description | Optimization Potential |
|--------|-------------|----------------------|
| Database Queries | Data returned from PostgREST API calls | HIGH - 50+ `select('*')` calls |
| Storage Downloads | Profile photos, credential documents, vehicle photos | MEDIUM - Missing cacheControl |
| Auth | Session tokens, user profiles | LOW - Already minimal |
| Realtime | Subscription event payloads | LOW - Unused currently |

---

## Current State Assessment

### 1. Database Queries - CRITICAL

**Problem Areas Found:**

| Issue | Count | Impact |
|-------|-------|--------|
| `.select('*')` calls | 50+ | Returns all columns, ~2-3x data needed |
| `.select()` without params | 30+ | Same as `select('*')` |
| Insert/Update with `.select()` | 20+ | Returns full row when only ID needed |
| Queries without pagination | Most | Large result sets on list views |

**Files with Most Issues:**
- `src/services/brokers.ts` - 7 instances
- `src/services/onboarding.ts` - 6 instances
- `src/services/companies.ts` - 6 instances
- `src/services/featureFlags.ts` - 5 instances
- `src/services/vehicleAssignments.ts` - 4 instances
- `src/contexts/AuthContext.tsx` - 2 instances

**Good Patterns Already Used:**
- Count-only queries with `{ count: 'exact', head: true }` in billing.ts, companies.ts
- Specific column selection in credentials.ts, credentialTypes.ts

### 2. Storage Uploads - MEDIUM

**Current State:**
- No `cacheControl` headers on any uploads
- No image transformation enabled
- Bucket size limits properly configured (5-10MB)

**Files Affected:**
- `src/services/profile.ts:328` - Profile photos
- `src/services/credentials.ts:349` - Credential documents
- `src/services/driverVehicles.ts:297` - Vehicle photos
- `src/components/features/apply/LicensePhotoUpload.tsx:86`
- `src/components/features/driver/EditLicenseModal.tsx:100`

### 3. Query Caching - PARTIAL

**What's Working:**
- TanStack Query configured in `src/App.tsx`
- Query key factories in `src/lib/query-keys.ts`
- Feature flags service has 5-minute in-memory cache

**What's Missing:**
- No global default `staleTime` (queries refetch immediately)
- Most hooks don't specify caching configuration

### 4. Realtime Subscriptions - NOT ACTIVELY USED

Infrastructure exists in `src/hooks/useRealtime.tsx` but has issues:
- Race condition in cleanup
- Defaults to all events (`*`)
- Full refetch on any change

---

## Optimization Patterns Reference

### Pattern A: Specific Column Selection

**Before (BAD):**
```typescript
const { data } = await supabase
  .from('drivers')
  .select('*')
  .eq('company_id', companyId);
```

**After (GOOD):**
```typescript
const { data } = await supabase
  .from('drivers')
  .select('id, first_name, last_name, status, created_at')
  .eq('company_id', companyId);
```

### Pattern B: Insert/Update Without Return

**Before (BAD):**
```typescript
const { data, error } = await supabase
  .from('drivers')
  .update({ status: 'active' })
  .eq('id', driverId)
  .select()
  .single();
```

**After (GOOD):**
```typescript
// Only return what's needed
const { data, error } = await supabase
  .from('drivers')
  .update({ status: 'active' })
  .eq('id', driverId)
  .select('id, status')
  .single();

// Or don't return at all if not needed
const { error } = await supabase
  .from('drivers')
  .update({ status: 'active' })
  .eq('id', driverId);
```

### Pattern C: Pagination

```typescript
const PAGE_SIZE = 25;

const { data } = await supabase
  .from('drivers')
  .select('id, first_name, last_name, status')
  .eq('company_id', companyId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### Pattern D: Storage with cacheControl

**Before:**
```typescript
await supabase.storage
  .from('profile-photos')
  .upload(path, file, { upsert: true });
```

**After:**
```typescript
await supabase.storage
  .from('profile-photos')
  .upload(path, file, { 
    upsert: true,
    cacheControl: '3600' // 1 hour browser cache
  });
```

### Pattern E: QueryClient Default Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes default
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    },
  },
});
```

---

## File Reference by Service

### High Priority Files (50%+ of egress optimization)

| File | Issues | Columns to Select |
|------|--------|-------------------|
| `src/services/brokers.ts` | 7 `select('*')` | id, name, company_id, status, code, created_at |
| `src/services/onboarding.ts` | 6 instances | Varies by query - check each function |
| `src/services/companies.ts` | 6 instances | id, name, slug, created_at, plan_id |
| `src/services/featureFlags.ts` | 5 instances | id, key, default_enabled (for checks) |
| `src/services/vehicleAssignments.ts` | 4 instances | id, driver_id, vehicle_id, status, dates |

### Medium Priority Files

| File | Issues |
|------|--------|
| `src/services/credentialTypes.ts` | Mixed - some good, some `select()` |
| `src/services/profile.ts` | 2 `select('*')`, missing upload cacheControl |
| `src/services/billing.ts` | 3 instances |
| `src/services/applications.ts` | 4 instances |
| `src/services/drivers.ts` | 2 instances |
| `src/services/vehicles.ts` | 4 instances |

### Storage Files (cacheControl needed)

| File | Line | Bucket |
|------|------|--------|
| `src/services/profile.ts` | 328 | profile-photos |
| `src/services/credentials.ts` | 349 | credential-documents |
| `src/services/driverVehicles.ts` | 297 | vehicle-photos |
| `src/components/features/apply/LicensePhotoUpload.tsx` | 86 | credential-documents |
| `src/components/features/driver/EditLicenseModal.tsx` | 100 | credential-documents |

---

## Database Schema Quick Reference

For determining which columns to select, reference:

```
supabase/migrations/006_driver_vehicle_tables.sql   # drivers, vehicles
supabase/migrations/012_broker_management.sql       # brokers
supabase/migrations/001_core_tables.sql             # companies, users
supabase/migrations/026_feature_flags.sql           # feature_flags
supabase/migrations/027_billing_system.sql          # billing tables
```

---

## Testing Egress Changes

### Before Making Changes

1. Note current query response sizes using browser DevTools Network tab
2. Check Supabase Dashboard → Usage → Egress for baseline

### After Making Changes

1. Verify queries return expected data (no missing fields causing bugs)
2. Check Network tab for reduced payload sizes
3. Run existing functionality to ensure no regressions

### Smoke Test Checklist

- [ ] Admin can view driver list
- [ ] Admin can view/edit driver details
- [ ] Admin can view vehicle list
- [ ] Admin can view/edit vehicle details
- [ ] Broker management works
- [ ] Credential types load correctly
- [ ] Applications can be reviewed
- [ ] Profile photos display
- [ ] Credential documents display

---

## Related Documents

- `docs/02-DATABASE-SCHEMA.md` - Full schema reference
- `docs/features/platform/FF-001-feature-flags.md` - Feature flags spec
- `supabase/migrations/` - Migration files for column names

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial CODEX task created from egress audit | AI |
