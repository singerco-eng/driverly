# AD-004: Vehicle Assignment

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 4 - Admin Operational

---

## Overview

Vehicle Assignment manages the relationship between drivers and vehicles. Admins assign company vehicles to W2 drivers, manage temporary "borrowed" assignments, and can transfer vehicles between drivers. This feature works bidirectionally - assignments can be managed from either the driver detail or vehicle detail view.

**Key Principle:** A vehicle can only be actively assigned to ONE driver at a time. Transfers move the vehicle from one driver to another.

---

## Assignment Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| `owned` | Driver owns this vehicle | 1099 drivers (auto-created when driver adds vehicle) |
| `assigned` | Company vehicle assigned to driver | W2 drivers with company fleet vehicles |
| `borrowed` | Temporary use of another vehicle | Short-term needs (maintenance, special trips) |

---

## Assignment Rules

### Who Can Have What

| Driver Type | Owned | Assigned | Borrowed |
|-------------|-------|----------|----------|
| **1099** | ✓ Their own vehicles | ✗ | ✓ Can borrow |
| **W2** | ✗ | ✓ Company vehicles | ✓ Can borrow |

### Exclusivity Rules

| Scenario | Allowed? |
|----------|----------|
| Vehicle assigned to 2 drivers permanently | ✗ No |
| Vehicle assigned to A + borrowed by B simultaneously | ✗ No |
| Driver-owned vehicle transferred to another driver | ✓ Yes (transfer) |
| Same driver has multiple vehicles | ✓ Yes |

### Primary Vehicle

- Each driver should have one primary vehicle
- Auto-set if only one vehicle
- Admin can change primary
- If primary unassigned and no other vehicles, driver becomes invalid for trips

---

## Data Model

### Driver Vehicle Assignments

From `02-DATABASE-SCHEMA.md`:

```sql
CREATE TABLE driver_vehicle_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  is_primary      boolean NOT NULL DEFAULT false,
  assignment_type text NOT NULL CHECK (assignment_type IN ('owned', 'assigned', 'borrowed')),
  
  -- Duration (for borrowed/time-bound assignments)
  starts_at       timestamptz DEFAULT now(),
  ends_at         timestamptz,  -- NULL = ongoing
  
  -- Tracking
  assigned_by     uuid REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(driver_id, vehicle_id)
);

-- Add assignment end tracking
ALTER TABLE driver_vehicle_assignments ADD COLUMN IF NOT EXISTS
  ended_at        timestamptz,
  ended_by        uuid REFERENCES users(id),
  end_reason      text;
```

### Assignment History

```sql
-- Track all assignment changes
CREATE TABLE vehicle_assignment_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id           uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Assignment details at time of change
  assignment_type     text NOT NULL,
  is_primary          boolean NOT NULL,
  
  -- Action
  action              text NOT NULL CHECK (action IN ('assigned', 'unassigned', 'transferred', 'primary_changed')),
  
  -- Duration
  started_at          timestamptz,
  ended_at            timestamptz,
  
  -- Who and why
  performed_by        uuid REFERENCES users(id),
  reason              text,
  
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignment_history_vehicle ON vehicle_assignment_history(vehicle_id);
CREATE INDEX idx_assignment_history_driver ON vehicle_assignment_history(driver_id);

-- RLS
ALTER TABLE vehicle_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view assignment history"
  ON vehicle_assignment_history FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);
```

---

## User Stories

### Admin Stories

1. **As an Admin**, I want to assign a company vehicle to a W2 driver so they can take trips.

2. **As an Admin**, I want to set which vehicle is a driver's primary vehicle.

3. **As an Admin**, I want to create a temporary "borrowed" assignment for a driver who needs a different vehicle.

4. **As an Admin**, I want to unassign a vehicle from a driver when no longer needed.

5. **As an Admin**, I want to transfer a vehicle from one driver to another in one action.

6. **As an Admin**, I want to see assignment history for a vehicle.

