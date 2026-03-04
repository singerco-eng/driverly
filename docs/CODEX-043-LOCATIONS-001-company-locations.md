# CODEX-043: LOCATIONS-001 Company Locations

> **Status:** Planning
> **Priority:** High
> **Estimated Effort:** Medium (15-20 files, 7-9 user stories)

---

## Overview

### Problem Statement

Currently, the system assumes a single-location model where each company has one address. Many transportation companies operate across multiple locations (branches, offices, depots) and need to:

1. Track which drivers and vehicles are assigned to which location
2. Maintain location-specific credentials (TNC permits, branch insurance, location licenses)
3. Associate locations with specific trip sources (brokers)
4. Filter and report by location

### Solution

Add a **Company Locations** feature that:

- Allows companies to define multiple locations
- Enables optional assignment of drivers and vehicles to locations
- Supports location-specific credentials (admin-submitted)
- Associates locations with trip sources/brokers

### Terminology

| Term | Definition |
|------|------------|
| **Location** | A physical branch/office/depot belonging to a company |
| **Location Credential** | A compliance document for the location itself (TNC permit, branch insurance) |
| **Trip Source** | Existing broker/partner concept - locations can be associated with multiple |

---

## Architecture

### Entity Relationships

```
┌─────────────┐
│   Company   │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐
│  Location   │◄──────│   Broker    │
└──────┬──────┘  M:N  └─────────────┘
       │
       │ 1:N (optional)
       ▼
┌─────────────┐     ┌─────────────┐
│   Driver    │     │   Vehicle   │
└─────────────┘     └─────────────┘
```

### Credential System Extension

```
credential_types.category = 'driver' | 'vehicle' | 'location'
                                                    ▲
                                                    │ NEW
```

| Category | Submitted By | Instance Table |
|----------|--------------|----------------|
| driver | Driver | driver_credentials |
| vehicle | Driver/Admin | vehicle_credentials |
| **location** | **Admin only** | **location_credentials** |

---

## Database Schema

### New Tables

#### 1. `company_locations`

```sql
CREATE TABLE company_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),  -- Short identifier (e.g., "HQ", "EAST-1", "ATL")
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  
  -- Contact (optional location-specific contact)
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Status (matches driver/vehicle pattern)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, name),
  UNIQUE(company_id, code) -- Code must be unique if provided
);
```

#### 2. `location_credentials`

```sql
CREATE TABLE location_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN (
    'not_submitted', 'pending_review', 'approved', 'rejected', 'expired'
  )),
  
  -- Submission data (admin-submitted)
  document_url TEXT,
  document_urls TEXT[],
  form_data JSONB,
  entered_date DATE,
  notes TEXT,
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  driver_expiration_date DATE,
  
  -- Review (for consistency, though admin-submitted)
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  
  -- Grace period (for new credential types)
  grace_period_ends TIMESTAMPTZ,
  
  -- Version tracking
  submission_version INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(location_id, credential_type_id)
);
```

#### 3. `location_broker_assignments`

```sql
CREATE TABLE location_broker_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(location_id, broker_id)
);
```

### Schema Modifications

#### 1. Update `drivers` table

```sql
ALTER TABLE drivers 
  ADD COLUMN location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

CREATE INDEX idx_drivers_location_id ON drivers(location_id);
```

#### 2. Update `vehicles` table

```sql
ALTER TABLE vehicles 
  ADD COLUMN location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

CREATE INDEX idx_vehicles_location_id ON vehicles(location_id);
```

#### 3. Update `credential_types` category constraint

```sql
-- Drop existing constraint
ALTER TABLE credential_types 
  DROP CONSTRAINT credential_types_category_check;

-- Add updated constraint with 'location'
ALTER TABLE credential_types 
  ADD CONSTRAINT credential_types_category_check 
  CHECK (category IN ('driver', 'vehicle', 'location'));
```

#### 4. Update `credential_type_templates` category constraint

```sql
ALTER TABLE credential_type_templates 
  DROP CONSTRAINT credential_type_templates_category_check;

ALTER TABLE credential_type_templates 
  ADD CONSTRAINT credential_type_templates_category_check 
  CHECK (category IN ('driver', 'vehicle', 'location'));
```

