# CODEX-043: LOCATIONS-001 Company Locations - Implementation Prompts

> **Each user story below is a self-contained task that can be completed by an individual agent.**
> **Reference the context document:** `docs/CODEX-043-LOCATIONS-001-company-locations.md`

---

## Prerequisites

Before starting any task:
1. Read the context document: `docs/CODEX-043-LOCATIONS-001-company-locations.md`
2. Understand the existing patterns in similar files (brokers, drivers, vehicles)
3. Check the database schema in `supabase/migrations/` for reference patterns

---

## User Story 1: Database Migration - Company Locations Schema

### Context
Create the database schema for company locations, location credentials, and location-broker assignments.

### Required Reading
```
docs/CODEX-043-LOCATIONS-001-company-locations.md    # Full context
supabase/migrations/011_credential_types.sql          # Credential pattern reference
supabase/migrations/006_driver_vehicle_tables.sql     # Entity pattern reference
supabase/migrations/012_broker_management.sql         # Broker pattern reference
```

### Task
1. Create `supabase/migrations/033_company_locations.sql`
2. Include all tables, indexes, RLS policies, and triggers as specified in the context document
3. Follow the existing migration patterns exactly

### Tables to Create
1. `company_locations` - Core location entity
2. `location_credentials` - Credential instances for locations
3. `location_broker_assignments` - Many-to-many location ↔ broker

### Schema Modifications
1. Add `location_id` column to `drivers` table (nullable FK)
2. Add `location_id` column to `vehicles` table (nullable FK)
3. Update `credential_types.category` CHECK constraint to include 'location'
4. Update `credential_type_templates.category` CHECK constraint to include 'location'

### Location Status Values
Use 3 statuses matching the driver/vehicle pattern:
```sql
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'))
```
- `active` - Operational, can receive assignments
- `inactive` - Temporarily closed, no new assignments  
- `archived` - Permanently closed (soft delete)

### Single Primary Location Enforcement

**Add this trigger to enforce only one primary location per company:**

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

### Key Considerations
- All FKs should use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- Location deletion should CASCADE to location_credentials
- Driver/vehicle location_id should SET NULL on location deletion
- Follow existing RLS patterns (super_admin full access, admin company-scoped, etc.)
- Location credentials are admin-only (no driver access policies)

### Verification
- [ ] Migration applies without errors
- [ ] All tables created with correct columns
- [ ] All indexes created
- [ ] All RLS policies in place
- [ ] Triggers for updated_at created
- [ ] **is_primary trigger enforces single primary per company**
- [ ] Can insert/query locations
- [ ] Can insert/query location_credentials
- [ ] Existing driver/vehicle queries still work
- [ ] Cascading delete: location → location_credentials works
- [ ] SET NULL: location deleted → driver/vehicle.location_id = null

---

## User Story 2: TypeScript Types - Location Types

### Context
Create TypeScript type definitions for locations and location credentials.

### Required Reading
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/types/credential.ts              # Credential type patterns
src/types/driverVehicle.ts           # Entity type patterns
src/types/broker.ts                  # Broker type patterns
src/types/vehicle.ts                 # VehicleStatus pattern
src/lib/status-configs.ts            # ⭐ Status config patterns - MUST ADD locationStatusConfig
```

### Task
1. Create `src/types/location.ts` with all location-related types
2. Update `src/types/credential.ts` to add 'location' to CredentialCategory
3. Update `src/types/driver.ts` to add `location_id` to Driver interface
4. Update `src/types/vehicle.ts` to add `location_id` to Vehicle interface
5. Update `src/lib/status-configs.ts` to add `locationStatusConfig`
6. Update `src/types/index.ts` to export location types

### Types to Create in `location.ts`
```typescript
export type LocationStatus = 'active' | 'inactive' | 'archived';