7. **As an Admin**, I want to see assignment history for a driver.

8. **As an Admin**, I want to see which drivers currently have no vehicle assigned.

---

## UI Specifications

### 1. Driver Detail → Vehicles Tab

**Route:** `/admin/drivers/[id]` → Vehicles tab

**From AD-002, this tab shows assigned vehicles with assignment actions:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Vehicles                                    [+ Assign Vehicle] │
│                                                                 │
│  Current Assignments                                            │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  Van #3 - 2023 Ford Transit      ★ PRIMARY      │   │
│  │          Wheelchair Van • ABC-1234                      │   │
│  │          Assigned Jan 10, 2026 • Ongoing               │   │
│  │          ✓ Credentials complete                         │   │
│  │                                                         │   │
│  │          [Set Primary] [Unassign] [•••]                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [PHOTO]  2022 Toyota Camry               BORROWED       │   │
│  │          Sedan • DEF-9012                               │   │
│  │          Borrowed Jan 15 - Jan 20, 2026                │   │
│  │          From: Mike Johnson (Owner)                     │   │
│  │          ⚠ Ends in 4 days                              │   │
│  │                                                         │   │
│  │          [End Early] [Extend] [•••]                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assignment History                              [View All →]   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Jan 15 - Borrowed 2022 Toyota Camry (DEF-9012)                │
│  Jan 10 - Assigned Van #3 (ABC-1234) as Primary                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**No Vehicles State (W2):**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Vehicles                                    [+ Assign Vehicle] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ⚠️ No vehicle assigned                                 │   │
│  │                                                         │   │
│  │  This W2 driver needs a vehicle assigned to be          │   │
│  │  eligible for trips.                                    │   │
│  │                                                         │   │
│  │                            [Assign Vehicle →]           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Vehicle Detail → Assignments Tab

**Route:** `/admin/vehicles/[id]` → Assignments tab

**From AD-003, this tab shows who the vehicle is assigned to:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Assignments                                 [+ Assign to Driver]│
│                                                                 │
│  Current Assignment                                             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JS]  John Smith                         ASSIGNED       │   │
│  │       W2 Employee                        ★ Primary      │   │
│  │       Since January 10, 2026 • Ongoing                  │   │
│  │                                                         │   │
│  │       [Transfer to Another Driver] [Unassign]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assignment History                              [View All →]   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Jan 10, 2026 - Assigned to John Smith (Primary)               │
│  Dec 31, 2025 - Unassigned from Mike Johnson                   │
│       Reason: "Driver terminated"                               │
│  Nov 1, 2025 - Assigned to Mike Johnson                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Unassigned Vehicle:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Assignments                                 [+ Assign to Driver]│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  This vehicle is not currently assigned to any driver.  │   │
│  │                                                         │   │
│  │                       [Assign to Driver →]              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Assign Vehicle Modal (from Driver)

**Trigger:** "+ Assign Vehicle" from driver's Vehicles tab

**Component:** `ElevatedContainer`