---

## RLS Policies

### `company_locations`

```sql
-- Super admin: full access
CREATE POLICY "Super admins full access to company_locations"
  ON company_locations FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin: company-scoped CRUD
CREATE POLICY "Admins can manage company locations"
  ON company_locations FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Company members: read-only
CREATE POLICY "Company members can view locations"
  ON company_locations FOR SELECT
  TO authenticated
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
```

### `location_credentials`

```sql
-- Super admin: full access
CREATE POLICY "Super admins full access to location_credentials"
  ON location_credentials FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Admin only: company-scoped CRUD (no driver access)
CREATE POLICY "Admins can manage location credentials"
  ON location_credentials FOR ALL
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Coordinators: read-only (for viewing compliance status)
CREATE POLICY "Coordinators can view location credentials"
  ON location_credentials FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
  );
```

---

## TypeScript Types

### New Types

```typescript
// src/types/location.ts

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

// Credential compliance status - matches driver pattern from Drivers.tsx
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

export interface LocationCredential {
  id: string;
  location_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  document_urls: string[] | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  grace_period_ends: string | null;
  submission_version: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
  location?: Location;
}

export interface LocationBrokerAssignment {
  id: string;
  location_id: string;
  broker_id: string;
  company_id: string;
  is_active: boolean;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  broker?: Broker;
  location?: Location;
}

export interface CreateLocationData {
  name: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

export interface UpdateLocationData extends Partial<CreateLocationData> {
  status?: LocationStatus;
}
```

### Status Config (add to `src/lib/status-configs.ts`)

```typescript
// Add LocationStatus type import
import type { LocationStatus } from '@/types/location';

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

### Type Updates

```typescript
// src/types/credential.ts
export type CredentialCategory = 'driver' | 'vehicle' | 'location';

// src/types/driver.ts (or driverVehicle.ts)
export interface Driver {
  // ... existing fields
  location_id: string | null;  // NEW
  location?: Location;         // Joined
}

// src/types/vehicle.ts
export interface Vehicle {
  // ... existing fields
  location_id: string | null;  // NEW
  location?: Location;         // Joined
}
```

---

## Service Layer

### New Services

#### `src/services/locations.ts`

```typescript
// Core CRUD operations
export async function getLocations(companyId: string): Promise<Location[]>
export async function getLocationById(id: string): Promise<Location | null>
export async function createLocation(data: CreateLocationData): Promise<Location>
export async function updateLocation(id: string, data: UpdateLocationData): Promise<Location>
export async function deleteLocation(id: string): Promise<void>

// Stats/aggregations
export async function getLocationsWithStats(companyId: string): Promise<LocationWithStats[]>
export async function getLocationDrivers(locationId: string): Promise<Driver[]>
export async function getLocationVehicles(locationId: string): Promise<Vehicle[]>