export interface Location {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  status: LocationStatus;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Credential compliance status - MUST MATCH driver pattern from Drivers.tsx
export type LocationCredentialStatus = {
  status: 'valid' | 'expiring' | 'expired' | 'missing' | 'grace_period' | 'pending';
  missing: number;
  total: number;
};

export interface LocationWithStats extends Location {
  driver_count: number;
  vehicle_count: number;
  credentialStatus?: LocationCredentialStatus;
}

export interface LocationCredential { ... }
export interface LocationBrokerAssignment { ... }
export interface CreateLocationData { ... }
export interface UpdateLocationData { ... }
```

### Status Config to Add (in `src/lib/status-configs.ts`)

**Copy the exact pattern from vehicleStatusConfig (lines 58-78):**

```typescript
// Add import at top
import type { LocationStatus } from '@/types/location';

// Add after vehicleStatusConfig (around line 78)
export type LocationStatusConfigEntry = {
  label: string;
  variant: BadgeVariant;
};

export type LocationStatusConfig = Record<LocationStatus, LocationStatusConfigEntry>;

export const locationStatusConfig: LocationStatusConfig = {
  active: {
    label: 'Active',
    variant: 'default',
  },
  inactive: {
    label: 'Inactive',
    variant: 'secondary',
  },
  archived: {
    label: 'Archived',
    variant: 'outline',
  },
};
```

### Types to Update
```typescript
// src/types/credential.ts
export type CredentialCategory = 'driver' | 'vehicle' | 'location';

// src/types/driver.ts - Add to Driver interface
export interface Driver {
  // ... existing fields
  location_id: string | null;
  location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}

// src/types/vehicle.ts - Add to Vehicle interface
export interface Vehicle {
  // ... existing fields
  location_id: string | null;
  location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}
```

### Add to `src/types/index.ts`

**Find the appropriate section and add:**
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

### Verification
- [ ] No TypeScript errors in type files
- [ ] Types match database schema exactly
- [ ] LocationStatus type has 3 values: active, inactive, archived
- [ ] LocationCredentialStatus matches driver pattern (valid, expiring, expired, missing, grace_period, pending)
- [ ] locationStatusConfig added to status-configs.ts
- [ ] Exports work from index.ts
- [ ] CredentialCategory includes 'location'

---

## User Story 3: Service Layer - Locations Service

### Context
Create the service layer for location CRUD operations.

### Required Reading
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/services/brokers.ts              # Service pattern reference
src/services/companies.ts            # Company service reference
src/types/location.ts                # Types created in Story 2
src/pages/admin/Drivers.tsx          # ⭐ computeGlobalCredentialStatus function (lines 24-62) - COPY THIS PATTERN
```

### Task
1. Create `src/services/locations.ts`
2. Implement all CRUD operations following existing patterns
3. Include `computeLocationCredentialStatus()` function (copy from Drivers.tsx)
4. Include proper error handling and TypeScript types

### Functions to Implement
```typescript
// Core CRUD
export async function getLocations(companyId: string): Promise<Location[]>
export async function getLocationById(id: string): Promise<Location | null>
export async function createLocation(companyId: string, data: CreateLocationData): Promise<Location>
export async function updateLocation(id: string, data: UpdateLocationData): Promise<Location>
export async function deleteLocation(id: string): Promise<void>

// With stats (for list view)
export async function getLocationsWithStats(companyId: string): Promise<LocationWithStats[]>

// Related entities
export async function getLocationDrivers(locationId: string): Promise<Driver[]>
export async function getLocationVehicles(locationId: string): Promise<Vehicle[]>

// Broker associations
export async function getLocationBrokers(locationId: string): Promise<LocationBrokerAssignment[]>
export async function assignBrokerToLocation(locationId: string, brokerId: string, companyId: string): Promise<void>
export async function removeBrokerFromLocation(locationId: string, brokerId: string): Promise<void>

// Assignment helpers
export async function assignDriverToLocation(driverId: string, locationId: string | null): Promise<void>
export async function assignVehicleToLocation(vehicleId: string, locationId: string | null): Promise<void>
```

### Credential Status Computation - COPY FROM Drivers.tsx (lines 24-62)

```typescript
import type { LocationCredentialStatus } from '@/types/location';

// Compute credential compliance status for a location
// Priority: expired > expiring > missing > grace_period > pending > valid
export function computeLocationCredentialStatus(
  credentials: LocationCredential[]
): LocationCredentialStatus {
  const required = credentials.filter(
    (c) =>
      c.credentialType &&
      c.credentialType.requirement === 'required' &&
      c.credentialType.scope === 'global',
  );
  
  if (required.length === 0) {
    return { status: 'valid', missing: 0, total: 0 };
  }

  const expired = required.filter((c) => c.status === 'expired');
  const expiring = required.filter((c) => {
    // Check if expiring within warning period
    if (!c.expires_at || !c.credentialType?.expiration_warning_days) return false;
    const daysUntil = Math.ceil(
      (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return c.status === 'approved' && daysUntil <= c.credentialType.expiration_warning_days;
  });
  const missing = required.filter((c) => 
    ['not_submitted', 'rejected'].includes(c.status)
  );
  const gracePeriod = required.filter((c) => 
    c.grace_period_ends && new Date(c.grace_period_ends) > new Date() && c.status === 'not_submitted'
  );
  const pending = required.filter((c) => c.status === 'pending_review');

  if (expired.length > 0) {
    return { status: 'expired', missing: expired.length, total: required.length };
  }
  if (expiring.length > 0) {
    return { status: 'expiring', missing: 0, total: required.length };
  }
  if (missing.length > 0) {
    return { status: 'missing', missing: missing.length, total: required.length };
  }
  if (gracePeriod.length > 0) {
    return { status: 'grace_period', missing: gracePeriod.length, total: required.length };
  }
  if (pending.length > 0) {
    return { status: 'pending', missing: 0, total: required.length };
  }
  return { status: 'valid', missing: 0, total: required.length };
}
```

### Implementation Notes
- Use specific column selections (not `select('*')`) per CODEX-042 optimization patterns
- Follow error handling patterns from brokers.ts
- Include proper typing on all returns

### Verification
- [ ] All functions implemented
- [ ] TypeScript compiles without errors
- [ ] Can fetch locations
- [ ] Can create/update/delete locations
- [ ] Stats query returns correct counts
- [ ] `computeLocationCredentialStatus()` returns correct status values

---

## User Story 4: Service Layer - Location Credentials Service

### Context
Create the service layer for location credential operations (admin-only).

### Required Reading
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/services/credentials.ts          # Credential service patterns
src/services/credentialReview.ts     # Review patterns
src/types/location.ts                # Location types
```

### Task
1. Create `src/services/locationCredentials.ts`
2. Implement credential submission and retrieval for locations
3. Update `src/services/credentialReview.ts` to include location credentials

### Functions to Implement in `locationCredentials.ts`
```typescript
// Get credentials for a location
export async function getLocationCredentials(locationId: string): Promise<LocationCredential[]>

// Get single credential with type info
export async function getLocationCredential(id: string): Promise<LocationCredential | null>

// Submit/update credential (admin only)
export async function submitLocationCredential(
  locationId: string,
  credentialTypeId: string,
  companyId: string,
  data: {
    document_url?: string;
    document_urls?: string[];
    form_data?: Record<string, unknown>;
    entered_date?: string;
    driver_expiration_date?: string;
    notes?: string;
  }
): Promise<LocationCredential>

// Get credentials pending review
export async function getLocationCredentialsPendingReview(companyId: string): Promise<LocationCredential[]>
```

### Admin-Submitted Credential Workflow

**Important:** Location credentials are admin-submitted. Use auto-approve workflow:

```typescript
export async function submitLocationCredential(
  locationId: string,
  credentialTypeId: string,
  companyId: string,
  data: { ... }
): Promise<LocationCredential> {
  // Auto-approve since admin is the submitter
  const { data: credential, error } = await supabase
    .from('location_credentials')
    .upsert({
      location_id: locationId,
      credential_type_id: credentialTypeId,
      company_id: companyId,
      status: 'approved',  // Auto-approve
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      ...data,
    })
    .select()
    .single();
    
  // ...
}
```

### Updates to `credentialReview.ts`
- Location credentials do NOT appear in review queue (auto-approved)
- Update any aggregate stats to exclude or separate location credentials

### Verification
- [ ] Can fetch location credentials
- [ ] Can submit location credential (auto-approves)
- [ ] Can update location credential
- [ ] Location credentials do NOT appear in review queue
- [ ] TypeScript compiles without errors

---

## User Story 5: React Hooks - Location Hooks

### Context
Create React Query hooks for location data fetching and mutations.

### Required Reading
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/hooks/useBrokers.ts              # Hook pattern reference
src/hooks/useDrivers.ts              # Hook pattern reference
src/services/locations.ts            # Service from Story 3
src/services/locationCredentials.ts  # Service from Story 4
```

### Task
1. Create `src/hooks/useLocations.ts`
2. Create `src/hooks/useLocationCredentials.ts`
3. Follow existing hook patterns with React Query

### Hooks to Implement in `useLocations.ts`
```typescript
export function useLocations(companyId: string)
export function useLocationsWithStats(companyId: string)
export function useLocation(id: string)
export function useLocationDrivers(locationId: string)
export function useLocationVehicles(locationId: string)
export function useLocationBrokers(locationId: string)
export function useCreateLocation()
export function useUpdateLocation()
export function useDeleteLocation()
export function useAssignDriverToLocation()
export function useAssignVehicleToLocation()
export function useAssignBrokerToLocation()
export function useRemoveBrokerFromLocation()
```

### Hooks to Implement in `useLocationCredentials.ts`
```typescript
export function useLocationCredentials(locationId: string)
export function useLocationCredential(id: string)
export function useSubmitLocationCredential()
export function useUpdateLocationCredential()
```

### Query Key Standards

Use these query keys for cache consistency:

```typescript
// Locations
['locations', companyId]              // List
['locations-with-stats', companyId]   // List with counts
['location', locationId]              // Single

// Location relationships
['location-credentials', locationId]
['location-drivers', locationId]
['location-vehicles', locationId]
['location-brokers', locationId]
```

### Implementation Notes
- Use the query keys above for cache invalidation
- Mutations should invalidate relevant queries (e.g., `useCreateLocation` invalidates `['locations', companyId]`)
- Follow the same loading/error patterns as existing hooks

### Verification
- [ ] All hooks implemented
- [ ] TypeScript compiles without errors
- [ ] Hooks return correct types
- [ ] Mutations invalidate appropriate caches using standard query keys

---

## User Story 6: Admin UI - Locations List Page

### Context
Create the locations list page in the admin portal. **CRITICAL: Copy the exact patterns from the Drivers page.**

### Required Reading - MUST READ BEFORE IMPLEMENTING
```
docs/CODEX-043-LOCATIONS-001-company-locations.md    # Feature context
src/pages/admin/Drivers.tsx                           # ⭐ PRIMARY PATTERN - Copy this structure exactly
src/components/features/admin/DriverCard.tsx          # ⭐ Card pattern to copy
src/components/ui/filter-bar.tsx                      # FilterBar component API
src/components/layouts/AdminLayout.tsx                # Where to add sidebar item
src/lib/status-configs.ts                             # ⭐ Status badge configs - use locationStatusConfig
```

### Task
1. **Read `src/pages/admin/Drivers.tsx` first** - This is your template
2. Create `src/pages/admin/Locations.tsx` by adapting the Drivers.tsx pattern
3. Create `src/components/features/admin/LocationCard.tsx` by adapting DriverCard.tsx
4. Create `src/components/features/admin/CreateLocationModal.tsx`
5. Add route to `src/App.tsx` (find where `/admin/drivers` is defined)
6. Add "Locations" to admin sidebar in `src/components/layouts/AdminLayout.tsx`

### Exact Patterns to Copy from Drivers.tsx

**Page Structure (copy exactly):**
```tsx
// Same imports pattern
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, ... } from '@/components/ui/table';
import { FilterBar } from '@/components/ui/filter-bar';
// etc.

// Same page layout:
<div className="min-h-screen bg-background">
  <Tabs defaultValue="table">
    {/* Full-width header - COPY THIS STRUCTURE */}
    <div className="border-b bg-background">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: title */}
          {/* Center: view toggle */}
          {/* Right: action button */}
        </div>
      </div>
    </div>

    {/* Content area - COPY THIS STRUCTURE */}
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <FilterBar ... />
        <TabsContent value="table">...</TabsContent>
        <TabsContent value="cards">...</TabsContent>
      </div>
    </div>
  </Tabs>
</div>
```

**FilterBar Usage (from Drivers.tsx lines 218-250):**
```tsx
<FilterBar
  searchValue={filters.search || ''}
  onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
  searchPlaceholder="Search by name or code..."
  filters={[
    {
      value: statusFilter,
      onValueChange: (value) => setFilters((prev) => ({ ...prev, status: value })),
      label: 'Status',
      placeholder: 'All Status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ]}
/>
```

**Table Structure (adapt from Drivers.tsx lines 254-341):**
- Same `EnhancedTable` wrapper with `loading` and `skeletonRows` props
- Same empty state pattern with icon and message
- Same row click navigation pattern

**Card Grid (from Drivers.tsx lines 345-366):**
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {locationsWithStats.map((location) => (
    <LocationCard key={location.id} location={location} onAction={handleCardAction} />
  ))}
</div>
```

### LocationCard.tsx - Copy from DriverCard.tsx

**File to copy:** `src/components/features/admin/DriverCard.tsx`

**Adapt these sections:**
1. **Status badge** (lines 116-119) - use locationStatusConfig
2. **Dropdown menu** (lines 121-142) - adapt actions for locations
3. **Avatar section** (lines 146-177) - replace with building icon or location initial
4. **Metadata section** (lines 180-249) - show:
   - Address (city, state)
   - Driver count
   - Vehicle count
   - Credential status (same pattern as driver credential status)
5. **View button** (lines 256-259) - same pattern

**Status Badge Usage (use locationStatusConfig from status-configs.ts):**
```tsx
import { locationStatusConfig, credentialStatusConfig } from '@/lib/status-configs';

// Location operational status badge
<Badge variant={locationStatusConfig[location.status].variant}>
  {locationStatusConfig[location.status].label}
</Badge>

// Primary badge (if applicable)
{location.is_primary && (
  <Badge variant="outline">Primary</Badge>
)}
```

**Credential Compliance Status Display (copy from DriverCard lines 182-220):**
```tsx
{/* Credential Status - COPY THIS PATTERN EXACTLY */}
{location.credentialStatus && location.credentialStatus.total > 0 && (
  <div className={`flex items-center gap-2 ${
    location.credentialStatus.status === 'valid' ? 'text-primary' :
    location.credentialStatus.status === 'expired' || location.credentialStatus.status === 'missing' ? 'text-destructive' :
    location.credentialStatus.status === 'expiring' || location.credentialStatus.status === 'grace_period' ? 'text-amber-600 dark:text-amber-500' :
    'text-muted-foreground'
  }`}>
    {location.credentialStatus.status === 'valid' ? (
      <>
        <FileCheck className="h-4 w-4 flex-shrink-0" />
        <span>Credentials complete</span>
      </>
    ) : location.credentialStatus.status === 'expiring' ? (
      <>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>Credentials expiring</span>
      </>
    ) : location.credentialStatus.status === 'expired' ? (
      <>
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span>{location.credentialStatus.missing} credentials expired</span>
      </>
    ) : location.credentialStatus.status === 'missing' ? (
      <>
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span>{location.credentialStatus.missing} credentials missing</span>
      </>
    ) : location.credentialStatus.status === 'pending' ? (
      <>
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>Credentials pending review</span>
      </>
    ) : null}
  </div>
)}
```

**Card structure to preserve:**
```tsx
<Card className="h-full flex flex-col hover:shadow-soft transition-all">
  <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
    {/* Header row with badge and actions */}
    {/* Center content with icon/name */}
    {/* Metadata Section */}
    {/* Spacer */}
    {/* View Button */}
  </CardContent>
</Card>
```

### Credential Status Fetching Pattern

**Add this pattern to Locations.tsx (copy from Drivers.tsx lines 117-135):**

```tsx
import { useQueries } from '@tanstack/react-query';
import * as locationCredentialService from '@/services/locationCredentials';
import { computeLocationCredentialStatus } from '@/services/locations';

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

### Sidebar Addition (AdminLayout.tsx)

**First, add `MapPin` to imports:**
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

**Then find the navItems section (around line 54-62):**
```tsx
const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/applications', label: 'Applicants', icon: FileText },
  { path: '/admin/drivers', label: 'Drivers', icon: Users },
  { path: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { path: '/admin/locations', label: 'Locations', icon: MapPin },  // ADD THIS
  { path: '/admin/brokers', label: 'Trip Sources', icon: Building2 },
  ...
];
```

### CreateLocationModal Form Schema

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
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  is_primary: z.boolean().default(false),
});