```
┌─────────────────────────────────────────────────────────────────┐
│  Assign Vehicle to John Smith                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select Vehicle *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Search vehicles...]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Available Company Vehicles                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Van #2 - 2022 Dodge Caravan                          │   │
│  │   Wheelchair Van • XYZ-5678 • Currently unassigned     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ Van #4 - 2023 Ford Transit                           │   │
│  │   Stretcher Van • LMN-9012 • Currently unassigned      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ Car #1 - 2022 Toyota Camry                           │   │
│  │   Sedan • QRS-3456 • Assigned to: Mike Johnson         │   │
│  │   ⚠️ Will be transferred from Mike Johnson             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assignment Type *                                              │
│  ○ Assigned (Ongoing)                                          │
│  ○ Borrowed (Temporary)                                        │
│                                                                 │
│  [If Borrowed selected:]                                       │
│  Duration *                                                     │
│  ┌────────────────────┐  to  ┌────────────────────┐            │
│  │ Jan 16, 2026       │      │ Jan 23, 2026       │            │
│  └────────────────────┘      └────────────────────┘            │
│                                                                 │
│  ☑ Set as Primary Vehicle                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Assign Vehicle]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Assign to Driver Modal (from Vehicle)

**Trigger:** "+ Assign to Driver" from vehicle's Assignments tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Assign Van #3 to Driver                                   [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Select Driver *                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Search drivers...]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  W2 Drivers (Recommended)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ [JS] John Smith                                       │   │
│  │   W2 • No vehicle assigned • Active                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ [JD] Jane Doe                                         │   │
│  │   W2 • Van #2 assigned • Active                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  1099 Drivers (For Borrowed)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ [MJ] Mike Johnson                                     │   │
│  │   1099 • 2 own vehicles • Active                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Assignment Type *                                              │
│  ○ Assigned (Ongoing)                                          │
│  ○ Borrowed (Temporary)                                        │
│                                                                 │
│  [Duration fields if Borrowed...]                              │
│                                                                 │
│  ☑ Set as Primary Vehicle                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Assign to Driver]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Transfer Vehicle Modal

**Trigger:** "Transfer to Another Driver" from vehicle's current assignment

```
┌─────────────────────────────────────────────────────────────────┐
│  Transfer Vehicle                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Van #3 - 2023 Ford Transit                                     │
│  Currently assigned to: John Smith                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Transfer to *                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Search drivers...]                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ [JD] Jane Doe                                         │   │
│  │   W2 • Van #2 assigned • Active                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ [BW] Bob Wilson                                       │   │
│  │   W2 • No vehicle assigned • Active                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Reason for Transfer *                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Driver reassignment                                 │   │
│  │   • Route optimization                                  │   │
│  │   • Driver request                                      │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Additional Notes                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☑ Set as Primary for new driver                               │
│                                                                 │
│  ⚠️ John Smith will have no vehicle after this transfer        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Transfer Vehicle]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. Unassign Vehicle Modal

**Trigger:** "Unassign" from driver's vehicle or vehicle's assignment