// Broker associations
export async function getLocationBrokers(locationId: string): Promise<Broker[]>
export async function assignBrokerToLocation(locationId: string, brokerId: string): Promise<void>
export async function removeBrokerFromLocation(locationId: string, brokerId: string): Promise<void>
```

#### `src/services/locationCredentials.ts`

```typescript
// Credential operations (admin-only)
export async function getLocationCredentials(locationId: string): Promise<LocationCredential[]>
export async function submitLocationCredential(
  locationId: string, 
  credentialTypeId: string, 
  data: CredentialSubmissionData
): Promise<LocationCredential>
export async function updateLocationCredential(
  id: string, 
  data: CredentialSubmissionData
): Promise<LocationCredential>
```

### Service Updates

| Service | Changes |
|---------|---------|
| `drivers.ts` | Add `location_id` to queries, add `updateDriverLocation()` |
| `vehicles.ts` | Add `location_id` to queries, add `updateVehicleLocation()` |
| `credentialTypes.ts` | Handle `category: 'location'` |
| `credentialReview.ts` | Include `location_credentials` in review queries |

---

## UI Components

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Locations List | `/admin/locations` | Enhanced data table with filters |
| Location Detail | `/admin/locations/:id` | Tabbed detail view |

### Location Detail Tabs

| Tab | Content |
|-----|---------|
| **Overview** | Location info, address, primary status, quick stats |
| **Drivers** | Drivers assigned to this location (table with actions) |
| **Vehicles** | Vehicles assigned to this location (table with actions) |
| **Credentials** | Location credentials (admin submission/view) |
| **Trip Sources** | Associated brokers (manage associations) |

### New Components

```
src/components/features/admin/
├── LocationCard.tsx              # Card for list view
├── LocationOverviewTab.tsx       # Overview tab content
├── LocationDriversTab.tsx        # Drivers tab with assignment
├── LocationVehiclesTab.tsx       # Vehicles tab with assignment
├── LocationCredentialsTab.tsx    # Credential management
├── LocationTripSourcesTab.tsx    # Broker associations
├── AssignToLocationModal.tsx     # Modal for bulk assignment
└── CreateLocationModal.tsx       # Create location form
```

### Component Updates

| Component | Changes |
|-----------|---------|
| `DriverCard.tsx` | Display location badge if assigned |
| `VehicleCard.tsx` | Display location badge if assigned |
| `DriverOverviewTab.tsx` | Add location selector |
| `VehicleOverviewTab.tsx` | Add location selector |
| `CreateCredentialTypeSimpleModal.tsx` | Add 'location' category option |
| `CredentialTypeCard.tsx` | Handle 'location' category display |
| Admin sidebar | Add "Locations" menu item |

---

## UI Mockups

### Locations List Page

```
┌─────────────────────────────────────────────────────────────┐
│ Locations                                    [+ Add Location]│
├─────────────────────────────────────────────────────────────┤
│ [Search...] [Status ▼] [Has Credentials ▼]                  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏢 Main Office (HQ)                          ★ Primary  │ │
│ │ 123 Main St, Atlanta, GA 30301                          │ │
│ │ 👤 12 Drivers  🚗 8 Vehicles  ✓ Compliant              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏢 East Branch (EAST)                                   │ │
│ │ 456 East Ave, Decatur, GA 30030                         │ │
│ │ 👤 5 Drivers   🚗 4 Vehicles  ⚠ 1 Pending              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Location Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Locations                                         │
│                                                             │
│ 🏢 Main Office                                   [Edit] [...│
│ Primary Location • Active                                   │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Drivers] [Vehicles] [Credentials] [Trip Sources]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Overview Tab:                                               │
│ ┌─────────────────┐ ┌─────────────────┐                    │
│ │ Address         │ │ Contact         │                    │
│ │ 123 Main St     │ │ (404) 555-1234  │                    │
│ │ Atlanta, GA     │ │ hq@company.com  │                    │
│ │ 30301           │ │                 │                    │
│ └─────────────────┘ └─────────────────┘                    │
│                                                             │
│ Quick Stats                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │    12    │ │    8     │ │    3     │ │    2     │       │
│ │ Drivers  │ │ Vehicles │ │ Complete │ │ Pending  │       │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Foundation (Non-Breaking)

1. Create `company_locations` table
2. Create `location_credentials` table  
3. Create `location_broker_assignments` table
4. Add `location_id` column to `drivers` (nullable)
5. Add `location_id` column to `vehicles` (nullable)
6. Update credential_types category constraint

**Result:** Database ready, no breaking changes to existing functionality.

### Phase 2: Service Layer

1. Create `src/services/locations.ts`
2. Create `src/services/locationCredentials.ts`
3. Create `src/types/location.ts`
4. Update `src/types/credential.ts` (add 'location' category)
5. Update driver/vehicle services to handle location_id

**Result:** API layer ready, existing queries unchanged.

### Phase 3: UI - Core

1. Add Locations to admin sidebar
2. Create Locations list page
3. Create Location detail page with tabs
4. Create location CRUD modals

**Result:** Admins can manage locations.

### Phase 4: UI - Integration