export type CreateLocationFormData = z.infer<typeof createLocationSchema>;
```

### Verification
- [ ] Page loads at /admin/locations
- [ ] Sidebar shows Locations link (between Vehicles and Trip Sources)
- [ ] Header matches Drivers page layout exactly
- [ ] Table/Cards toggle works
- [ ] FilterBar search and status filter work
- [ ] Location cards display correctly with same card structure as DriverCard
- [ ] Empty state matches Drivers page
- [ ] Create modal works
- [ ] Click card navigates to /admin/locations/:id

---

## User Story 7: Admin UI - Location Detail Page

### Context
Create the location detail page with tabbed interface. **CRITICAL: Copy the exact patterns from DriverDetail.tsx.**

### Required Reading - MUST READ BEFORE IMPLEMENTING
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/pages/admin/DriverDetail.tsx                      # ⭐ PRIMARY PATTERN - Copy this structure exactly
src/components/ui/DetailPageHeader.tsx                # ⭐ Header component to use
src/components/features/admin/DriverOverviewTab.tsx   # ⭐ Overview tab pattern
src/components/features/admin/DriverVehiclesTab.tsx   # Tab with entity list pattern
```

### Task
1. **Read `src/pages/admin/DriverDetail.tsx` first** - This is your template
2. Create `src/pages/admin/LocationDetail.tsx` by adapting DriverDetail.tsx
3. Create `src/components/features/admin/LocationOverviewTab.tsx` by adapting DriverOverviewTab.tsx
4. Create `src/components/features/admin/LocationDriversTab.tsx`
5. Create `src/components/features/admin/LocationVehiclesTab.tsx`
6. Create `src/components/features/admin/EditLocationModal.tsx` (copy from `EditDriverModal.tsx`)
7. Create `src/components/features/admin/AssignDriverToLocationModal.tsx`
8. Create `src/components/features/admin/AssignVehicleToLocationModal.tsx`
9. Add route to `src/App.tsx`: `/admin/locations/:id`

