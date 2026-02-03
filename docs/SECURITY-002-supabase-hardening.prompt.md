# SECURITY-002: Supabase Hardening

> **For AI Implementation**: This document contains user stories for hardening the Supabase database layer based on official Supabase RLS Performance guidelines.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| **This document** | User stories with acceptance criteria |
| [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) | Official reference |

---

## Current State Assessment

| Guideline | Status | Stories |
|-----------|--------|---------|
| Wrap `auth.uid()` in SELECT | 🔴 0/119 done | S1 |
| SECURITY DEFINER validation | 🟡 43 functions need audit | S2 |
| Client-side query filters | 🟢 Complete (all services audited) | S3 |
| Index coverage for RLS | 🟢 123 indexes (verify) | S4 |

---

## Implementation Order

1. **S1** - RLS Performance (CRITICAL - 20x query speedup)
2. **S2** - SECURITY DEFINER Audit (Security)
3. **S3** - Client-Side Filters (Performance)
4. **S4** - Index Coverage Audit (Verification)

---

## Story S1: RLS Query Performance Optimization

### User Story

**As a** platform operator  
**I want** all RLS policies to use cached auth function calls  
**So that** database queries are up to 20x faster at scale

### Background

From [Supabase documentation](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv):

> "Wrapping the function in SQL causes an `initPlan` to be run by the optimizer which allows it to 'cache' the results versus calling the function on each row."

**Benchmark on 100K rows:**
| Pattern | Query Time |
|---------|------------|
| `auth.uid() = user_id` | 179ms |
| `(SELECT auth.uid()) = user_id` | **9ms** |

### Current State

- **119 instances** of `auth.uid()` in RLS policies
- **0 instances** use the caching pattern `(SELECT auth.uid())`
- Affects all tables with user-scoped RLS

### Acceptance Criteria

- [ ] Create migration `supabase/migrations/031_rls_performance_optimization.sql`
- [ ] All `auth.uid()` calls wrapped in `(SELECT auth.uid())`
- [ ] All `auth.jwt()` calls wrapped in `(SELECT auth.jwt())`
- [ ] Policy names and TO roles preserved exactly
- [ ] Migration includes comments explaining the optimization
- [ ] No functional changes to policy logic

### Technical Requirements

**Pattern to find and replace:**

```sql
-- BEFORE (called per row - slow):
USING (user_id = auth.uid())
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))

-- AFTER (cached - fast):
USING (user_id = (SELECT auth.uid()))
USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = (SELECT auth.uid())))
```

**Migration structure:**

```sql
-- =============================================================================
-- Migration: 031_rls_performance_optimization.sql
-- Purpose: Wrap auth.uid() and auth.jwt() in SELECT for query optimizer caching
-- Reference: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
-- =============================================================================

-- Table: driver_credentials
-- Optimization: Wrap auth.uid() in SELECT for caching
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name
  FOR operation
  TO authenticated
  USING (... (SELECT auth.uid()) ...);
```

### Files to Read

To find all current RLS policies, read these migrations:
- `supabase/migrations/001_core_tables.sql`
- `supabase/migrations/004_fix_rls_jwt_claims.sql`
- `supabase/migrations/006_driver_vehicle_tables.sql`
- `supabase/migrations/007_driver_applications.sql`
- `supabase/migrations/009_credential_storage_bucket.sql`
- `supabase/migrations/011_credential_types.sql`
- `supabase/migrations/012_broker_management.sql`
- `supabase/migrations/013_vehicle_assignment.sql`
- `supabase/migrations/014_driver_onboarding.sql`
- `supabase/migrations/015_credential_submission.sql`
- `supabase/migrations/016_driver_profile.sql`
- `supabase/migrations/017_driver_vehicle_management.sql`
- `supabase/migrations/019_fix_driver_vehicle_rls.sql`
- `supabase/migrations/020_fix_driver_credential_insert.sql`
- `supabase/migrations/021_broker_assignment_settings.sql`
- `supabase/migrations/023_credential_progress.sql`

### Verification

After applying, test with:

```sql
-- In Supabase SQL Editor
SET session role authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"test-user-uuid", "app_metadata": {"role": "driver", "company_id": "test-company-uuid"}}';

EXPLAIN ANALYZE SELECT * FROM driver_credentials LIMIT 10;

SET session role postgres;
```

Look for `InitPlan` in the output - this indicates caching is working.

---

## Story S2: SECURITY DEFINER Function Audit

### User Story

**As a** platform operator  
**I want** all SECURITY DEFINER functions to validate caller permissions  
**So that** elevated-privilege functions cannot be exploited

### Background

