# AD-003: Vehicle Management

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 2 - Admin Core

---

## Overview

Vehicle Management provides a registry of all vehicles (company fleet and driver-owned) that can be used for NEMT trips. This feature covers vehicle CRUD operations, status management, and credential tracking. Vehicle-to-driver assignment is handled in AD-004.

**Key Concepts:**
- **Company Vehicle** = Fleet vehicle owned by the tenant company (typically for W2 drivers)
- **Driver-Owned Vehicle** = Vehicle owned by a 1099 contractor
- **Primary Vehicle** = The driver's default vehicle for trips

---

## Data Model

### Vehicle Types (System-Defined)

```typescript
// System-defined vehicle types - not configurable per company
const VEHICLE_TYPES = [
  'sedan',           // Standard car
  'van',             // Passenger van
  'wheelchair_van',  // Wheelchair accessible van
  'stretcher_van',   // Stretcher/gurney capable
] as const;

type VehicleType = typeof VEHICLE_TYPES[number];
```

### Vehicle Schema

```sql
-- Vehicle registry
CREATE TABLE vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic Info
  make            text NOT NULL,                -- Toyota, Honda, etc.
  model           text NOT NULL,                -- Camry, Odyssey, etc.
  year            integer NOT NULL,
  color           text NOT NULL,
  
  -- Identification
  license_plate   text NOT NULL,
  license_state   text NOT NULL,                -- State abbreviation
  vin             text NOT NULL,                -- Vehicle Identification Number
  
  -- Classification
  vehicle_type    text NOT NULL CHECK (vehicle_type IN ('sedan', 'van', 'wheelchair_van', 'stretcher_van')),
  ownership       text NOT NULL CHECK (ownership IN ('company', 'driver')),
  
  -- Capacity
  seat_capacity       integer NOT NULL DEFAULT 4,
  wheelchair_capacity integer NOT NULL DEFAULT 0,  -- For wheelchair vans
  stretcher_capacity  integer NOT NULL DEFAULT 0,  -- For stretcher vans
  
  -- Fleet Management (company vehicles)
  fleet_number    text,                         -- Van #1, Van #2, etc.
  mileage         integer,                      -- Current odometer reading
  mileage_updated_at timestamptz,
  
  -- Photos (Supabase Storage URLs)
  exterior_photo_url  text,                     -- Required side shot
  interior_photo_url  text,
  wheelchair_lift_photo_url text,               -- For wheelchair vans
  
  -- Status
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'retired')),
  status_reason   text,                         -- Reason for inactive/retired
  status_changed_at timestamptz,
  status_changed_by uuid REFERENCES users(id),
  
  -- Owner tracking (for driver-owned vehicles)
  owner_driver_id uuid REFERENCES drivers(id),  -- If ownership='driver'
  
  -- Metadata
  is_complete     boolean NOT NULL DEFAULT false, -- Has all required info filled
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT unique_plate_per_company UNIQUE (company_id, license_plate),
  CONSTRAINT owner_required_for_driver_owned 
    CHECK (ownership = 'company' OR owner_driver_id IS NOT NULL)
);

CREATE INDEX idx_vehicles_company ON vehicles(company_id);
CREATE INDEX idx_vehicles_owner ON vehicles(owner_driver_id);
CREATE INDEX idx_vehicles_status ON vehicles(company_id, status);
CREATE INDEX idx_vehicles_type ON vehicles(company_id, vehicle_type);

-- RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Admins and coordinators can view all company vehicles
CREATE POLICY "Company staff can view vehicles"
  ON vehicles FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
  );

-- Drivers can view their own vehicles and assigned vehicles
CREATE POLICY "Drivers can view own and assigned vehicles"
  ON vehicles FOR SELECT
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND (
      owner_driver_id = (auth.jwt() -> 'app_metadata' ->> 'driver_id')::uuid
      OR id IN (
        SELECT vehicle_id FROM driver_vehicle_assignments 
        WHERE driver_id = (auth.jwt() -> 'app_metadata' ->> 'driver_id')::uuid
      )
    )
  );

-- Admins can manage all vehicles
CREATE POLICY "Admins can manage vehicles"
  ON vehicles FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Drivers can manage their own vehicles
CREATE POLICY "Drivers can manage own vehicles"
  ON vehicles FOR ALL
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'driver'
    AND ownership = 'driver'
    AND owner_driver_id = (auth.jwt() -> 'app_metadata' ->> 'driver_id')::uuid
  );
```