### Additional Components Required

| File | Purpose | Copy From |
|------|---------|-----------|
| `EditLocationModal.tsx` | Edit location form modal | `EditDriverModal.tsx` |
| `AssignDriverToLocationModal.tsx` | Select driver to assign | Selection modal pattern |
| `AssignVehicleToLocationModal.tsx` | Select vehicle to assign | Selection modal pattern |

### Exact Patterns to Copy from DriverDetail.tsx

**Page Structure (lines 203-258):**
```tsx
<div className="min-h-screen bg-background">
  <Tabs defaultValue="overview">
    {/* Full-width header with centered tabs */}
    <DetailPageHeader
      title={location.name}
      subtitle={`${location.city}, ${location.state} • ${location.code || 'No code'}`}
      badges={badges}
      avatar={avatar}  // Use Building icon or location initial
      onBack={() => navigate('/admin/locations')}
      backLabel="Back to Locations"
      centerContent={tabsList}
      actions={actions}
    />

    {/* Content area */}
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <TabsContent value="overview" className="mt-0">
          <LocationOverviewTab location={location} canEdit={isAdmin} />
        </TabsContent>
        {/* ... other tabs */}
      </div>
    </div>
  </Tabs>
</div>
```

**DetailPageHeader Props (from DriverDetail.tsx lines 106-216):**
```tsx
// Build avatar - use Building icon for locations
const avatar = (
  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
    <Building2 className="w-5 h-5 text-primary" />
  </div>
);

// Build badges
const badges = (
  <>
    <Badge variant={location.status === 'active' ? 'default' : 'secondary'}>
      {location.status === 'active' ? 'Active' : 'Inactive'}
    </Badge>
    {location.is_primary && (
      <Badge variant="outline">Primary</Badge>
    )}
  </>
);

// Build subtitle
const subtitle = [
  location.city && location.state ? `${location.city}, ${location.state}` : null,
  location.code ? `Code: ${location.code}` : null,
].filter(Boolean).join(' • ');

// Tab list - SAME PATTERN
const tabsList = (
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="drivers">Drivers</TabsTrigger>
    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
    <TabsTrigger value="credentials">Credentials</TabsTrigger>
    <TabsTrigger value="trip-sources">Trip Sources</TabsTrigger>
  </TabsList>
);

// Actions - adapt from DriverDetail.tsx lines 128-187
const actions = (
  <>
    <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
      <Edit className="w-4 h-4" />
      Edit
    </Button>
    <DropdownMenu>
      {/* Status changes, delete option */}
    </DropdownMenu>
  </>
);
```