1. Add location selector to driver/vehicle forms
2. Add location badge to driver/vehicle cards
3. Update credential type form for 'location' category
4. Add location credentials to review workflow

**Result:** Full feature parity.

### Phase 5: Polish (Optional)

1. Location-based filtering on driver/vehicle lists
2. Location compliance dashboard
3. Coordinator location scoping (deferred)

---

## Deferred / Future Considerations

### Coordinator Location Scoping

For MVP, coordinators see all locations. Future enhancement:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN location_id UUID REFERENCES company_locations(id);

-- Update RLS to scope coordinators to their location
```

### Location-Based Reporting

- Compliance reports by location
- Driver/vehicle counts by location
- Credential expiration by location

### Bulk Assignment

- Assign multiple drivers to a location at once
- Transfer drivers between locations

---

## Testing Checklist

### Database

- [ ] Locations CRUD works
- [ ] Location credentials CRUD works
- [ ] Driver location_id can be set/cleared
- [ ] Vehicle location_id can be set/cleared
- [ ] Broker assignments work
- [ ] RLS policies work correctly
- [ ] Cascading deletes work (location deleted → credentials deleted)

### Admin Functionality

- [ ] Location list page loads with stats
- [ ] Location detail page shows all tabs
- [ ] Create location works
- [ ] Edit location works
- [ ] Delete location works (with confirmation)
- [ ] Assign driver to location works
- [ ] Assign vehicle to location works
- [ ] Create location credential type works
- [ ] Submit location credential works
- [ ] Review location credential works

### Integration

- [ ] Driver card shows location badge
- [ ] Vehicle card shows location badge
- [ ] Credential type form shows 'location' category
- [ ] Credential review includes location credentials
- [ ] Filtering by location works (if implemented)

---

## Files to Create

| File | Type |
|------|------|
| `supabase/migrations/033_company_locations.sql` | Migration |
| `src/types/location.ts` | Types |
| `src/services/locations.ts` | Service |
| `src/services/locationCredentials.ts` | Service |
| `src/hooks/useLocations.ts` | Hook |
| `src/hooks/useLocationCredentials.ts` | Hook |
| `src/pages/admin/Locations.tsx` | Page |
| `src/pages/admin/LocationDetail.tsx` | Page |
| `src/components/features/admin/LocationCard.tsx` | Component |
| `src/components/features/admin/LocationOverviewTab.tsx` | Component |
| `src/components/features/admin/LocationDriversTab.tsx` | Component |
| `src/components/features/admin/LocationVehiclesTab.tsx` | Component |
| `src/components/features/admin/LocationCredentialsTab.tsx` | Component |
| `src/components/features/admin/LocationTripSourcesTab.tsx` | Component |
| `src/components/features/admin/CreateLocationModal.tsx` | Component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/credential.ts` | Add 'location' to CredentialCategory |
| `src/types/driverVehicle.ts` | Add location_id to Driver, Vehicle |
| `src/lib/status-configs.ts` | Add locationStatusConfig (matches driver/vehicle pattern) |
| `src/services/drivers.ts` | Add location_id to queries |
| `src/services/vehicles.ts` | Add location_id to queries |
| `src/services/credentialTypes.ts` | Handle 'location' category |
| `src/services/credentialReview.ts` | Include location_credentials |
| `src/components/layouts/AdminLayout.tsx` | Add Locations to sidebar |
| `src/components/features/admin/DriverCard.tsx` | Show location badge |
| `src/components/features/admin/VehicleCard.tsx` | Show location badge |
| `src/components/features/admin/DriverOverviewTab.tsx` | Add location selector |
| `src/components/features/admin/VehicleOverviewTab.tsx` | Add location selector |
| `src/components/features/admin/CreateCredentialTypeSimpleModal.tsx` | Add 'location' option |
| `src/App.tsx` | Add location routes |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Admin can CRUD locations | ✓ |
| Drivers/vehicles can be assigned to locations | ✓ |
| Location credentials can be submitted/reviewed | ✓ |
| Locations can associate with trip sources | ✓ |
| No breaking changes to existing functionality | ✓ |
| UI consistent with existing patterns | ✓ |