### Driver Vehicle Assignments (Reference)

From `02-DATABASE-SCHEMA.md`:

```sql
-- Vehicle assignments to drivers
CREATE TABLE driver_vehicle_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  is_primary      boolean NOT NULL DEFAULT false,
  assignment_type text NOT NULL CHECK (assignment_type IN ('owned', 'assigned', 'borrowed')),
  
  -- For temporary assignments
  starts_at       timestamptz,
  ends_at         timestamptz,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  
  UNIQUE(driver_id, vehicle_id)
);
```

---

## User Stories

### Admin Stories

1. **As an Admin**, I want to view all vehicles (company and driver-owned) so that I can manage the fleet.

2. **As an Admin**, I want to add a company vehicle so that it can be assigned to W2 drivers.

3. **As an Admin**, I want to edit any vehicle's information so that records stay accurate.

4. **As an Admin**, I want to retire a vehicle so that it's no longer available but records are preserved.

5. **As an Admin**, I want to see vehicle credential status so that I know which vehicles are compliant.

6. **As an Admin**, I want to track mileage on company vehicles for fleet management.

7. **As an Admin**, I want to see which driver(s) a vehicle is assigned to.

### Coordinator Stories

8. **As a Coordinator**, I want to view all vehicles so that I can support operations.

### Driver Stories (1099)

9. **As a Driver**, I want to add my vehicle so that I can use it for trips.

10. **As a Driver**, I want to edit my vehicle information so that it stays current.

11. **As a Driver**, I want to set a vehicle as inactive if it's temporarily unavailable.

12. **As a Driver**, I want to add multiple vehicles so that I have options.

13. **As a Driver**, I want to set my primary vehicle for default trip assignments.

---

## UI Specifications

### 1. Vehicle List (Admin View)

**Route:** `/admin/vehicles`

**Component:** `EnhancedDataView` (card/table toggle)

