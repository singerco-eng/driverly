# CODEX-043: LOCATIONS-001 Plan Amendments

> **Purpose:** Supplementary recommendations to address gaps identified in the implementation plan
> **Reference:** `docs/CODEX-043-LOCATIONS-001-company-locations.prompt.md`
> **Date:** 2026-02-03

---

## Critical Fixes

### 1. Story 1: Database Migration Additions

**Add to migration file:**

```sql
-- Enforce single primary location per company
CREATE OR REPLACE FUNCTION enforce_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE company_locations SET is_primary = false 
    WHERE company_id = NEW.company_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_primary_location
  BEFORE INSERT OR UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_primary_location();
```

**Add to task checklist:**
- [ ] Update `credential_type_templates.category` CHECK constraint (in addition to `credential_types`)

---

### 2. Story 2: Correct Type File References

**Replace this instruction:**
> Update `src/types/driverVehicle.ts` to add location_id to Driver and Vehicle

**With:**
> Update `src/types/driver.ts` to add `location_id` to Driver interface
> Update `src/types/vehicle.ts` to add `location_id` to Vehicle interface

**Add to `src/types/index.ts`:**
```typescript
// ============================================
// LOCATION
// ============================================
export type {
  Location,
  LocationStatus,
  LocationCredentialStatus,
  LocationWithStats,
  LocationCredential,
  LocationBrokerAssignment,
  CreateLocationData,
  UpdateLocationData,
} from './location';
```

---

### 3. Story 3: Credential Status Function Correction

The `computeLocationCredentialStatus()` function should use `displayStatus` pattern from credential service, not raw status values.

**Option A:** Ensure `getLocationCredentials()` in Story 4 returns credentials with computed `displayStatus` property (matching `getDriverCredentials()` pattern).

**Option B:** Adapt function to work with raw `status` field:
```typescript
// Use c.status instead of c.displayStatus
const expired = required.filter((c) => c.status === 'expired');
const missing = required.filter((c) => 
  ['not_submitted', 'rejected'].includes(c.status)
);
const pending = required.filter((c) => c.status === 'pending_review');
// Expiring requires date calculation against expires_at
```

---

## Missing Components to Add

### 4. Story 6: Credential Status Fetching Pattern

**Add this pattern to Locations.tsx (copy from Drivers.tsx lines 117-135):**

```tsx
import { useQueries } from '@tanstack/react-query';
import * as locationCredentialService from '@/services/locationCredentials';

// Inside component:
const credentialQueries = useQueries({
  queries: (locations || []).map((location) => ({
    queryKey: ['location-credentials', location.id],
    queryFn: () => locationCredentialService.getLocationCredentials(location.id),
    enabled: !!location.id,
  })),
});

// Combine locations with credential status
const locationsWithStatus = useMemo(() => {
  return (locations || []).map((location, index) => {
    const credentials = credentialQueries[index]?.data || [];
    const credentialStatus = computeLocationCredentialStatus(credentials);
    return { ...location, credentialStatus };
  });
}, [locations, credentialQueries]);
```

---

### 5. Story 7: Additional Components Required

**Create these files (not listed in original plan):**

| File | Purpose |
|------|---------|
| `src/components/features/admin/EditLocationModal.tsx` | Edit location form modal |
| `src/components/features/admin/AssignDriverToLocationModal.tsx` | Select driver to assign |
| `src/components/features/admin/AssignVehicleToLocationModal.tsx` | Select vehicle to assign |

**Pattern reference:** Copy from `EditDriverModal.tsx` and adapt.

---

### 6. Story 8: RadioGroup Not Select

**Correct the CreateCredentialTypeSimpleModal update:**

The current modal uses `RadioGroup`, not `Select`. Update to:

```tsx
<RadioGroup
  value={watch('category')}
  onValueChange={(value) => setValue('category', value as 'driver' | 'vehicle' | 'location')}
  className="flex flex-wrap gap-4"
>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="driver" id="cat-driver" />
    <Label htmlFor="cat-driver">Driver Credential</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="vehicle" id="cat-vehicle" />
    <Label htmlFor="cat-vehicle">Vehicle Credential</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="location" id="cat-location" />
    <Label htmlFor="cat-location">Location Credential</Label>
  </div>
</RadioGroup>
```

**Also update Zod schema:**
```typescript
category: z.enum(['driver', 'vehicle', 'location']),
```

---

## Query Key Standards

### 7. Story 5: Standardize Query Keys

Use these query keys for cache consistency:

```typescript
// Locations
['locations', companyId]           // List
['locations-with-stats', companyId] // List with counts
['location', locationId]           // Single

// Location relationships
['location-credentials', locationId]
['location-drivers', locationId]
['location-vehicles', locationId]
['location-brokers', locationId]
```

---

## Clarifications Needed

### 8. Story 4: Location Credential Review Workflow

Specify which scenario applies:

**Option A: Auto-Approve**
Location credentials are admin-submitted and auto-approved (no review queue).

**Option B: Include in Review**
Location credentials appear in `/admin/credentials` review queue alongside driver/vehicle credentials.

**Recommendation:** Option A (auto-approve) since admin is the submitter. Update `submitLocationCredential()` to set `status: 'approved'` directly.

---

### 9. Story 6: AdminLayout Sidebar Icon

**Add `MapPin` to imports in `AdminLayout.tsx`:**

```tsx
import {
  LayoutDashboard,
  Users,
  Car,
  Settings,
  LogOut,
  ChevronsUpDown,
  FileText,
  Building2,
  FileCheck2,
  CreditCard,
  MapPin,  // ADD THIS
} from 'lucide-react';
```

---

## Additional Verification Items

### 10. Add to Global Verification Checklist

```markdown
### Database Constraints
- [ ] `is_primary` trigger enforces single primary per company
- [ ] Cascading delete: location → location_credentials works
- [ ] SET NULL: location deleted → driver/vehicle.location_id = null

### UI Edge Cases
- [ ] Location selector shows "No locations" state when empty
- [ ] Create location modal validates unique name per company
- [ ] Credential type filter includes "Location" option
- [ ] Location credentials NOT visible in driver portal

### Performance
- [ ] Locations list page handles 50+ locations without lag
- [ ] Credential status computation uses parallel queries
```

---

## Implementation Notes

### Form Validation Schema (CreateLocationModal)

```typescript
import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().max(50).optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  is_primary: z.boolean().default(false),
});

export type CreateLocationFormData = z.infer<typeof createLocationSchema>;
```

---

## Suggested Story Split

Consider splitting Story 7 for better task isolation:

| Sub-Story | Components |
|-----------|------------|
| 7a | LocationDetail.tsx page shell + routing |
| 7b | LocationOverviewTab.tsx |
| 7c | LocationDriversTab.tsx + AssignDriverToLocationModal.tsx |
| 7d | LocationVehiclesTab.tsx + AssignVehicleToLocationModal.tsx |
| 7e | EditLocationModal.tsx |

---

## Reference Files Summary

When implementing, ensure these files are read first:

| Story | Must-Read Files |
|-------|-----------------|
| 1 | `supabase/migrations/012_broker_management.sql` |
| 2 | `src/types/driver.ts`, `src/types/vehicle.ts`, `src/types/credential.ts` |
| 3 | `src/services/brokers.ts`, `src/pages/admin/Drivers.tsx` (lines 24-62) |
| 5 | `src/hooks/useBrokers.ts`, `src/hooks/useDrivers.ts` |
| 6 | `src/pages/admin/Drivers.tsx` (full file) |
| 7 | `src/pages/admin/DriverDetail.tsx`, `src/components/ui/DetailPageHeader.tsx` |
| 8 | `src/components/features/admin/CreateCredentialTypeSimpleModal.tsx` |
