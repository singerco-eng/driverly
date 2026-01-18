# AD-002: Driver Management

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 2 - Admin Core

---

## Overview

Driver Management provides Admin and Coordinator users with tools to view, manage, and take actions on approved drivers. This includes viewing driver details, changing operational status, editing profiles, and monitoring credential/vehicle status.

**Note:** This feature covers drivers AFTER application approval. For application processing, see AD-001.

---

## User Stories

### Admin Stories

1. **As an Admin**, I want to see all my company's drivers so that I can monitor and manage them.

2. **As an Admin**, I want to view a driver's complete profile so that I have all information in one place.

3. **As an Admin**, I want to edit a driver's profile so that I can correct or update their information.

4. **As an Admin**, I want to suspend a driver so that they can no longer take trips.

5. **As an Admin**, I want to reactivate a suspended/inactive driver so that they can work again.

6. **As an Admin**, I want to archive a driver so that they're removed from active lists but data is preserved.

7. **As an Admin**, I want to see a driver's credential status at a glance so that I know if they're eligible to work.

8. **As an Admin**, I want to add internal notes to a driver's profile for my records.

### Coordinator Stories

9. **As a Coordinator**, I want to view drivers and their details so that I can support operations.

10. **As a Coordinator**, I want to deactivate/reactivate drivers so that I can manage day-to-day operations.

---

## Data Model

### Driver Operational Status

The `drivers.status` field (from `02-DATABASE-SCHEMA.md`):

```sql
-- drivers.status values
'active'    -- Ready to work, wants trips (if credentials valid)
'inactive'  -- Not currently working (vacation, personal leave)
'suspended' -- Blocked by admin (terminated, compliance issue)
'archived'  -- Soft-deleted, historical record only
```

### Additional Fields

```sql
-- Add to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  -- Status tracking
  status_changed_at timestamptz,
  status_changed_by uuid REFERENCES users(id),
  suspension_reason text,
  
  -- Profile
  avatar_url text,
  
  -- Activity tracking
  last_active_at timestamptz,
  
  -- Archive
  archived_at timestamptz,
  archived_by uuid REFERENCES users(id);
```

### Status State Diagram

```
                    ┌─────────────────┐
   (after approval) │     active      │◄─────────────┐
                    └────────┬────────┘              │
                             │                       │
         ┌───────────────────┼───────────────┐       │
         │                   │               │       │
         ▼                   ▼               │       │
    ┌──────────┐       ┌───────────┐         │       │
    │ inactive │◄─────►│ suspended │─────────┘       │
    └────┬─────┘       └─────┬─────┘                 │
         │                   │                       │
         │                   ▼                       │
         │            ┌───────────┐                  │
         └───────────►│  archived │ (terminal)       │
                      └───────────┘                  │
                             │                       │
                             └───────────────────────┘
                                  (can unarchive)
```

**Status Transitions:**
| From | To | Who Can Do | Requires Reason |
|------|-----|-----------|-----------------|
| active | inactive | Admin, Coordinator, Driver | No |
| active | suspended | Admin only | Yes |
| inactive | active | Admin, Coordinator, Driver | No |
| inactive | suspended | Admin only | Yes |
| suspended | active | Admin only | No |
| suspended | inactive | Admin only | No |
| any | archived | Admin only | No |
| archived | active | Admin only | No |

---

## UI Specifications

### 1. Driver List View

**Route:** `/admin/drivers`

**Component:** `EnhancedDataView` (card/table toggle)