```
┌─────────────────────────────────────────────────────────────────┐
│  Vehicles                                [Card|Table] [+ Add]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search...]  [Type ▼]  [Ownership ▼]  [Status ▼]  [Driver ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Company Vehicles                                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  Van #1 - 2023 Ford Transit    ● Active         │   │
│  │          Wheelchair Van • ABC-1234 • TX                 │   │
│  │          Assigned: John Smith                           │   │
│  │          ✓ Credentials complete       42,350 mi        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  Van #2 - 2022 Dodge Caravan   ○ Inactive       │   │
│  │          Wheelchair Van • XYZ-5678 • TX                 │   │
│  │          Maintenance - Brake repair                     │   │
│  │          ⚠ Insurance expiring         38,200 mi        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Driver-Owned Vehicles                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  2022 Toyota Camry             ● Active         │   │
│  │          Sedan • DEF-9012 • TX                          │   │
│  │          Owner: Jane Doe (★ Primary)                    │   │
│  │          ✓ Credentials complete                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  2020 Honda Odyssey            ⚠ Incomplete     │   │
│  │          Van • GHI-3456 • TX                            │   │
│  │          Owner: Bob Wilson                               │   │
│  │          ✕ Missing: VIN, interior photo                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 4 of 12 vehicles                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Card Fields:**
| Field | Display |
|-------|---------|
| Photo | Exterior thumbnail or placeholder |
| Fleet # + Make/Model/Year | "Van #1 - 2023 Ford Transit" or "2022 Toyota Camry" |
| Status | Active (green), Inactive (gray), Retired (red) |
| Vehicle Type | Sedan, Van, Wheelchair Van, Stretcher Van |
| Plate + State | "ABC-1234 • TX" |
| Owner/Assigned | Company: assigned driver(s). Driver-owned: owner name + primary badge |
| Credential Status | ✓ Complete, ⚠ Issues, ✕ Missing |
| Mileage | For company vehicles |
| Incomplete Badge | If `is_complete = false` |

**Filters:**
| Filter | Options |
|--------|---------|
| Search | Make, model, plate, fleet # |
| Type | All, Sedan, Van, Wheelchair Van, Stretcher Van |
| Ownership | All, Company, Driver-Owned |
| Status | All, Active, Inactive, Retired |
| Driver | [Driver list] - show vehicles owned by or assigned to |

---

### 2. Add/Edit Vehicle (Admin - Company Vehicle)

**Trigger:** "+ Add" → "Company Vehicle" or edit action

**Component:** `ElevatedContainer` with `FormToggle` tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Company Vehicle                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [Vehicle Info]  [Identification]  [Photos]                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  VEHICLE INFO TAB                                               │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Fleet Number                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Van #3                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ Make *             │  │ Model *            │                │
│  │ Ford               │  │ Transit            │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ Year *             │  │ Color *            │                │
│  │ 2023               │  │ White              │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  Vehicle Type *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Wheelchair Van                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Capacity                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Seats *      │  │ Wheelchairs  │  │ Stretchers   │          │
│  │ 4            │  │ 2            │  │ 0            │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Current Mileage                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 42350                                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  IDENTIFICATION TAB                                             │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  License Plate *                                                │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ ABC-1234           │  │ ▼ Texas            │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  VIN (Vehicle Identification Number) *                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1FTBW2CM5JKA12345                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ═══════════════════════════════════════════════════════════   │
│  PHOTOS TAB                                                     │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  Exterior Photo (Side View) *                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │         [Upload Photo] or [Take Photo]                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Interior Photo                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │         [Upload Photo] or [Take Photo]                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [If Wheelchair Van:]                                          │
│  Wheelchair Lift Photo                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │         [Upload Photo] or [Take Photo]                 │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Vehicle]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Add Vehicle Button Options

**"+ Add" dropdown:**
```
┌─────────────────────────┐
│ + Company Vehicle       │  ← Opens company vehicle form
│ + Driver-Owned Vehicle  │  ← Opens driver selection then vehicle form
└─────────────────────────┘
```

For "Driver-Owned Vehicle":
1. Select driver from dropdown
2. Then fill vehicle form (similar but no fleet # or mileage)

---

### 4. Vehicle Detail View

**Route:** `/admin/vehicles/[id]`

**Layout:** Header + tabbed content

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Vehicles                                             │
│                                                                 │
│  ┌────────┐  Van #1 - 2023 Ford Transit       ● Active          │
│  │ PHOTO  │  Wheelchair Van • ABC-1234 • TX                     │
│  │        │  Company Vehicle                                    │
│  └────────┘  Mileage: 42,350 mi                                 │
│                                                                 │
│              [Edit]  [•••]                                      │
│                                                                 │
│  [Overview]  [Details]  [Credentials]  [Assignments]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [Tab Content]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Header Actions:**
- **Edit** → Open edit modal
- **[•••] Menu:**
  - Set Active / Set Inactive
  - Retire Vehicle
  - Update Mileage (company vehicles)

---

### Tab: Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Active       │  │ Wheelchair   │  │ 4 + 2        │          │
│  │ Status       │  │ Van          │  │ Seats + WC   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Currently Assigned To                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ John Smith (Assigned)           Since Jan 10, 2026      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Credential Status                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Vehicle Insurance         Valid until Jun 30, 2026    │   │
│  │ ✓ Vehicle Registration      Valid until Dec 31, 2026    │   │
│  │ ⚠ Safety Inspection         Expiring in 14 days         │   │
│  │ ✓ Wheelchair Lift Cert      Approved Jan 5, 2026        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Photos                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Exterior  │  │  Interior  │  │   Lift     │                │
│  └────────────┘  └────────────┘  └────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Details

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Vehicle Information                                   [Edit]   │
│  ───────────────────────────────────────────────────────────── │
│  Fleet Number       Van #1                                      │
│  Make               Ford                                        │
│  Model              Transit                                     │
│  Year               2023                                        │
│  Color              White                                       │
│  Type               Wheelchair Van                              │
│  Ownership          Company                                     │
│                                                                 │
│  Capacity                                                       │
│  ───────────────────────────────────────────────────────────── │
│  Passengers         4                                           │
│  Wheelchairs        2                                           │
│  Stretchers         0                                           │
│                                                                 │
│  Identification                                                 │
│  ───────────────────────────────────────────────────────────── │
│  License Plate      ABC-1234 (Texas)                           │
│  VIN                1FTBW2CM5JKA12345                           │
│                                                                 │
│  Fleet Tracking                                                 │
│  ───────────────────────────────────────────────────────────── │
│  Current Mileage    42,350 mi (updated Jan 15, 2026)           │
│  [Update Mileage]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Credentials

Links to AD-006 functionality. Shows vehicle credentials.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Vehicle Credentials                                            │
│                                                                 │
│  Global Requirements                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Vehicle Insurance         Valid until Jun 30, 2026    │   │
│  │   [View Document]                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✓ Vehicle Registration      Valid until Dec 31, 2026    │   │
│  │   [View Document]                                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ⚠ Safety Inspection         Expiring in 14 days         │   │
│  │   Expires: Jan 30, 2026     [View Document]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Wheelchair Van Requirements                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Wheelchair Lift Cert      Approved Jan 5, 2026        │   │
│  │   [View Document]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Broker: MedTrans Requirements                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ MedTrans Vehicle Approval Approved Jan 8, 2026        │   │
│  │   [View Document]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Assignments

Shows current and historical driver assignments. Links to AD-004.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Current Assignments                             [+ Assign]     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ John Smith        Assigned         Since Jan 10, 2026   │   │
│  │                                          [Unassign]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assignment History                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Mike Johnson      Assigned    Nov 1 - Dec 31, 2025      │   │
│  │ Jane Doe          Borrowed    Oct 15 - Oct 20, 2025     │   │
│  │ Original Setup    —           Sep 1, 2025               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Driver Portal: My Vehicles

**Route:** `/driver/vehicles`

**Component:** `EnhancedDataView` (card view preferred)

```
┌─────────────────────────────────────────────────────────────────┐
│  My Vehicles                                         [+ Add]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  2022 Toyota Camry           ★ Primary          │   │
│  │          Sedan • DEF-9012 • TX       ● Active           │   │
│  │          ✓ All credentials complete                     │   │
│  │                                      [Edit] [Manage]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  2019 Honda Accord           Secondary          │   │
│  │          Sedan • GHI-3456 • TX       ○ Inactive         │   │
│  │          Reason: In shop for repairs                    │   │
│  │          ⚠ Insurance expiring in 30 days               │   │
│  │                                      [Edit] [Manage]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [  ]  Add Another Vehicle                               │   │
│  │       You can have multiple vehicles for flexibility    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Driver Actions:**
- Add new vehicle
- Edit vehicle info
- Set as primary
- Set active/inactive (with reason)
- Retire vehicle
- View/manage credentials