```
┌─────────────────────────────────────────────────────────────────┐
│  Unassign Vehicle                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Remove Van #3 from John Smith?                                 │
│                                                                 │
│  ⚠️ This is John's only vehicle. They will not be eligible     │
│     for trips after unassignment.                               │
│                                                                 │
│  Reason *                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Vehicle needs maintenance                           │   │
│  │   • Driver no longer needs vehicle                      │   │
│  │   • Driver terminated                                   │   │
│  │   • Reassigning to another driver                       │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Additional Notes                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Unassign Vehicle]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Extend Borrowed Assignment Modal

**Trigger:** "Extend" on borrowed assignment

```
┌─────────────────────────────────────────────────────────────────┐
│  Extend Borrowed Assignment                                [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2022 Toyota Camry borrowed by John Smith                       │
│  Current end date: January 20, 2026                             │
│                                                                 │
│  New End Date *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ January 27, 2026                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Reason                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Driver's vehicle still in maintenance                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Extend Assignment]      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. End Borrowed Early Modal

**Trigger:** "End Early" on borrowed assignment

```
┌─────────────────────────────────────────────────────────────────┐
│  End Borrowed Assignment                                   [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  End 2022 Toyota Camry assignment for John Smith?               │
│                                                                 │
│  Original end date: January 20, 2026                            │
│  Ending: Today (January 16, 2026)                               │
│                                                                 │
│  Reason                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Driver's vehicle back from maintenance early            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [End Assignment]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9. Assignment History View

**Route:** `/admin/vehicles/[id]/assignment-history` or expandable on detail

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Vehicle                                              │
│                                                                 │
│  Assignment History - Van #3                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jan 10, 2026 - Present                                  │   │
│  │ ASSIGNED to John Smith (Primary)                        │   │
│  │ By: Admin on Jan 10, 2026                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Nov 1, 2025 - Dec 31, 2025                              │   │
│  │ ASSIGNED to Mike Johnson (Primary)                      │   │
│  │ By: Admin on Nov 1, 2025                                │   │
│  │ Ended: Driver terminated                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Oct 15 - Oct 20, 2025                                   │   │
│  │ BORROWED by Jane Doe                                    │   │
│  │ By: Admin on Oct 15, 2025                               │   │
│  │ Reason: Mike's vehicle in maintenance                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Sep 1, 2025                                             │   │
│  │ VEHICLE ADDED to fleet                                  │   │
│  │ By: Admin on Sep 1, 2025                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Assign Vehicle (from Driver)

- [ ] Admin can access from driver's Vehicles tab
- [ ] Shows available company vehicles
- [ ] Shows which vehicles are currently assigned (with transfer warning)
- [ ] Can select assignment type (Assigned/Borrowed)
- [ ] Borrowed shows date range picker
- [ ] Can set as primary
- [ ] Creates assignment record

### AC-2: Assign Vehicle (from Vehicle)

- [ ] Admin can access from vehicle's Assignments tab
- [ ] Shows available drivers
- [ ] Groups by employment type (W2 first, 1099 for borrowed)
- [ ] Can select assignment type
- [ ] Can set as primary
- [ ] Creates assignment record

### AC-3: Transfer Vehicle

- [ ] One-step transfer from one driver to another
- [ ] Requires reason
- [ ] Creates history for both unassign and assign
- [ ] Warning if source driver will have no vehicle

### AC-4: Unassign Vehicle

- [ ] Admin can unassign at any time
- [ ] Requires reason
- [ ] Warning if driver's only/primary vehicle
- [ ] Creates history record
- [ ] Updates driver eligibility

### AC-5: Borrowed Assignments

- [ ] Must have start and end date
- [ ] Can extend end date
- [ ] Can end early
- [ ] Shows countdown on expiring borrowed
- [ ] Auto-ends when end date reached (or notification)

### AC-6: Primary Vehicle

- [ ] Can set primary during assignment
- [ ] Can change primary from existing assignment
- [ ] Only one primary per driver
- [ ] Auto-primary if only vehicle

### AC-7: Assignment History

- [ ] Shows on vehicle detail
- [ ] Shows on driver detail
- [ ] Includes: dates, type, who assigned, end reason
- [ ] Chronological order (newest first)

### AC-8: Validation

- [ ] Vehicle can only be assigned to one driver at a time
- [ ] Assignment to already-assigned vehicle triggers transfer
- [ ] No credential validation (handled by eligibility)

---

## Business Rules

1. **One assignment at a time:** Vehicle can only be actively assigned to one driver

2. **Transfer moves assignment:** Assigning already-assigned vehicle auto-transfers

3. **Borrowed is time-bound:** Borrowed assignments must have end date

4. **Primary required for trips:** Driver needs primary vehicle to be eligible

5. **Unassignment affects eligibility:** W2 with no vehicle = not eligible

6. **History preserved:** All assignment changes logged for audit

7. **Reasons required:** Unassignment and transfer require reason

8. **No credential check:** Assigning doesn't require credential validation

9. **Admin only:** Only admins can manage assignments (not coordinators)

---

## API/Queries

### Get Driver's Vehicles

```typescript
const { data: assignments } = await supabase
  .from('driver_vehicle_assignments')
  .select(`
    *,
    vehicle:vehicles(*)
  `)
  .eq('driver_id', driverId)
  .is('ended_at', null)
  .order('is_primary', { ascending: false });
```

### Get Vehicle's Current Assignment

```typescript
const { data: assignment } = await supabase
  .from('driver_vehicle_assignments')
  .select(`
    *,
    driver:drivers(
      *,
      user:users(full_name)
    )
  `)
  .eq('vehicle_id', vehicleId)
  .is('ended_at', null)
  .single();
```

### Assign Vehicle

```typescript
async function assignVehicle(data: AssignVehicleInput) {
  // Check if vehicle currently assigned
  const currentAssignment = await getCurrentAssignment(data.vehicleId);
  
  if (currentAssignment && currentAssignment.driver_id !== data.driverId) {
    // Transfer - end current assignment
    await endAssignment(currentAssignment.id, {
      reason: `Transferred to ${data.driverName}`,
      endedBy: currentUser.id,
    });
    
    // Log transfer history
    await logAssignmentHistory({
      vehicleId: data.vehicleId,
      driverId: currentAssignment.driver_id,
      action: 'transferred',
      reason: data.reason,
    });
  }
  
  // If setting as primary, unset other primaries
  if (data.isPrimary) {
    await supabase
      .from('driver_vehicle_assignments')
      .update({ is_primary: false })
      .eq('driver_id', data.driverId)
      .is('ended_at', null);
  }
  
  // Create new assignment
  const { data: assignment } = await supabase
    .from('driver_vehicle_assignments')
    .insert({
      driver_id: data.driverId,
      vehicle_id: data.vehicleId,
      company_id: data.companyId,
      assignment_type: data.assignmentType,
      is_primary: data.isPrimary,
      starts_at: data.startsAt || new Date().toISOString(),
      ends_at: data.endsAt, // null for ongoing
      assigned_by: currentUser.id,
    })
    .select()
    .single();
  
  // Log history
  await logAssignmentHistory({
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    action: 'assigned',
    assignmentType: data.assignmentType,
    isPrimary: data.isPrimary,
  });
  
  return assignment;
}
```

### Unassign Vehicle

```typescript
async function unassignVehicle(assignmentId: string, reason: string) {
  const assignment = await getAssignment(assignmentId);
  
  // End the assignment
  await supabase
    .from('driver_vehicle_assignments')
    .update({
      ended_at: new Date().toISOString(),
      ended_by: currentUser.id,
      end_reason: reason,
    })
    .eq('id', assignmentId);
  
  // If was primary, try to set another as primary
  if (assignment.is_primary) {
    const otherAssignment = await supabase
      .from('driver_vehicle_assignments')
      .select('id')
      .eq('driver_id', assignment.driver_id)
      .is('ended_at', null)
      .neq('id', assignmentId)
      .limit(1)
      .single();
    
    if (otherAssignment.data) {
      await supabase
        .from('driver_vehicle_assignments')
        .update({ is_primary: true })
        .eq('id', otherAssignment.data.id);
    }
  }
  
  // Log history
  await logAssignmentHistory({
    vehicleId: assignment.vehicle_id,
    driverId: assignment.driver_id,
    action: 'unassigned',
    reason,
  });
}
```

---

## Dependencies

- AD-002 - Driver Management (driver detail view)
- AD-003 - Vehicle Management (vehicle detail view)
- `02-DATABASE-SCHEMA.md` - driver_vehicle_assignments table

---

## Testing Requirements

### Integration Tests

```typescript
describe('AD-004: Vehicle Assignment', () => {
  describe('Assign Vehicle', () => {
    it('creates assignment from driver detail');
    it('creates assignment from vehicle detail');
    it('sets primary flag');
    it('transfers vehicle if already assigned');
    it('creates history record');
  });
  
  describe('Borrowed Assignment', () => {
    it('requires end date');
    it('can extend end date');
    it('can end early');
  });
  
  describe('Unassign', () => {
    it('requires reason');
    it('ends assignment record');
    it('auto-assigns new primary if needed');
    it('creates history record');
  });
  
  describe('Transfer', () => {
    it('unassigns from old driver');
    it('assigns to new driver');
    it('creates history for both');
    it('requires reason');
  });
  
  describe('Assignment History', () => {
    it('shows on vehicle detail');
    it('shows on driver detail');
    it('includes all actions');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