```
┌─────────────────────────────────────────────────────────────────┐
│  Drivers                                 [Card|Table] [+ Add]   │
├─────────────────────────────────────────────────────────────────┤
│  [Search by name, email...]  [Status ▼]  [Type ▼]  [Broker ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JS]  John Smith           ● Active    1099             │   │
│  │       Last active 2 hours ago                           │   │
│  │       🚗 2022 Toyota Camry  │  ✓ Eligible (3 brokers)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [JD]  Jane Doe             ○ Inactive  W2               │   │
│  │       Last active 3 days ago                            │   │
│  │       🚗 Company Van #12    │  ⚠ 1 expiring credential  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [BW]  Bob Wilson           ✕ Suspended 1099             │   │
│  │       Suspended Jan 10, 2026                            │   │
│  │       🚗 2021 Honda Accord  │  ✕ Missing credentials    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 3 of 45 drivers                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Card View Fields:**
| Field | Display |
|-------|---------|
| Avatar | Photo or monogram initials |
| Name | Full name, clickable |
| Status | Badge: Active (green), Inactive (gray), Suspended (red) |
| Employment Type | W2 or 1099 |
| Last Active | Relative time or "Suspended [date]" |
| Primary Vehicle | Make/model or "Company Van #X" |
| Credential Status | See "Credential Status Display" below |

**Table Columns:**
- Avatar + Name
- Status
- Type (W2/1099)
- Primary Vehicle
- Credential Status
- Last Active
- Actions

**Filters:**
| Filter | Options |
|--------|---------|
| Search | Name, email, phone |
| Status | All, Active, Inactive, Suspended, Archived |
| Employment Type | All, W2, 1099 |
| Broker | All, [list of brokers] |

**"+ Add" Button:** Opens AD-001 application link or manual driver add flow (future)

---

### 2. Credential Status Display

⚠️ **Note:** Final UX pending AD-005/AD-006 credential specs. Placeholder approach below.

**Challenge:** Credential eligibility is per-broker. Need to show at-a-glance status without overwhelming.

**Proposed Approach:**

**Summary Badge + Expandable:**
```
┌─────────────────────────────────────────────┐
│  ✓ Eligible (3 brokers)                     │  ← Summary
│  ──────────────────────────────────────     │
│  ✓ Global         All credentials valid     │  ← Expandable detail
│  ✓ Broker A       Eligible                  │
│  ✓ Broker B       Eligible                  │
│  ⚠ Broker C       1 credential expiring     │
└─────────────────────────────────────────────┘
```

**Summary States:**
| State | Badge | Meaning |
|-------|-------|---------|
| All Good | ✓ Eligible (N brokers) | All global + all broker credentials valid |
| Issues | ⚠ N issues | Some credentials expiring/missing |
| Not Eligible | ✕ Not eligible | Missing required credentials |

**In List View:** Show summary badge only. Click to expand or go to detail.

**In Detail View:** Show full breakdown by broker.

---

### 3. Driver Detail View

**Route:** `/admin/drivers/[id]`

**Layout:** Header + tabbed content

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Drivers                                              │
│                                                                 │
│  ┌────────┐  John Smith                    ● Active             │
│  │  [JS]  │  john.smith@email.com                               │
│  │        │  (555) 123-4567                                     │
│  └────────┘  1099 Independent Contractor                        │
│                                                                 │
│              [Message]  [Edit]  [•••]                           │
│                                                                 │
│  [Overview] [Profile] [Vehicles] [Credentials] [Availability]   │
│  [Trips] [Payments] [Activity]                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [Tab Content]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Header Actions:**
- **Message** → Navigate to messaging with this driver
- **Edit** → Open edit modal (Admin only)
- **[•••] Menu:**
  - Set Inactive / Set Active
  - Suspend Driver (Admin only)
  - Archive Driver (Admin only)
  - View as Driver (future - impersonation)

---

### Tab: Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Active       │  │ 3 Brokers    │  │ 12 Trips     │          │
│  │ Since Jan 10 │  │ Eligible     │  │ This Month   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ $2,450       │  │ 2 Vehicles   │  │ Last Active  │          │
│  │ This Month   │  │ 1 Primary    │  │ 2 hours ago  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  Credential Status                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Global Credentials    All 5 credentials valid         │   │
│  │ ✓ Broker A              Eligible                        │   │
│  │ ✓ Broker B              Eligible                        │   │
│  │ ⚠ Broker C              1 credential expiring in 7 days │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Quick Actions                                                  │
│  [View Credentials]  [View Schedule]  [View Trips]             │
│                                                                 │
│  Internal Notes                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Great driver, very reliable. - Admin, Jan 15            │   │
│  │                                                         │   │
│  │ [+ Add Note]                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Profile

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Personal Information                                  [Edit]   │
│  ───────────────────────────────────────────────────────────── │
│  Full Name          John Smith                                  │
│  Email              john.smith@email.com                        │
│  Phone              (555) 123-4567                              │
│  Date of Birth      January 15, 1990 (35 years old)            │
│  Address            123 Main St, Apt 4B                         │
│                     Austin, TX 78701                            │
│                                                                 │
│  Employment                                                     │
│  ───────────────────────────────────────────────────────────── │
│  Type               1099 Independent Contractor                 │
│  Joined             January 10, 2026                            │
│  Application        Approved by Admin on Jan 12, 2026          │
│                                                                 │
│  Driver's License                                      [Edit]   │
│  ───────────────────────────────────────────────────────────── │
│  Number             TX-12345678                                 │
│  State              Texas                                       │
│  Expiration         December 31, 2027                          │
│                                                                 │
│  [View Front]  [View Back]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Vehicles

Links to AD-003/AD-004 functionality. Shows:
- List of assigned vehicles
- Primary vehicle indicator
- Vehicle status and credentials
- Actions to assign/unassign (Admin only)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Vehicles                                    [+ Assign Vehicle] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ★ PRIMARY                                               │   │
│  │ 2022 Toyota Camry                          Sedan        │   │
│  │ Plate: ABC-1234 • Owner: Driver                        │   │
│  │ ✓ All credentials valid                                │   │
│  │                                              [Manage]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2020 Honda Odyssey                  Wheelchair Van      │   │
│  │ Plate: XYZ-5678 • Owner: Company                       │   │
│  │ ⚠ Insurance expiring in 14 days                        │   │
│  │                                              [Manage]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Credentials

Links to AD-006 functionality. Shows:
- Global credentials status
- Per-broker credential status
- Upload/manage actions (some Admin-only)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Credentials                                                    │
│                                                                 │
│  Global Credentials (Required for all brokers)                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Background Check         Approved Jan 10, 2026       │   │
│  │ ✓ Driver's License         Valid until Dec 31, 2027    │   │
│  │ ✓ Vehicle Insurance        Valid until Jun 30, 2026    │   │
│  │ ⚠ Medical Certificate      Expiring in 30 days         │   │
│  │ ✕ Defensive Driving Cert   Not submitted               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Broker A Credentials                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Medicaid Certification   Approved Jan 12, 2026       │   │
│  │ ✓ HIPAA Training           Completed Jan 11, 2026      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Broker B Credentials                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✕ Broker B Certification   Not submitted               │   │
│  │   (Driver not eligible for Broker B trips)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Tab: Availability (Future Link)

Shows calendar/schedule overview. Links to DR-005.

---

### Tab: Trips (Future Link)

Shows trip history. Links to trip management features.

---

### Tab: Payments (Future Link)

Shows payment history. Links to DR-007.

---

### Tab: Activity (Future)

Audit log of changes to this driver's record.

---

### 4. Edit Driver Modal

**Trigger:** Edit button in detail view (Admin only)

**Component:** `ElevatedContainer` with `FormToggle` tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Driver                                               [X]  │
├─────────────────────────────────────────────────────────────────┤
│  [Personal Info]  [License]                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Full Name *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ John Smith                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ Email *                 │  │ Phone *                 │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  Date of Birth *                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ January 15, 1990                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Address                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 123 Main St                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ... (full address fields)                                     │
│                                                                 │
│  Employment Type                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ 1099 Independent Contractor                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ⚠ Changing employment type may affect credential requirements │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

**Editable Fields:**
- Full Name
- Email
- Phone
- Date of Birth
- Full Address
- Employment Type (with warning about credential implications)
- License Number, State, Expiration
- License Photos (re-upload)

---

### 5. Suspend Driver Modal

**Trigger:** Actions menu → Suspend Driver

**Component:** `Modal`

```
┌─────────────────────────────────────────────────────────────────┐
│  Suspend Driver                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to suspend John Smith?                   │
│                                                                 │
│  • Driver will not be able to accept trips                      │
│  • Driver will see the suspension reason when logging in        │
│  • You can reactivate them at any time                          │
│                                                                 │
│  Suspension Reason *                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Policy violation                                    │   │
│  │   • Customer complaint                                  │   │
│  │   • Failed compliance check                             │   │
│  │   • Contract terminated                                 │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Additional Details                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Suspend Driver]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. Archive Driver Modal