SECURITY DEFINER functions bypass RLS and run with the function owner's privileges. If they don't validate the caller, anyone can invoke them.

### Current State

**43 SECURITY DEFINER functions** across migrations. Key functions to audit:

| Function | Purpose | Risk if Unvalidated |
|----------|---------|---------------------|
| `ensure_driver_credential` | Creates credential record for driver | Could create records for other drivers |
| `admin_ensure_driver_credential` | Admin creates credential | Could be called by non-admins |
| `ensure_vehicle_credential` | Creates vehicle credential | Could create for unowned vehicles |
| `admin_ensure_vehicle_credential` | Admin creates vehicle credential | Could be called by non-admins |
| `get_driver_required_credentials` | Lists required credentials | Data exposure if wrong driver_id |
| `get_vehicle_required_credentials` | Lists required credentials | Data exposure if wrong vehicle_id |

### Acceptance Criteria

- [ ] Audit all 43 SECURITY DEFINER functions
- [ ] Document which functions have caller validation
- [ ] Document which functions are missing validation
- [ ] Create migration `supabase/migrations/032_security_definer_hardening.sql` for any fixes needed
- [ ] Functions with `admin_` prefix must verify caller has admin/super_admin role
- [ ] Functions operating on driver data must verify caller is the driver or admin
- [ ] Functions operating on vehicle data must verify caller owns/assigned or is admin

### Technical Requirements

**Validation patterns to add where missing:**

```sql
-- Admin role check
IF NOT (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')) THEN
  RAISE EXCEPTION 'Unauthorized: admin role required';
END IF;

-- Driver ownership check
IF NOT EXISTS (
  SELECT 1 FROM drivers 
  WHERE id = p_driver_id 
  AND user_id = (SELECT auth.uid())
) AND NOT (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'coordinator')) THEN
  RAISE EXCEPTION 'Unauthorized: not your driver record';
END IF;

-- Company scope check
IF NOT (
  (SELECT auth.jwt()) -> 'app_metadata' ->> 'company_id' = p_company_id::text
  OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin'
) THEN
  RAISE EXCEPTION 'Unauthorized: wrong company';
END IF;
```

### Files to Read

- `supabase/migrations/010_auto_create_user_profile.sql`
- `supabase/migrations/012_broker_management.sql`
- `supabase/migrations/013_vehicle_assignment.sql`
- `supabase/migrations/014_driver_onboarding.sql`
- `supabase/migrations/015_credential_submission.sql`
- `supabase/migrations/016_driver_profile.sql`
- `supabase/migrations/017_driver_vehicle_management.sql`
- `supabase/migrations/018_fix_vehicle_credentials_rpc.sql`
- `supabase/migrations/019_fix_driver_vehicle_rls.sql`
- `supabase/migrations/020_fix_driver_credential_insert.sql`
- `supabase/migrations/021_broker_assignment_settings.sql`
- `supabase/migrations/024_admin_ensure_driver_credential.sql`
- `supabase/migrations/024_credential_type_refactor.sql`
- `supabase/migrations/025_admin_ensure_vehicle_credential.sql`
- `supabase/migrations/027_billing_system.sql`
- `supabase/migrations/029_fix_resubmission_history.sql`
- `supabase/migrations/030_credential_publishing.sql`

### Deliverable Format

Create a report section at the top of the migration file:

```sql
-- =============================================================================
-- Migration: 032_security_definer_hardening.sql
-- Purpose: Add caller validation to SECURITY DEFINER functions
-- =============================================================================

-- AUDIT RESULTS:
-- ✅ SAFE: function_name - has role check on line X
-- ✅ SAFE: function_name - read-only, no security risk
-- ⚠️ FIXED: function_name - added admin role check
-- ⚠️ FIXED: function_name - added driver ownership check
```

---

## Story S3: Add Client-Side Query Filters

### User Story

**As a** platform operator  
**I want** all Supabase queries to include explicit filters alongside RLS  
**So that** the database can use indexes before evaluating RLS policies

### Background

From [Supabase documentation](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv):

> "Do not rely on RLS for filtering but only for security. Add a filter in addition to the RLS."

RLS evaluates every row. Adding `.eq('company_id', companyId)` lets Postgres use indexes FIRST, then RLS only checks the filtered rows.

### Current State

- **64 queries** already have explicit filters ✓
- **~40 queries** rely solely on RLS for filtering

### Acceptance Criteria

- [x] Audit all queries in `src/services/*.ts`
- [x] Add `.eq()` filters where data is scoped to company/driver/user
- [x] Do NOT add filters to:
  - Queries with specific ID lookups (`.eq('id', id)`)
  - Super admin queries that need all data
  - RPC function calls (filtering happens in function)
