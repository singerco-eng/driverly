# TASK 014: Vehicle Details Page Bugs

## Status: ✅ FIXED

## Context

When an Admin views a vehicle detail page (e.g., `/admin/vehicles/{vehicleId}`), two issues existed:

1. **Credentials Tab**: Vehicle credentials don't appear (business logic + data issue)
2. **Assignments Tab**: W2 drivers don't load in the "Assign to Driver" modal (RLS issue)

**Reported URL**: `http://localhost:8082/admin/vehicles/ff22be16-58b4-4656-8bd8-b1f678de5331`

---

## ✅ All Fixes Applied

### Fix 1: Empty Array vs NULL in vehicle_types

**Root Cause**: The credential type creation form defaulted `vehicle_types` to `[]` (empty array), but the RPC function only checked for `NULL`. An empty array didn't match any vehicle types.

**Files Changed**:
- `src/services/credentialTypes.ts` - Now saves `NULL` instead of empty array when no vehicle types selected
- `scripts/fix-vehicle-credential-types.mjs` - Fixed existing data (updated `[]` to `NULL`)
- `supabase/migrations/018_fix_vehicle_credentials_rpc.sql` - RPC now handles empty arrays (pending apply)

### Fix 2: Admin View Shows ALL Vehicle Credential Types

**Root Cause**: Admin view used the driver-focused RPC which only returned "required" credentials based on broker assignments. Company-owned vehicles with no broker assignments showed nothing.

**Solution**: Created new admin-specific function `getVehicleCredentialsForAdmin` that:
1. Fetches ALL active vehicle credential types for the company
2. Merges with existing `vehicle_credentials` records
3. Creates placeholder display for types that have no record yet
4. Shows both global AND broker-scoped credentials regardless of vehicle ownership

**Files Changed**:
- `src/services/credentialReview.ts`:
  - Added `getVehicleCredentialsForAdmin()` function
  - Fixed Supabase embedding ambiguity by adding explicit foreign key hints (`!drivers_user_id_fkey`)
- `src/hooks/useCredentialReview.ts`:
  - Added `useVehicleCredentialsForAdmin()` hook

### Fix 3: VehicleCredentialsTab EnhancedDataView + DS Compliance

**Root Cause**: Component wasn't using `EnhancedDataView` and had no skeleton loader.

**Files Changed**:
- `src/components/features/admin/VehicleCredentialsTab.tsx`:
  - Complete rewrite using `EnhancedDataView`
  - Supports Cards and Table view modes
  - Search and status filter
  - Skeleton loaders during loading
  - Proper empty state messaging
  - Action buttons: View, Approve, Reject, Verify

### Fix 4: Supabase Embedding Ambiguity

**Root Cause**: Queries joining `drivers` to `users` failed with "Could not embed because more than one relationship was found for 'drivers' and 'users'".

**Solution**: Added explicit foreign key hints in select statements:
```typescript
.select('*, owner:drivers!owner_driver_id(*, user:users!drivers_user_id_fkey(id, full_name))')
```

---

## Database Audit Results

Using `scripts/debug-vehicle-issues.mjs`, the following was confirmed:

| Entity | Status | Details |
|--------|--------|---------|
| Vehicle | ✅ Exists | 2026 Ford Edge, company-owned (no owner driver) |
| W2 Driver | ✅ Exists | "Test Driver 2" (status: inactive) |
| 1099 Driver | ✅ Exists | "Corey Singer" (status: inactive) |
| Admin User | ✅ Exists | singerco@gmail.com (role: admin, company matches) |
| Vehicle Credential Types | ✅ 2 exist | "Vehicle Credential" (broker), "Global Vehicle" (global) |
| vehicle_credentials records | ✅ 1 exists | "Global Vehicle" with status: not_submitted |

---

## Verified Working

After fixes, the Credentials tab now shows:
1. **Vehicle Credential** (MTM broker-scoped) - "Pending Review" with View/Reject/Approve buttons
2. **Global Vehicle** (global scope) - "Pending Review" with View/Reject/Approve buttons

Both display correctly in Cards view with:
- Status badges
- Submission info
- Credential type info
- Action buttons based on status

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/services/credentialTypes.ts` | Save `NULL` instead of `[]` for empty vehicle_types |
| `src/services/credentialReview.ts` | Added `getVehicleCredentialsForAdmin()` with FK hints |
| `src/hooks/useCredentialReview.ts` | Added `useVehicleCredentialsForAdmin()` hook |
| `src/components/features/admin/VehicleCredentialsTab.tsx` | Full rewrite with EnhancedDataView |
| `scripts/fix-vehicle-credential-types.mjs` | One-time fix for existing data |
| `supabase/migrations/018_fix_vehicle_credentials_rpc.sql` | RPC fix for empty arrays (pending) |

---

## Testing Steps

### Test 1: View Vehicle Credentials
1. Log in as admin
2. Navigate to Vehicles > Select any vehicle
3. Click "Credentials" tab
4. ✅ Should see all vehicle credential types (global and broker-scoped)
5. ✅ Cards view should show status badges and action buttons
6. ✅ Table view toggle should work

### Test 2: Create New Credential Type
1. Go to Settings > Credential Types
2. Create new type: category=vehicle, scope=global
3. Navigate to any vehicle > Credentials tab
4. ✅ New credential type should appear

### Test 3: Assign W2 Driver
1. Log in as admin (not driver!)
2. Navigate to Vehicles > [company vehicle] > Assignments tab
3. Click "Assign to Driver" button
4. ✅ Should see W2 drivers listed

---

## Debug Script

Created `scripts/debug-vehicle-issues.mjs` to audit the database. Run with:

```bash
node scripts/debug-vehicle-issues.mjs
```

This script requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` to bypass RLS.

---

## Related Files

- `src/pages/admin/VehicleDetail.tsx` - Main vehicle detail page
- `src/components/features/admin/VehicleCredentialsTab.tsx` - Credentials tab component
- `src/components/features/admin/VehicleAssignmentsTab.tsx` - Assignments tab component
- `src/hooks/useCredentialReview.ts` - Credential review hooks
- `src/services/credentialReview.ts` - Credential review service
- `supabase/migrations/015_credential_submission.sql` - Original RPC functions