**Trigger:** Actions menu → Archive Driver

**Component:** `Modal`

```
┌─────────────────────────────────────────────────────────────────┐
│  Archive Driver                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to archive John Smith?                   │
│                                                                 │
│  • Driver will be removed from active lists                     │
│  • All data will be preserved for records                       │
│  • You can restore them later if needed                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Archive Driver]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Internal Notes

**Component:** Notes section in Overview tab

```
┌─────────────────────────────────────────────────────────────────┐
│  Internal Notes                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Great driver, very reliable. Prefers morning shifts.    │   │
│  │ — Admin Name, January 15, 2026                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Completed extra training for wheelchair transport.      │   │
│  │ — Coordinator Name, January 12, 2026                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Add a note...                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  [Add Note]                                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data Model:**

```sql
CREATE TABLE driver_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  content         text NOT NULL,
  
  created_by      uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Soft delete
  deleted_at      timestamptz,
  deleted_by      uuid REFERENCES users(id)
);

CREATE INDEX idx_driver_notes_driver ON driver_notes(driver_id);

-- RLS
ALTER TABLE driver_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view driver notes"
  ON driver_notes FOR SELECT
  USING (company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);

CREATE POLICY "Admins and coordinators can create notes"
  ON driver_notes FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'coordinator')
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );
```