### LocationOverviewTab.tsx - Copy from DriverOverviewTab.tsx

**File to copy:** `src/components/features/admin/DriverOverviewTab.tsx`

**Adapt the 3-card grid (lines 15-57):**
```tsx
<div className="space-y-6">
  <div className="grid gap-4 md:grid-cols-3">
    {/* Card 1: Address */}
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Address</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium">
          {location.address_line1 || 'No address'}
        </div>
        {location.address_line2 && (
          <div className="text-sm">{location.address_line2}</div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {[location.city, location.state, location.zip].filter(Boolean).join(', ') || '—'}
        </p>
      </CardContent>
    </Card>

    {/* Card 2: Contact */}
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium">
          {location.phone || 'No phone'}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {location.email || 'No email'}
        </p>
      </CardContent>
    </Card>

    {/* Card 3: Stats */}
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Assigned</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium">
          {driverCount} Drivers • {vehicleCount} Vehicles
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Currently assigned to this location
        </p>
      </CardContent>
    </Card>
  </div>

  {/* Notes section - copy DriverNotesSection pattern */}
  <LocationNotesSection locationId={location.id} canEdit={canEdit} />
</div>
```

### LocationDriversTab.tsx - Pattern for Entity Assignment Tab

**Reference:** `src/components/features/admin/DriverVehiclesTab.tsx` for the pattern of showing related entities

**Structure:**
```tsx
export function LocationDriversTab({ locationId }: { locationId: string }) {
  const { data: drivers, isLoading } = useLocationDrivers(locationId);
  const assignDriver = useAssignDriverToLocation();
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header with assign button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Assigned Drivers</h3>
          <p className="text-sm text-muted-foreground">
            {drivers?.length || 0} drivers assigned to this location
          </p>
        </div>
        <Button onClick={() => setAssignModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Driver
        </Button>
      </div>

      {/* Driver list - use same table pattern */}
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : drivers?.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No drivers assigned</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {drivers?.map((driver) => (
            <Card key={driver.id} className="p-4">
              {/* Driver info + Remove button */}
            </Card>
          ))}
        </div>
      )}

      {/* Assign modal */}
      <AssignDriverToLocationModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        locationId={locationId}
      />
    </div>
  );
}
```

### Verification
- [ ] Page loads at /admin/locations/:id
- [ ] Header matches DriverDetail layout exactly (uses DetailPageHeader)
- [ ] Back button navigates to /admin/locations
- [ ] All tabs render correctly
- [ ] Overview tab shows 3-card grid matching DriverOverviewTab
- [ ] Drivers tab shows assigned drivers with remove action
- [ ] Vehicles tab shows assigned vehicles with remove action
- [ ] Edit button opens edit modal
- [ ] Delete in dropdown works with confirmation

---

## User Story 8: Admin UI - Location Credentials Tab

### Context
Add the credentials tab to the location detail page for managing location-level credentials. **CRITICAL: Copy patterns from existing credential components.**