- [x] No functional changes - filters should match what RLS allows

### Completion Summary

- Added explicit company filters to list queries that previously relied on RLS
- Preserved ID-only lookups, super admin queries, and RPC calls unchanged
- Kept existing ordering, pagination, and selection shapes to avoid behavior changes

### Updated Services

- `src/services/credentials.ts`
- `src/services/credentialTypes.ts`
- `src/services/credentialReview.ts`
- `src/services/drivers.ts`
- `src/services/vehicles.ts`
- `src/services/applications.ts`
- `src/services/vehicleAssignments.ts`
- `src/services/invitations.ts`

### Technical Requirements

**Pattern to apply:**

```typescript
// BEFORE (relies only on RLS):
const { data } = await supabase
  .from('credential_types')
  .select('*')
  .order('display_order');

// AFTER (explicit filter + RLS):
const { data } = await supabase
  .from('credential_types')
  .select('*')
  .eq('company_id', companyId)  // Added: helps index usage
  .order('display_order');
```

**Files to update:**
- `src/services/credentials.ts`
- `src/services/credentialTypes.ts`
- `src/services/drivers.ts`
- `src/services/vehicles.ts`
- `src/services/brokers.ts`
- `src/services/applications.ts`
- `src/services/vehicleAssignments.ts`
- `src/services/driverVehicles.ts`
- `src/services/credentialReview.ts`
- `src/services/onboarding.ts`
- `src/services/profile.ts`
- `src/services/invitations.ts`

### Skip These Patterns

```typescript
// Already has specific filter - SKIP
.from('drivers').select().eq('id', driverId)

// RPC call handles filtering - SKIP
.rpc('get_driver_required_credentials', { p_driver_id: driverId })

// Super admin needs all data - SKIP (in super-admin only functions)
.from('companies').select('*')
```

---

## Story S4: Index Coverage Audit

### User Story

**As a** platform operator  
**I want** all columns used in RLS policies to be indexed  
**So that** RLS checks are fast even on large tables

### Background

From [Supabase documentation](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv):

> "Add indexes on columns used in RLS that are not primary keys or unique already. Improvement seen over 100x on large tables."

### Current State

- **123 indexes** currently exist
- Need to verify coverage for all RLS-used columns

### Acceptance Criteria

- [ ] List all columns used in RLS USING/WITH CHECK clauses
- [ ] Cross-reference against existing indexes
- [ ] Create migration `supabase/migrations/033_rls_index_coverage.sql` for any missing indexes
- [ ] Only add indexes for columns that don't already have one
- [ ] Exclude primary keys and unique columns (already indexed)

### Technical Requirements

**Columns commonly used in RLS that need indexes:**

| Column | Tables | Should Have Index |
|--------|--------|-------------------|
| `user_id` | drivers, users, notification_preferences | Yes |
| `company_id` | Most tables | Yes |
| `driver_id` | driver_credentials, assignments, etc. | Yes |
| `vehicle_id` | vehicle_credentials, assignments | Yes |
| `credential_type_id` | driver_credentials, vehicle_credentials | Yes |
| `broker_id` | credential_types, assignments | Yes |

**Index naming convention:**
```sql
CREATE INDEX IF NOT EXISTS idx_tablename_columnname ON tablename(columnname);
```

### Files to Read

Read all migration files to:
1. Find all `CREATE POLICY` statements
2. Extract columns from `USING` and `WITH CHECK` clauses
3. Find all existing `CREATE INDEX` statements
4. Identify gaps

---

## Progress Tracker

Use this to track completion:

- [ ] **S1**: RLS Performance Optimization (migration 031)
- [ ] **S2**: SECURITY DEFINER Audit (migration 032)
- [x] **S3**: Client-Side Query Filters (service updates)
- [ ] **S4**: Index Coverage Audit (migration 033)

---

## Testing Checklist

After all stories complete:

### Performance Test
```sql
-- Compare query times before/after
EXPLAIN ANALYZE SELECT * FROM driver_credentials WHERE driver_id = 'uuid';
```

### Security Test
```sql
-- Try calling admin functions as non-admin (should fail)
SET session role authenticated;
SET request.jwt.claims TO '{"role":"authenticated", "sub":"driver-uuid", "app_metadata": {"role": "driver"}}';

SELECT admin_ensure_driver_credential('other-driver-id', 'cred-type-id', 'company-id');
-- Should raise: "Unauthorized: admin role required"
```

### Functional Test
- [ ] Login as driver - can view own credentials
- [ ] Login as admin - can view company credentials
- [ ] Login as driver - cannot view other driver's data
- [ ] Super admin - can view all companies