---

## Acceptance Criteria

### AC-1: Driver List

- [ ] Shows all drivers for company
- [ ] Default sort by last active (most recent first)
- [ ] Can search by name, email, phone
- [ ] Can filter by status (All, Active, Inactive, Suspended, Archived)
- [ ] Can filter by employment type (All, W2, 1099)
- [ ] Can toggle between card and table view
- [ ] Each driver shows: avatar/monogram, name, status, type, vehicle, credential status, last active
- [ ] Clicking driver navigates to detail view

### AC-2: Driver Avatar

- [ ] Shows uploaded photo if available
- [ ] Shows monogram initials if no photo
- [ ] Monogram uses consistent colors based on name

### AC-3: Credential Status Display

- [ ] Shows summary badge in list (✓/⚠/✕)
- [ ] Expandable or clickable for detail
- [ ] Shows global credential status
- [ ] Shows per-broker credential status
- [ ] Indicates expiring credentials (within 30 days)

### AC-4: Driver Detail View

- [ ] Shows driver header with avatar, name, contact, status
- [ ] Header actions: Message, Edit, Status menu
- [ ] Tabs: Overview, Profile, Vehicles, Credentials, Availability, Trips, Payments, Activity
- [ ] Overview shows stats, credential summary, internal notes
- [ ] Profile shows all driver information

### AC-5: Edit Driver (Admin Only)

- [ ] Can edit personal info (name, email, phone, DOB, address)
- [ ] Can edit employment type (with warning)
- [ ] Can edit license info
- [ ] Can re-upload license photos
- [ ] Coordinators cannot access edit

### AC-6: Status Changes

- [ ] Admin can: activate, deactivate, suspend, archive any driver
- [ ] Coordinator can: activate, deactivate drivers (not suspend/archive)
- [ ] Driver can: self-deactivate/reactivate (from their portal)
- [ ] Suspension requires reason
- [ ] Status change records who/when
- [ ] Suspended drivers see reason on login

### AC-7: Archive Driver

- [ ] Admin can archive driver
- [ ] Archived drivers hidden from default list
- [ ] Can filter to show archived
- [ ] Can unarchive (restore) driver
- [ ] All data preserved

### AC-8: Internal Notes

- [ ] Admin and Coordinator can add notes
- [ ] Notes show author and timestamp
- [ ] Notes are internal only (driver cannot see)
- [ ] Notes can be soft-deleted by author or admin

### AC-9: Coordinator Permissions

- [ ] Coordinators can view all driver info
- [ ] Coordinators can activate/deactivate drivers
- [ ] Coordinators can add notes
- [ ] Coordinators cannot edit driver profile
- [ ] Coordinators cannot suspend or archive

### AC-10: Navigation

- [ ] Message button navigates to messaging with driver context
- [ ] Vehicle tab links to vehicle management
- [ ] Credential tab links to credential review
- [ ] Availability tab links to schedule view

---

## API/Queries

### Queries