---

### 6. Incomplete Vehicle Banner

For vehicles missing required info (from application):

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Vehicle Information Incomplete                              │
│                                                                 │
│  Your 2022 Toyota Camry needs additional information:           │
│  • VIN number                                                   │
│  • Interior photo                                               │
│                                                                 │
│  [Complete Vehicle Info]                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Status Change Modals

**Set Inactive:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Set Vehicle Inactive                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This vehicle will not be available for trips.                  │
│                                                                 │
│  Reason                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Maintenance                                         │   │
│  │   • Repairs needed                                      │   │
│  │   • Personal use                                        │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Details (optional)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ In shop for brake repair, expected back Jan 20         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Set Inactive]           │
└─────────────────────────────────────────────────────────────────┘
```

**Retire Vehicle:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Retire Vehicle                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to retire this vehicle?                  │
│                                                                 │
│  Van #1 - 2023 Ford Transit                                     │
│                                                                 │
│  • Vehicle will be removed from active fleet                    │
│  • All records and history will be preserved                    │
│  • Any current assignments will be ended                        │
│                                                                 │
│  Reason                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Sold                                                │   │
│  │   • Totaled                                             │   │
│  │   • End of lease                                        │   │
│  │   • No longer needed                                    │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Retire Vehicle]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Vehicle List (Admin)

- [ ] Shows all company and driver-owned vehicles
- [ ] Grouped by ownership (Company first, then Driver-Owned)
- [ ] Shows photo thumbnail, make/model/year, plate, type, status
- [ ] Shows credential status (✓/⚠/✕)
- [ ] Shows assigned driver or owner
- [ ] Can filter by type, ownership, status, driver
- [ ] Can search by make, model, plate, fleet number
- [ ] Coordinator can view but not edit

### AC-2: Add Company Vehicle

- [ ] Admin can add company vehicle
- [ ] Required: make, model, year, color, plate, state, VIN, type, capacity, exterior photo
- [ ] Optional: fleet number, interior photo, wheelchair lift photo (if wheelchair van)
- [ ] Validates plate uniqueness within company
- [ ] Creates vehicle credential instances for applicable credential types

### AC-3: Add Driver-Owned Vehicle

- [ ] Admin can add vehicle for a specific driver
- [ ] Driver can add their own vehicle from portal
- [ ] Sets ownership=driver, owner_driver_id
- [ ] No fleet number or mileage tracking
- [ ] Same validation as company vehicle

### AC-4: Edit Vehicle

- [ ] Admin can edit any vehicle
- [ ] Driver can edit their own vehicles
- [ ] Coordinator cannot edit
- [ ] Can update all fields
- [ ] Cannot change ownership type

### AC-5: Vehicle Status

- [ ] Can set Active, Inactive, Retired
- [ ] Inactive requires reason
- [ ] Retired requires reason
- [ ] Retiring a vehicle ends all active assignments
- [ ] Retired vehicles hidden from default list (can filter to show)

### AC-6: Vehicle Photos

- [ ] Exterior photo required for all vehicles
- [ ] Interior photo optional
- [ ] Wheelchair lift photo shown only for wheelchair vans
- [ ] Photos stored in Supabase Storage

### AC-7: Vehicle Completeness

- [ ] `is_complete` calculated based on required fields
- [ ] Incomplete vehicles show badge in list
- [ ] Drivers see prompt to complete vehicle info

### AC-8: Vehicle Credentials

- [ ] Credential instances auto-created when vehicle added
- [ ] Filtered by vehicle type (wheelchair credentials only for wheelchair vans)
- [ ] Credential status shown on vehicle card
- [ ] Detail view shows full credential breakdown

### AC-9: Primary Vehicle

- [ ] Driver can set one vehicle as primary
- [ ] Primary vehicle marked with star
- [ ] Used as default for trip assignments

### AC-10: Mileage Tracking (Company Vehicles)

- [ ] Admin can update mileage
- [ ] Shows current mileage and last updated date
- [ ] Mileage history preserved (via updated_at)

### AC-11: Driver Portal

- [ ] Driver sees only their own and assigned vehicles
- [ ] Can add new vehicles
- [ ] Can edit their own vehicles
- [ ] Can set active/inactive with reason
- [ ] Can set primary vehicle
- [ ] Can retire their own vehicles

---

## Business Rules

1. **Plate Uniqueness:** License plate must be unique within company (not globally)

2. **Ownership:** 
   - Company vehicles: `ownership='company'`, no `owner_driver_id`
   - Driver vehicles: `ownership='driver'`, must have `owner_driver_id`
   - Cannot change ownership type after creation

3. **Driver-owned restrictions:**
   - One owner only (unlike company vehicles which can be assigned to multiple)
   - Owner is set at creation and cannot change

4. **Status transitions:**
   - Active ↔ Inactive: Anyone with edit permission
   - Active/Inactive → Retired: Admin only (or driver for own vehicle)
   - Retired → Active: Admin only (restore)

5. **Retirement effects:**
   - All active assignments ended
   - Hidden from default lists
   - Records preserved for history

6. **Vehicle completeness:**
   - Required for `is_complete=true`: make, model, year, color, plate, state, VIN, type, exterior photo
   - Incomplete vehicles can exist (from application) but prompt for completion

7. **Photo requirements:**
   - Exterior (side): Required
   - Interior: Optional but recommended
   - Wheelchair lift: Required for wheelchair_van type

8. **Credential auto-creation:**
   - When vehicle created, create `not_submitted` credential instances for all:
     - Global vehicle credentials
     - Vehicle-type-specific credentials (e.g., wheelchair lift cert for wheelchair vans)
     - Broker-specific vehicle credentials (for brokers the owner is assigned to)

---

## API/Queries

### Get Vehicles (Admin)

```typescript
const { data: vehicles } = await supabase
  .from('vehicles')
  .select(`
    *,
    owner:drivers!owner_driver_id(
      id,
      user:users(full_name)
    ),
    assignments:driver_vehicle_assignments(
      *,
      driver:drivers(
        id,
        user:users(full_name)
      )
    ),
    credentials:vehicle_credentials(
      *,
      credential_type:credential_types(name, requirement)
    )
  `)
  .eq('company_id', companyId)
  .neq('status', 'retired') // or include based on filter
  .order('ownership')
  .order('created_at', { ascending: false });