### Required Reading - MUST READ BEFORE IMPLEMENTING
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/components/features/admin/DriverCredentialsTab.tsx   # ⭐ PRIMARY PATTERN - Copy this structure
src/components/features/admin/CreateCredentialTypeSimpleModal.tsx  # Where to add 'location' category
src/components/features/admin/CredentialTypeCard.tsx     # Where to update category display
src/pages/admin/CredentialTypes.tsx                       # Category filter pattern
src/lib/status-configs.ts                                 # Status badge configs
```

### Task
1. **Read `src/components/features/admin/DriverCredentialsTab.tsx` first** - This is your template
2. Create `src/components/features/admin/LocationCredentialsTab.tsx` by adapting the pattern
3. Update `CreateCredentialTypeSimpleModal.tsx` to include 'location' category
4. Update `CredentialTypeCard.tsx` to handle 'location' category display
5. Update category filter on CredentialTypes page

### LocationCredentialsTab.tsx - Copy from DriverCredentialsTab.tsx

**Key difference:** Location credentials are admin-submitted only, so the UI should show admin submission controls rather than "waiting for driver" states.

**Structure to follow:**
```tsx
export function LocationCredentialsTab({ 
  companyId, 
  locationId 
}: { 
  companyId: string; 
  locationId: string; 
}) {
  const { data: credentials, isLoading } = useLocationCredentials(locationId);
  const { data: credentialTypes } = useCredentialTypes(companyId, { category: 'location' });

  // ... same pattern as DriverCredentialsTab

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Location Credentials</h3>
          <p className="text-sm text-muted-foreground">
            Compliance documents for this location
          </p>
        </div>
      </div>

      {/* Credential list - same card pattern */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !credentials || credentials.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No location credentials configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create credential types with category "Location" in Credential Builder
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => (
            <CredentialCard 
              key={credential.id} 
              credential={credential}
              onSubmit={() => handleSubmit(credential)}
              onView={() => handleView(credential)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### CreateCredentialTypeSimpleModal.tsx Updates

**IMPORTANT:** This modal uses `RadioGroup`, not `Select`. Update both the schema and the RadioGroup.

**1. Update the Zod schema (around line 34-40):**
```tsx
const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['driver', 'vehicle', 'location']),  // ADD 'location'
  scope: z.enum(['global', 'broker']),
  broker_id: z.string().nullable(),
  template_id: z.string().nullable(),
});
```

**2. Update the RadioGroup (around line 139-152):**
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

### CredentialTypeCard.tsx Updates

**Find where category is displayed and add location handling:**
```tsx
// Look for category badge or display
// Add case for 'location':
const categoryConfig = {
  driver: { label: 'Driver', icon: User, color: 'blue' },
  vehicle: { label: 'Vehicle', icon: Car, color: 'green' },
  location: { label: 'Location', icon: Building2, color: 'purple' },  // ADD THIS
};
```

### CredentialTypes.tsx Page Updates

**Find the category filter and add 'location' option:**
```tsx
// In the filter options array, add:
{ value: 'location', label: 'Location' }
```

### Status Badge Pattern (from status-configs.ts)

Use the existing `credentialStatusConfig` for consistency:
```tsx
import { credentialStatusConfig } from '@/lib/status-configs';

// In your component:
<Badge variant={credentialStatusConfig[credential.status].variant}>
  {credentialStatusConfig[credential.status].label}
</Badge>
```

### Verification
- [ ] Location category appears in credential type creation dropdown
- [ ] CredentialTypeCard displays 'Location' category correctly with icon
- [ ] CredentialTypes page can filter by 'location' category
- [ ] Credentials tab shows on location detail page
- [ ] Shows empty state when no location credentials configured
- [ ] Can submit location credential (document upload works)
- [ ] Status badges use same styling as driver/vehicle credentials
- [ ] Expiration dates display correctly

---

## User Story 9: Admin UI - Location Trip Sources Tab

### Context
Add the trip sources tab to manage location-broker associations. **Follow the same pattern as LocationDriversTab.**

### Required Reading - MUST READ BEFORE IMPLEMENTING
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/components/features/admin/LocationDriversTab.tsx     # ⭐ Same tab pattern (from Story 7)
src/pages/admin/BrokerDetail.tsx                          # Broker data display patterns
src/components/features/admin/DriverVehiclesTab.tsx       # Related entity list pattern
src/hooks/useBrokers.ts                                   # Broker hooks pattern
```

### Task
1. Create `src/components/features/admin/LocationTripSourcesTab.tsx` using same pattern as LocationDriversTab
2. Create `src/components/features/admin/AssignBrokerToLocationModal.tsx`

### LocationTripSourcesTab.tsx - Same Structure as LocationDriversTab

```tsx
export function LocationTripSourcesTab({ 
  locationId, 
  companyId 
}: { 
  locationId: string;
  companyId: string;
}) {
  const { data: assignments, isLoading } = useLocationBrokers(locationId);
  const { data: allBrokers } = useBrokers(companyId);
  const assignBroker = useAssignBrokerToLocation();
  const removeBroker = useRemoveBrokerFromLocation();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const navigate = useNavigate();

  // Filter out already-assigned brokers for the modal
  const availableBrokers = allBrokers?.filter(
    (broker) => !assignments?.some((a) => a.broker_id === broker.id)
  );

  return (
    <div className="space-y-4">
      {/* Header with assign button - SAME PATTERN */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Associated Trip Sources</h3>
          <p className="text-sm text-muted-foreground">
            {assignments?.length || 0} trip sources work with this location
          </p>
        </div>
        <Button onClick={() => setAssignModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Trip Source
        </Button>
      </div>

      {/* Broker list - SAME CARD PATTERN */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No trip sources associated</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add trip sources this location works with
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/admin/brokers/${assignment.broker_id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{assignment.broker?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {assignment.broker?.code || 'No code'}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeBroker.mutate({ 
                    locationId, 
                    brokerId: assignment.broker_id 
                  })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assign modal */}
      <AssignBrokerToLocationModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        locationId={locationId}
        companyId={companyId}
        availableBrokers={availableBrokers || []}
      />
    </div>
  );
}
```

### AssignBrokerToLocationModal.tsx Pattern

**Follow the pattern of other selection modals in the codebase:**
```tsx
interface AssignBrokerToLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  companyId: string;
  availableBrokers: Broker[];
}

export function AssignBrokerToLocationModal({ ... }: AssignBrokerToLocationModalProps) {
  const assignBroker = useAssignBrokerToLocation();
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('');

  const handleAssign = async () => {
    if (!selectedBrokerId) return;
    await assignBroker.mutateAsync({ locationId, brokerId: selectedBrokerId, companyId });
    onOpenChange(false);
    setSelectedBrokerId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Trip Source</DialogTitle>
          <DialogDescription>
            Select a trip source to associate with this location
          </DialogDescription>
        </DialogHeader>

        {availableBrokers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            All trip sources are already associated with this location
          </p>
        ) : (
          <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a trip source" />
            </SelectTrigger>
            <SelectContent>
              {availableBrokers.map((broker) => (
                <SelectItem key={broker.id} value={broker.id}>
                  {broker.name} {broker.code ? `(${broker.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedBrokerId || assignBroker.isPending}
          >
            {assignBroker.isPending ? 'Adding...' : 'Add Trip Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Verification
- [ ] Tab displays on location detail page
- [ ] Shows empty state when no brokers associated
- [ ] Associated brokers display with name and code
- [ ] Click on broker row navigates to /admin/brokers/:id
- [ ] "Add Trip Source" button opens modal
- [ ] Modal shows only unassociated brokers
- [ ] Can successfully add broker association
- [ ] Remove (X) button removes association
- [ ] Lists refresh after add/remove

---

## User Story 10: Integration - Driver/Vehicle Location Assignment

### Context
Update driver and vehicle forms/cards to support location assignment. **Add location selector and badge following existing component patterns.**

### Required Reading - MUST READ BEFORE IMPLEMENTING
```
docs/CODEX-043-LOCATIONS-001-company-locations.md
src/components/features/admin/DriverOverviewTab.tsx   # ⭐ Where to add location selector
src/components/features/admin/VehicleOverviewTab.tsx  # ⭐ Where to add location selector
src/components/features/admin/DriverCard.tsx          # ⭐ Where to add location badge
src/components/features/admin/VehicleCard.tsx         # ⭐ Where to add location badge
src/services/drivers.ts                                # Service to update
src/services/vehicles.ts                               # Service to update
src/hooks/useLocations.ts                              # Location hooks (from Story 5)
```

### Task
1. Update `DriverOverviewTab.tsx` - Add location selector card
2. Update `VehicleOverviewTab.tsx` - Add location selector card
3. Update `DriverCard.tsx` - Display location badge in metadata section
4. Update `VehicleCard.tsx` - Display location badge in metadata section
5. Update services to include location in queries

### DriverOverviewTab.tsx - Add Location Card

**Add a 4th card to the existing 3-card grid (around line 15-57):**

```tsx
// Change grid from md:grid-cols-3 to md:grid-cols-2 lg:grid-cols-4
// OR add as a new row below the existing cards

// Import at top:
import { useLocations, useAssignDriverToLocation } from '@/hooks/useLocations';

// In component:
const { data: locations } = useLocations(driver.company_id);
const assignToLocation = useAssignDriverToLocation();

// Add card to the grid:
<Card>
  <CardHeader>
    <CardTitle className="text-sm">Location</CardTitle>
  </CardHeader>
  <CardContent>
    <Select
      value={driver.location_id || 'unassigned'}
      onValueChange={(value) => {
        assignToLocation.mutate({
          driverId: driver.id,
          locationId: value === 'unassigned' ? null : value,
        });
      }}
      disabled={!canEdit}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select location" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {locations?.filter(l => l.status === 'active').map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name} {location.code ? `(${location.code})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="mt-2 text-xs text-muted-foreground">
      {driver.location?.name 
        ? `Assigned to ${driver.location.name}`
        : 'Not assigned to any location'
      }
    </p>
  </CardContent>
</Card>
```

### VehicleOverviewTab.tsx - Same Pattern

Apply the exact same pattern as DriverOverviewTab above, but for vehicles:
- Use `useAssignVehicleToLocation` hook
- Reference `vehicle.location_id` and `vehicle.location?.name`

### DriverCard.tsx - Add Location Badge

**Find the metadata section (around lines 180-249) and add location display:**

```tsx
// Add import at top:
import { MapPin } from 'lucide-react';

// In the metadata section (after Phone, before Location if exists), add:
{/* Location Assignment - ADD THIS */}
{driver.location && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <MapPin className="h-4 w-4 flex-shrink-0" />
    <span>{driver.location.name}</span>
  </div>
)}
```

**Note:** This follows the exact same pattern as the existing metadata items (Phone, MapPin for city/state, Calendar).

### VehicleCard.tsx - Same Pattern

Apply the exact same pattern - find the metadata section and add:
```tsx
{vehicle.location && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <MapPin className="h-4 w-4 flex-shrink-0" />
    <span>{vehicle.location.name}</span>
  </div>
)}
```

### Service Updates

**src/services/drivers.ts - Update queries to include location:**

Find `getDrivers()` and update the select to include location join:
```typescript
// Before:
.select('*, user:users(*)')

// After:
.select('*, user:users(*), location:company_locations(id, name, code)')
```

Find `getDriverById()` and update similarly:
```typescript
.select('*, user:users(*), location:company_locations(id, name, code)')
```

**src/services/vehicles.ts - Same pattern:**
```typescript
// Update select statements to include:
.select('*, location:company_locations(id, name, code)')
```

### Type Updates

**src/types/driver.ts - Ensure location is typed (should be done in Story 2):**
```typescript
// Verify this exists in src/types/driver.ts:
interface Driver {
  // ... existing fields
  location_id: string | null;
  location?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
}
```

**src/types/vehicle.ts - Same pattern for Vehicle interface.**

### Verification
- [ ] Location selector card appears on DriverOverviewTab
- [ ] Location selector card appears on VehicleOverviewTab
- [ ] Selector shows all active company locations
- [ ] Selector has "Unassigned" option
- [ ] Selecting location updates driver/vehicle immediately
- [ ] DriverCard shows location in metadata section when assigned
- [ ] VehicleCard shows location in metadata section when assigned
- [ ] Location not shown when driver/vehicle is unassigned
- [ ] No TypeScript errors in modified files
- [ ] Existing driver/vehicle functionality unchanged

---

## Implementation Order

Recommended sequence (dependencies noted):

| Order | Story | Dependencies | Impact |
|-------|-------|--------------|--------|
| 1 | Story 1: Database Migration | None | Foundation |
| 2 | Story 2: TypeScript Types | Story 1 | Foundation |
| 3 | Story 3: Locations Service | Story 2 | Foundation |
| 4 | Story 4: Location Credentials Service | Stories 2, 3 | Foundation |
| 5 | Story 5: React Hooks | Stories 3, 4 | Foundation |
| 6 | Story 6: Locations List Page | Story 5 | Core UI |
| 7 | Story 7: Location Detail Page | Story 6 | Core UI |
| 8 | Story 8: Location Credentials Tab | Story 7 | Feature |
| 9 | Story 9: Trip Sources Tab | Story 7 | Feature |
| 10 | Story 10: Driver/Vehicle Integration | Story 5 | Integration |

**Note:** Stories 6-9 can be partially parallelized once Story 5 is complete.

---

## Global Verification Checklist

After completing all stories:

### Database
- [ ] All migrations applied successfully
- [ ] RLS policies working correctly
- [ ] No orphaned records on cascading deletes
- [ ] `is_primary` trigger enforces single primary per company
- [ ] Cascading delete: location → location_credentials works
- [ ] SET NULL: location deleted → driver/vehicle.location_id = null

### Admin - Locations
- [ ] Can create location
- [ ] Can edit location
- [ ] Can delete location
- [ ] Can view location list with stats
- [ ] Can view location detail with all tabs
- [ ] Create location modal validates unique name per company

### Admin - Location Credentials
- [ ] Can create 'location' category credential type
- [ ] Can submit location credential (auto-approves)
- [ ] Location credentials do NOT appear in driver review queue
- [ ] Expiration tracking works
- [ ] Credential type filter includes "Location" option

### Admin - Location Associations
- [ ] Can assign driver to location
- [ ] Can assign vehicle to location
- [ ] Can associate broker with location
- [ ] Can remove all associations

### Integration
- [ ] Driver cards show location
- [ ] Vehicle cards show location
- [ ] Existing driver/vehicle functionality unchanged
- [ ] Existing credential functionality unchanged
- [ ] Location credentials NOT visible in driver portal

### UI Edge Cases
- [ ] Location selector shows "No locations" state when company has none
- [ ] Locations list page handles 50+ locations without lag
- [ ] Credential status computation uses parallel queries

---

## Rollback Plan

If issues arise after deployment:

1. **Database Issues:** 
   - Location_id columns are nullable, can be ignored
   - Location tables can be dropped if unused
   - Revert category constraint if needed

2. **UI Issues:**
   - Hide Locations menu item via feature flag
   - Location selector can be conditionally rendered

3. **Keep existing functionality intact:**
   - All changes are additive
   - No existing columns modified (only added)
   - No existing RLS policies changed (only new ones added)

---

## Notes for Agents

### CRITICAL: Pattern Copying Rules

1. **DO NOT HALLUCINATE UX** - Every UI component has an existing pattern to copy. If you're unsure, READ the referenced files first.

2. **Required Reading is REQUIRED** - Each story lists specific files under "Required Reading". You MUST read these files BEFORE implementing. They contain the exact patterns to follow.

3. **Copy Structure Exactly** - When adapting a pattern:
   - Keep the same component structure
   - Keep the same CSS classes
   - Keep the same spacing/layout
   - Only change the data and labels

4. **Key Files to Reference:**
   | For This | Copy From |
   |----------|-----------|
   | List page layout | `src/pages/admin/Drivers.tsx` |
   | Detail page layout | `src/pages/admin/DriverDetail.tsx` |
   | Card component | `src/components/features/admin/DriverCard.tsx` |
   | Overview tab | `src/components/features/admin/DriverOverviewTab.tsx` |
   | Entity list tab | `src/components/features/admin/DriverVehiclesTab.tsx` |
   | Page header | `src/components/ui/DetailPageHeader.tsx` |
   | Filter bar | `src/components/ui/filter-bar.tsx` |
   | Status badges | `src/lib/status-configs.ts` |

### Other Requirements

5. **Use specific column selections** - Per CODEX-042, avoid `select('*')`. List specific columns needed.

6. **Test incrementally** - Each story should be testable independently.

7. **Preserve existing functionality** - Driver and vehicle workflows must continue working unchanged.

8. **Admin-only credentials** - Location credentials have NO driver access. RLS policies should reflect this.

9. **Nullable location_id** - Drivers and vehicles can exist without a location. Never require location assignment.

### Common Component Usage

**FilterBar usage (from Drivers.tsx):**
```tsx
<FilterBar
  searchValue={filters.search || ''}
  onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
  searchPlaceholder="Search..."
  filters={[{ value, onValueChange, label, placeholder, options }]}
/>
```

**DetailPageHeader usage (from DriverDetail.tsx):**
```tsx
<DetailPageHeader
  title="Name"
  subtitle="Subtitle text"
  badges={<Badge>Status</Badge>}
  avatar={<UserAvatar ... />}
  onBack={() => navigate('/back')}
  backLabel="Back to List"
  centerContent={<TabsList>...</TabsList>}
  actions={<Button>Action</Button>}
/>
```

**Status badges (from status-configs.ts):**
```tsx
import { driverStatusConfig, credentialStatusConfig } from '@/lib/status-configs';
<Badge variant={driverStatusConfig[status].variant}>
  {driverStatusConfig[status].label}
</Badge>
```

**Empty state pattern (from Drivers.tsx):**
```tsx
<Card className="p-12 text-center">
  <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
  <h3 className="text-lg font-medium mb-2">No items found</h3>
  <p className="text-muted-foreground">Description text here.</p>
</Card>
```