```typescript
// Get drivers for company
const { data: drivers } = await supabase
  .from('drivers')
  .select(`
    *,
    user:users(id, email, full_name, phone, avatar_url),
    primary_vehicle:driver_vehicle_assignments!inner(
      vehicle:vehicles(*)
    )
  `)
  .eq('company_id', companyId)
  .eq('driver_vehicle_assignments.is_primary', true)
  .neq('status', 'archived') // or include based on filter
  .order('last_active_at', { ascending: false });

// Get single driver with full details
const { data: driver } = await supabase
  .from('drivers')
  .select(`
    *,
    user:users(*),
    vehicles:driver_vehicle_assignments(
      *,
      vehicle:vehicles(*)
    ),
    notes:driver_notes(
      *,
      author:users(full_name)
    ),
    credentials:driver_credentials(
      *,
      credential_type:credential_types(*)
    )
  `)
  .eq('id', driverId)
  .single();

// Get driver notes
const { data: notes } = await supabase
  .from('driver_notes')
  .select(`
    *,
    author:users(full_name)
  `)
  .eq('driver_id', driverId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

### Mutations

```typescript
// Update driver status
async function updateDriverStatus(
  driverId: string,
  status: 'active' | 'inactive' | 'suspended' | 'archived',
  reason?: string
) {
  const updates: any = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: currentUser.id,
  };
  
  if (status === 'suspended') {
    updates.suspension_reason = reason;
  }
  
  if (status === 'archived') {
    updates.archived_at = new Date().toISOString();
    updates.archived_by = currentUser.id;
  }
  
  return supabase
    .from('drivers')
    .update(updates)
    .eq('id', driverId);
}

// Update driver profile
async function updateDriverProfile(driverId: string, data: DriverUpdate) {
  // Update driver record
  await supabase
    .from('drivers')
    .update({
      date_of_birth: data.dateOfBirth,
      license_number: data.licenseNumber,
      license_state: data.licenseState,
      license_expiration: data.licenseExpiration,
      employment_type: data.employmentType,
    })
    .eq('id', driverId);
  
  // Update user record
  await supabase
    .from('users')
    .update({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      // address fields...
    })
    .eq('id', data.userId);
}

// Add note
async function addDriverNote(driverId: string, content: string) {
  return supabase
    .from('driver_notes')
    .insert({
      driver_id: driverId,
      company_id: currentCompanyId,
      content,
      created_by: currentUser.id,
    });
}
```

---

## Business Rules

1. **Status permissions:**
   - Admins can change any status
   - Coordinators can only toggle active/inactive
   - Drivers can toggle active/inactive on themselves

2. **Suspension:**
   - Requires reason (shown to driver)
   - Only admin can suspend
   - Suspended drivers can log in but see suspension message

3. **Archive:**
   - Soft delete - data preserved
   - Hidden from default lists
   - Can be restored by admin

4. **Employment type change:**
   - May affect credential requirements
   - Show warning when changing
   - Does not auto-change credential requirements (manual process)

5. **Notes:**
   - Internal only, never visible to driver
   - Cannot be hard-deleted
   - Show author and timestamp

---

## Notifications

⚠️ **Note:** In-app notification system to be specified separately.

| Event | In-App Notification | Email |
|-------|---------------------|-------|
| Driver credential expiring (30 days) | Admin + Driver | Driver |
| Driver credential expired | Admin | Driver |
| Driver went inactive | — | — |
| Driver suspended | — | Driver |

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - drivers, users tables
- AD-001 - Driver Applications (creates initial driver)
- AD-003/AD-004 - Vehicle management (Vehicles tab)
- AD-005/AD-006 - Credential management (Credentials tab)
- AD-011 - Messaging (Message button)
- DR-005 - Availability (Availability tab)

---

## Out of Scope

- Bulk driver actions
- Driver impersonation (view as driver)
- Activity/audit log tab (future)
- In-app notification system (separate spec)
- Driver self-service profile editing (DR-002)

---

## Testing Requirements

### Integration Tests

```typescript
describe('AD-002: Driver Management', () => {
  describe('AC-1: Driver List', () => {
    it('returns all drivers for company');
    it('filters by status');
    it('filters by employment type');
    it('searches by name/email');
  });
  
  describe('AC-5: Edit Driver', () => {
    it('allows admin to edit profile');
    it('blocks coordinator from editing');
    it('updates both driver and user records');
  });
  
  describe('AC-6: Status Changes', () => {
    it('admin can suspend with reason');
    it('coordinator can toggle active/inactive');
    it('coordinator cannot suspend');
    it('records who changed status');
  });
  
  describe('AC-7: Archive', () => {
    it('sets archived status and timestamp');
    it('excludes from default list');
    it('can be restored');
  });
  
  describe('AC-8: Notes', () => {
    it('admin can add note');
    it('coordinator can add note');
    it('notes show author');
    it('soft delete preserves note');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