```

### Get Driver's Vehicles

```typescript
const { data: myVehicles } = await supabase
  .from('vehicles')
  .select(`
    *,
    credentials:vehicle_credentials(
      *,
      credential_type:credential_types(*)
    )
  `)
  .eq('owner_driver_id', driverId)
  .neq('status', 'retired');
```

### Create Vehicle

```typescript
async function createVehicle(data: CreateVehicleInput) {
  const { data: vehicle } = await supabase
    .from('vehicles')
    .insert({
      company_id: data.companyId,
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      license_plate: data.licensePlate,
      license_state: data.licenseState,
      vin: data.vin,
      vehicle_type: data.vehicleType,
      ownership: data.ownership,
      owner_driver_id: data.ownerDriverId,
      seat_capacity: data.seatCapacity,
      wheelchair_capacity: data.wheelchairCapacity,
      stretcher_capacity: data.stretcherCapacity,
      fleet_number: data.fleetNumber,
      mileage: data.mileage,
      exterior_photo_url: data.exteriorPhotoUrl,
      interior_photo_url: data.interiorPhotoUrl,
      wheelchair_lift_photo_url: data.wheelchairLiftPhotoUrl,
      is_complete: calculateCompleteness(data),
      created_by: currentUser.id,
    })
    .select()
    .single();
  
  // Create credential instances
  await createVehicleCredentialInstances(vehicle);
  
  // If driver-owned, create assignment
  if (data.ownership === 'driver' && data.ownerDriverId) {
    await supabase
      .from('driver_vehicle_assignments')
      .insert({
        driver_id: data.ownerDriverId,
        vehicle_id: vehicle.id,
        company_id: data.companyId,
        is_primary: true, // First vehicle is primary
        assignment_type: 'owned',
        created_by: currentUser.id,
      });
  }
  
  return vehicle;
}
```

### Retire Vehicle

```typescript
async function retireVehicle(vehicleId: string, reason: string) {
  // End all active assignments
  await supabase
    .from('driver_vehicle_assignments')
    .update({ ends_at: new Date().toISOString() })
    .eq('vehicle_id', vehicleId)
    .is('ends_at', null);
  
  // Update vehicle status
  await supabase
    .from('vehicles')
    .update({
      status: 'retired',
      status_reason: reason,
      status_changed_at: new Date().toISOString(),
      status_changed_by: currentUser.id,
    })
    .eq('id', vehicleId);
}
```

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - Base tables
- AD-001 - Driver Applications (creates initial vehicle record)
- AD-005 - Credential Types (vehicle credentials)
- AD-004 - Vehicle Assignment (assigns vehicles to drivers)

---

## Testing Requirements

### Integration Tests

```typescript
describe('AD-003: Vehicle Management', () => {
  describe('Create Vehicle', () => {
    it('creates company vehicle with all fields');
    it('creates driver-owned vehicle with owner');
    it('enforces plate uniqueness per company');
    it('allows same plate in different companies');
    it('creates credential instances on creation');
    it('creates assignment for driver-owned vehicle');
  });
  
  describe('Vehicle Completeness', () => {
    it('marks complete when all required fields present');
    it('marks incomplete when missing exterior photo');
    it('marks incomplete when missing VIN');
  });
  
  describe('Status Changes', () => {
    it('allows admin to set inactive with reason');
    it('allows driver to set own vehicle inactive');
    it('blocks coordinator from status changes');
    it('ends assignments when retiring');
  });
  
  describe('RLS Policies', () => {
    it('admin sees all company vehicles');
    it('coordinator sees all company vehicles');
    it('driver sees only own and assigned vehicles');
    it('driver can edit only own vehicles');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
