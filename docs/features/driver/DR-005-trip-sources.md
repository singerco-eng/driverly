# DR-005: Trip Sources

> **Last Updated:** 2026-01-30  
> **Status:** Draft  
> **Phase:** 3 - Driver Core

---

## Overview

Trip Sources is the driver's self-service interface for discovering, requesting, and managing their trip source (broker) assignments. Drivers can view available trip sources, request to join new ones, track pending requests, and see their eligibility status for each source.

**Key Principle:** Drivers must complete their global credentials before accessing trip sources. Once global credentials are complete, drivers can browse and request trip sources, then complete any broker-specific credentials after assignment.

**Terminology Note:** The database uses "brokers" internally, but the UI displays "Trip Sources" to drivers.

---

## Prerequisites: Global Credentials First

Before a driver can view or interact with trip sources, they must complete their **global credentials** as part of onboarding (DR-001). This ensures:

1. Drivers have baseline qualifications (license, background check, etc.)
2. Admins can assess basic eligibility before broker assignment
3. Trip source credentials build on global requirements

```
┌─────────────────────────────────────────────────────────────────┐
│  ONBOARDING FLOW                                                │
│                                                                 │
│  1. Profile Complete      ─┐                                    │
│  2. Vehicle Added (1099)   │                                    │
│  3. Global Credentials    ─┼─→ Onboarding Complete              │
│  4. Availability Set       │        ↓                           │
│  5. Payment Info          ─┘   Trip Sources Unlocked            │
│                                     ↓                           │
│                            Browse & Request Trip Sources        │
│                                     ↓                           │
│                            Complete Broker-Specific Credentials │
│                                     ↓                           │
│                            Eligible for Trips                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Employment Type Differences

### 1099 Independent Contractors

| Aspect | Details |
|--------|---------|
| Vehicle | Owns their vehicle(s) |
| Vehicle Credentials | Must complete global + broker-specific vehicle credentials |
| Eligibility | Vehicle type must match broker requirements |
| Trip Sources | See brokers that accept `1099` employment type |

### W2 Employees

| Aspect | Details |
|--------|---------|
| Vehicle | May be assigned a company vehicle |
| Vehicle Credentials | Company may manage vehicle credentials |
| Eligibility | Assigned vehicle type must match broker requirements |
| Trip Sources | See brokers that accept `w2` employment type |

**Common Flow:** Both employment types follow the same trip source UI and request process.

---

## Data Model

### Existing Tables (from AD-007)

The trip source system uses existing tables - no new migrations required:

```sql
-- brokers: Trip source configuration (already exists)
-- Key fields for driver view:
--   name, logo_url, source_type, service_states
--   accepted_vehicle_types, accepted_employment_types
--   allow_driver_requests, allow_driver_auto_signup
--   status (active/inactive)

-- driver_broker_assignments: Driver-broker relationships (already exists)
-- Key fields:
--   driver_id, broker_id, status (pending/assigned/removed)
--   requested_by (admin/driver), requested_at
--   approved_by, approved_at

-- credential_types: Includes broker-scoped credentials (already exists)
-- scope = 'broker' AND broker_id = <broker_id>
```

### Assignment Modes

Brokers can be configured with different assignment modes:

| Mode | `allow_driver_requests` | `allow_driver_auto_signup` | Driver Action |
|------|------------------------|---------------------------|---------------|
| Admin Only | `false` | `false` | View only (cannot request) |
| Driver Requests | `true` | `false` | Request → Admin approves |
| Auto-Signup | `true` or `false` | `true` | Join instantly |

### Existing RLS Policies

```sql
-- Drivers can view own assignments
-- Drivers can request or auto-join broker (with service area check)
-- Drivers can cancel pending requests
-- Drivers can view brokers in their company
```

### Existing Helper Function

```sql
-- can_driver_join_broker(driver_id, broker_id) returns:
--   can_join: boolean
--   join_mode: 'auto_signup' | 'request' | 'admin_only' | 'not_eligible'
--   reason: text explanation
```

---

## Eligibility Calculation

A driver is **eligible** for a trip source when:

```typescript
function isDriverEligibleForBroker(driver: Driver, broker: Broker): EligibilityResult {
  const issues: string[] = [];
  
  // 1. Employment type accepted
  if (!broker.accepted_employment_types.includes(driver.employment_type)) {
    issues.push(`Employment type (${driver.employment_type}) not accepted`);
  }
  
  // 2. Driver in broker's service area
  if (broker.service_states.length > 0 && !broker.service_states.includes(driver.state)) {
    issues.push(`Not in service area (${driver.state})`);
  }
  
  // 3. All global driver credentials approved
  const globalDriverCreds = getDriverCredentials(driver.id, 'global');
  const missingGlobal = globalDriverCreds.filter(c => c.status !== 'approved');
  if (missingGlobal.length > 0) {
    issues.push(`Missing ${missingGlobal.length} global credential(s)`);
  }
  
  // 4. All broker-specific driver credentials approved (if assigned)
  if (isAssigned) {
    const brokerDriverCreds = getDriverCredentials(driver.id, broker.id);
    const missingBroker = brokerDriverCreds.filter(c => c.status !== 'approved');
    if (missingBroker.length > 0) {
      issues.push(`Missing ${missingBroker.length} broker credential(s)`);
    }
  }
  
  // 5. Has at least one eligible vehicle
  const vehicles = getDriverVehicles(driver.id);
  const eligibleVehicle = vehicles.find(v => 
    v.status === 'active' &&
    broker.accepted_vehicle_types.includes(v.vehicle_type) &&
    allVehicleCredentialsApproved(v.id, broker.id)
  );
  
  if (!eligibleVehicle) {
    issues.push('No eligible vehicle');
  }
  
  return {
    eligible: issues.length === 0,
    issues,
  };
}
```

---

## User Stories

### Driver Stories

1. **As a Driver**, I want to see all available trip sources so that I can expand my trip opportunities.

2. **As a Driver**, I want to see which trip sources I'm already assigned to so that I know where I can accept trips.

3. **As a Driver**, I want to see my eligibility status for each trip source so that I know what credentials I need.

4. **As a Driver**, I want to request to join a trip source so that I can work with more brokers.

5. **As a Driver**, I want to instantly join trip sources that allow auto-signup so that I can start faster.

6. **As a Driver**, I want to see my pending requests so that I know what's awaiting approval.

7. **As a Driver**, I want to cancel a pending request if I change my mind.

8. **As a Driver**, I want to see the requirements for a trip source before requesting so that I can prepare.

9. **As a Driver**, I want to see broker-specific credentials after joining so that I can complete them.

10. **As a Driver**, I want to filter trip sources by type so that I can find relevant ones.

11. **As a 1099 Driver**, I want to see which of my vehicles are eligible for each trip source.

12. **As a W2 Driver**, I want to see if my assigned vehicle is eligible for each trip source.

---

## UI Specifications

### 1. Trip Sources Page

**Route:** `/driver/brokers` (internal) → Displayed as "My Trip Sources"

**Prerequisite Check:** If global credentials incomplete, show guidance instead of trip sources.

**Component:** Tabbed layout with sections

```
┌─────────────────────────────────────────────────────────────────┐
│  My Trip Sources                                                │
│  View and manage your trip source assignments.                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ✓ Global credentials complete                             │  │
│  │   You can now request trip source assignments.            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Assigned (2)]  [Pending (1)]  [Available (5)]                 │
│                                                                 │
│  [Search...]  [Type ▼]                                          │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  [Tab Content - See sections below]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Filters:**
| Filter | Options |
|--------|---------|
| Search | Name |
| Type | All, State Broker, Facility, Insurance, Private, Corporate |

---

### 2. Global Credentials Incomplete State

**If driver hasn't completed global credentials:**

```
┌─────────────────────────────────────────────────────────────────┐
│  My Trip Sources                                                │
│  View and manage your trip source assignments.                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  🔒 Complete Global Credentials First                    │  │
│  │                                                          │  │
│  │  Before you can view and request trip sources, you       │  │
│  │  need to complete your required credentials.             │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 3 credentials remaining                         │  │  │
│  │  │    • Driver's License                              │  │  │
│  │  │    • Background Check                              │  │  │
│  │  │    • HIPAA Certification                           │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                          │  │
│  │                        [Complete Credentials →]          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Assigned Tab

**Shows trip sources the driver is currently assigned to:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Assigned Trip Sources (2)                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  MedTrans                          ✓ Eligible    │   │
│  │         State Broker · TX, OK, LA                       │   │
│  │                                                         │   │
│  │         All credentials complete                        │   │
│  │         You can accept trips from this source           │   │
│  │                                                         │   │
│  │         Sedan, Wheelchair Van                           │   │
│  │                                                         │   │
│  │                                   [View Requirements]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  StateHealth Transport             ⚠ Ineligible  │   │
│  │         State Broker · TX                               │   │
│  │                                                         │   │
│  │         Missing credentials:                            │   │
│  │         • StateHealth Training Certificate              │   │
│  │                                                         │   │
│  │         Sedan, Van, Wheelchair Van                      │   │
│  │                                                         │   │
│  │                                   [View Requirements]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Card Fields:**
| Field | Description |
|-------|-------------|
| Logo | Broker logo or placeholder icon |
| Name | Trip source name |
| Type | Source type badge (State Broker, Facility, etc.) |
| Service Area | States served |
| Eligibility Badge | ✓ Eligible (green), ⚠ Ineligible (yellow) |
| Status Message | "All credentials complete" or missing items |
| Vehicle Types | Accepted vehicle types |
| Action | View Requirements button |

---

### 4. Pending Tab

**Shows pending requests awaiting admin approval:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Pending Requests (1)                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  City Medical Transport            ⏳ Pending     │   │
│  │         Facility · TX                                   │   │
│  │                                                         │   │
│  │         Requested January 28, 2026                      │   │
│  │         Awaiting admin approval                         │   │
│  │                                                         │   │
│  │         Sedan, Wheelchair Van                           │   │
│  │                                                         │   │
│  │                                    [Cancel Request]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── What happens next? ─────────────────────────────────────   │
│                                                                 │
│  Your admin will review your request and either approve or     │
│  deny it. Once approved, you'll see this trip source in your   │
│  "Assigned" tab and can complete any additional credentials.   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Pending Requests (0)                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  No pending requests                                    │   │
│  │                                                         │   │
│  │  Browse available trip sources and request to join      │   │
│  │  the ones that match your qualifications.               │   │
│  │                                                         │   │
│  │                    [View Available →]                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Available Tab

**Shows trip sources the driver can request or join:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Available Trip Sources (5)                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Senior Care Network                             │   │
│  │         Facility · TX                                   │   │
│  │                                                         │   │
│  │         2 additional credentials required               │   │
│  │         Sedan, Wheelchair Van, Stretcher Van            │   │
│  │                                                         │   │
│  │                    [View Details]  [Request to Join]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  HealthRide Express             ⚡ Auto-Signup    │   │
│  │         Insurance · TX, OK                              │   │
│  │                                                         │   │
│  │         1 additional credential required                │   │
│  │         Sedan, Van                                      │   │
│  │                                                         │   │
│  │                    [View Details]  [Join Now]           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Premium Private Transport        🔒 Admin Only  │   │
│  │         Private · TX                                    │   │
│  │                                                         │   │
│  │         Contact your admin for assignment               │   │
│  │         Sedan                                           │   │
│  │                                                         │   │
│  │                    [View Details]                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Metro Ambulette                  ✕ Not Eligible │   │
│  │         State Broker · NY, NJ                           │   │
│  │                                                         │   │
│  │         Not in service area (your state: TX)            │   │
│  │         Wheelchair Van, Stretcher Van                   │   │
│  │                                                         │   │
│  │                    [View Details]                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Assignment Mode Badges:**
| Mode | Badge | Action Button |
|------|-------|---------------|
| Auto-Signup | ⚡ Auto-Signup (blue) | Join Now |
| Driver Requests | (none) | Request to Join |
| Admin Only | 🔒 Admin Only (gray) | (no action) |
| Not Eligible | ✕ Not Eligible (gray) | (no action) |

---

### 6. Trip Source Details Modal

**Trigger:** "View Details" or "View Requirements" button

```
┌─────────────────────────────────────────────────────────────────┐
│  MedTrans                                                  [X]  │
│  State Broker                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── Service Area ─────────────────────────────────────────────  │
│                                                                 │
│  Texas (TX), Oklahoma (OK), Louisiana (LA)                      │
│                                                                 │
│  ── Accepted Vehicles ────────────────────────────────────────  │
│                                                                 │
│  ✓ Sedan                                                       │
│  ✓ Wheelchair Van                                              │
│                                                                 │
│  ── Your Vehicles ────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2022 Toyota Camry (Sedan)                  ✓ Eligible   │   │
│  │ All vehicle credentials complete                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Required Credentials ─────────────────────────────────────  │
│                                                                 │
│  Driver Credentials                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Medicaid Certification            Approved Jan 10     │   │
│  │ ✓ MedTrans Driver Agreement         Signed Jan 10       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Vehicle Credentials (2022 Toyota Camry)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ MedTrans Vehicle Approval         Verified Jan 12     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✓ You are fully eligible for MedTrans trips                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                    [Close]      │
└─────────────────────────────────────────────────────────────────┘
```

**For available (not yet assigned) trip sources:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Senior Care Network                                       [X]  │
│  Facility                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── Service Area ─────────────────────────────────────────────  │
│                                                                 │
│  Texas (TX)                                                     │
│  ✓ You are in the service area                                 │
│                                                                 │
│  ── Accepted Vehicles ────────────────────────────────────────  │
│                                                                 │
│  ✓ Sedan                                                       │
│  ✓ Wheelchair Van                                              │
│  ✓ Stretcher Van                                               │
│                                                                 │
│  ── Your Vehicles ────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2022 Toyota Camry (Sedan)                  ✓ Eligible   │   │
│  │ Vehicle type accepted                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Additional Credentials ───────────────────────────────────  │
│                                                                 │
│  If you join, you'll need to complete:                          │
│                                                                 │
│  Driver Credentials (2)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Senior Care Certification                             │   │
│  │ ○ Facility Training Agreement                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Close]  [Request to Join]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Request Confirmation Modal

**Trigger:** "Request to Join" button

```
┌─────────────────────────────────────────────────────────────────┐
│  Request to Join                                           [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're requesting to join:                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  Senior Care Network                             │   │
│  │         Facility · TX                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  What happens next:                                             │
│                                                                 │
│  1. Your request will be sent to your admin                     │
│  2. They will review and approve or deny your request           │
│  3. Once approved, you'll need to complete 2 additional         │
│     credentials for this trip source                            │
│  4. After credentials are approved, you can accept trips        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Submit Request]         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. Auto-Join Confirmation Modal

**Trigger:** "Join Now" button (auto-signup brokers)

```
┌─────────────────────────────────────────────────────────────────┐
│  Join Trip Source                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're joining:                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [LOGO]  HealthRide Express                              │   │
│  │         Insurance · TX, OK                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚡ This trip source allows instant signup!                     │
│                                                                 │
│  After joining:                                                 │
│                                                                 │
│  • You'll be immediately assigned to this trip source           │
│  • Complete 1 additional credential to start accepting trips    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Join Now]               │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9. Cancel Request Confirmation

**Trigger:** "Cancel Request" button on pending card

```
┌─────────────────────────────────────────────────────────────────┐
│  Cancel Request                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Are you sure you want to cancel your request to join           │
│  City Medical Transport?                                        │
│                                                                 │
│  You can request to join again at any time.                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Keep Request]  [Cancel Request]   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10. Success States

**After requesting:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Request Submitted                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your request to join Senior Care Network has been submitted.   │
│                                                                 │
│  Your admin will review it soon. You can track the status       │
│  in the "Pending" tab.                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [View Pending]  [Close]            │
└─────────────────────────────────────────────────────────────────┘
```

**After auto-join:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Successfully Joined                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You've joined HealthRide Express!                              │
│                                                                 │
│  Complete your additional credentials to start accepting trips. │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                        [View Credentials]  [View Assigned]      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 11. Mobile Considerations

**Touch-friendly cards:**
- Full-width cards on mobile
- Large tap targets for actions
- Collapsible sections for details

**Mobile Layout:**
```
┌─────────────────────────────┐
│ ☰  Trip Sources      [👤]  │
├─────────────────────────────┤
│                             │
│ [Assigned] [Pending] [Avail]│
│                             │
│ ┌─────────────────────────┐ │
│ │ [LOGO] MedTrans         │ │
│ │ State Broker · TX       │ │
│ │ ✓ Eligible              │ │
│ │                         │ │
│ │ [View Requirements]     │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ [LOGO] StateHealth      │ │
│ │ State Broker · TX       │ │
│ │ ⚠ 1 credential missing  │ │
│ │                         │ │
│ │ [View Requirements]     │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Prerequisites Check

- [ ] Page shows "Complete Global Credentials First" if onboarding incomplete
- [ ] Lists missing global credentials
- [ ] Link to credentials page
- [ ] Trip sources visible only after global credentials complete

### AC-2: Assigned Tab

- [ ] Shows all trip sources driver is assigned to
- [ ] Shows eligibility status (Eligible / Ineligible)
- [ ] Shows missing credentials for ineligible sources
- [ ] "View Requirements" opens details modal
- [ ] Empty state when no assignments

### AC-3: Pending Tab

- [ ] Shows all pending requests
- [ ] Shows request date
- [ ] "Cancel Request" button works
- [ ] Confirmation before canceling
- [ ] Empty state when no pending requests

### AC-4: Available Tab

- [ ] Shows trip sources not assigned/pending
- [ ] Filters by driver's employment type (W2/1099)
- [ ] Shows assignment mode badge (Auto-Signup, Admin Only)
- [ ] Shows service area
- [ ] Shows accepted vehicle types
- [ ] Shows required credential count
- [ ] Shows eligibility reason if not eligible (service area, vehicle type)

### AC-5: Request to Join

- [ ] "Request to Join" button for request-enabled brokers
- [ ] Confirmation modal with info about next steps
- [ ] Creates pending assignment on submit
- [ ] Success feedback
- [ ] Card moves to Pending tab

### AC-6: Auto-Join

- [ ] "Join Now" button for auto-signup brokers
- [ ] Confirmation modal
- [ ] Creates assigned status on submit (not pending)
- [ ] Success feedback with credentials prompt
- [ ] Card moves to Assigned tab

### AC-7: Admin Only Display

- [ ] No action button for admin-only brokers
- [ ] Shows "Contact your admin for assignment"
- [ ] "View Details" still works

### AC-8: Not Eligible Display

- [ ] Shows specific reason (service area, employment type, vehicle type)
- [ ] No action button
- [ ] "View Details" still works

### AC-9: Trip Source Details Modal

- [ ] Shows service area with driver eligibility
- [ ] Shows accepted vehicle types
- [ ] Shows driver's vehicles with eligibility
- [ ] Shows required credentials (completed and pending)
- [ ] For assigned: shows all broker credentials with status
- [ ] For available: shows what credentials will be required

### AC-10: Search and Filter

- [ ] Search by trip source name
- [ ] Filter by source type
- [ ] Persists across tab switches

### AC-11: Tab Counts

- [ ] Shows accurate count per tab
- [ ] Updates after actions (request, cancel, join)

### AC-12: Employment Type Filtering

- [ ] 1099 drivers only see brokers accepting 1099
- [ ] W2 drivers only see brokers accepting W2
- [ ] Some brokers may accept both

---

## API/Queries

### Get Driver's Trip Sources

```typescript
async function getDriverTripSources(driverId: string, companyId: string) {
  // Get all active brokers for the company
  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name');
  
  // Get driver's assignments
  const { data: assignments } = await supabase
    .from('driver_broker_assignments')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['pending', 'assigned']);
  
  // Get driver info for filtering
  const driver = await getDriver(driverId);
  
  // Categorize brokers
  const assigned = [];
  const pending = [];
  const available = [];
  
  for (const broker of brokers) {
    const assignment = assignments?.find(a => a.broker_id === broker.id);
    
    // Filter by employment type
    if (!broker.accepted_employment_types.includes(driver.employment_type)) {
      continue; // Don't show brokers that don't accept this driver type
    }
    
    if (assignment?.status === 'assigned') {
      assigned.push({ broker, assignment, eligibility: await getEligibility(driverId, broker.id) });
    } else if (assignment?.status === 'pending') {
      pending.push({ broker, assignment });
    } else {
      const joinCheck = await canDriverJoinBroker(driverId, broker.id);
      available.push({ broker, joinCheck });
    }
  }
  
  return { assigned, pending, available };
}
```

### Request to Join Broker

```typescript
async function requestBrokerAssignment(
  driverId: string,
  brokerId: string,
  companyId: string
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: companyId,
      status: 'pending',
      requested_by: 'driver',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Auto-Join Broker

```typescript
async function autoJoinBroker(
  driverId: string,
  brokerId: string,
  companyId: string
): Promise<DriverBrokerAssignment> {
  // RLS policy will verify auto-signup is enabled and driver is in service area
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: companyId,
      status: 'assigned',
      requested_by: 'driver',
      requested_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Cancel Pending Request

```typescript
async function cancelBrokerRequest(assignmentId: string): Promise<void> {
  // RLS policy will verify driver owns this request and it's pending
  const { error } = await supabase
    .from('driver_broker_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
}
```

### Check Join Eligibility (RPC)

```typescript
async function canDriverJoinBroker(
  driverId: string,
  brokerId: string
): Promise<{ can_join: boolean; join_mode: string; reason: string }> {
  const { data, error } = await supabase
    .rpc('can_driver_join_broker', {
      p_driver_id: driverId,
      p_broker_id: brokerId,
    });

  if (error) throw error;
  return data[0];
}
```

### Get Broker Credentials for Driver

```typescript
async function getBrokerCredentialsForDriver(driverId: string, brokerId: string) {
  // Get credential types for this broker
  const { data: types } = await supabase
    .from('credential_types')
    .select('*')
    .eq('broker_id', brokerId)
    .eq('is_active', true);
  
  // Get driver's submissions for these types
  const { data: submissions } = await supabase
    .from('driver_credentials')
    .select('*')
    .eq('driver_id', driverId)
    .in('credential_type_id', types.map(t => t.id));
  
  return types.map(type => ({
    type,
    submission: submissions?.find(s => s.credential_type_id === type.id),
    status: getCredentialStatus(submission),
  }));
}
```

---

## Business Rules

1. **Global credentials first:** Drivers cannot view trip sources until global credentials are complete

2. **Employment type filter:** Drivers only see brokers that accept their employment type (W2 or 1099)

3. **Service area check:** Drivers outside a broker's service area cannot request/join (enforced by RLS)

4. **Assignment modes:**
   - Admin Only: Driver can only view, cannot request
   - Driver Requests: Creates pending status, admin must approve
   - Auto-Signup: Creates assigned status immediately

5. **One request per broker:** Cannot have duplicate pending/assigned records for same broker

6. **Cancel pending only:** Drivers can only cancel pending requests, not remove assignments

7. **Broker-specific credentials:** Only visible after driver is assigned or pending

8. **Eligibility calculation:** Combines employment type, service area, vehicle type, and credentials

9. **Active brokers only:** Inactive brokers not shown to drivers

10. **Vehicle eligibility:** For 1099 drivers, at least one owned vehicle must match broker's accepted types

---

## Dependencies

- **DR-001** - Onboarding (global credentials completion tracking)
- **DR-004** - Credential Submission (broker credentials after assignment)
- **DR-003** - Vehicle Management (vehicle eligibility)
- **AD-007** - Broker Management (broker configuration)
- **AD-005** - Credential Types (broker-scoped credentials)

---

## Related Features

- **AD-006** - Credential Review (admin reviews driver's broker credentials)
- **AD-007** - Broker Management (admin approves/denies driver requests)

---

## Testing Requirements

### Integration Tests

```typescript
describe('DR-005: Trip Sources', () => {
  describe('Prerequisites', () => {
    it('shows locked state when global credentials incomplete');
    it('shows trip sources when global credentials complete');
    it('lists missing global credentials');
  });
  
  describe('Assigned Tab', () => {
    it('shows assigned trip sources');
    it('shows eligibility status');
    it('shows missing credentials for ineligible');
    it('opens requirements modal');
  });
  
  describe('Pending Tab', () => {
    it('shows pending requests');
    it('shows request date');
    it('cancels pending request');
    it('shows empty state');
  });
  
  describe('Available Tab', () => {
    it('filters by employment type');
    it('shows assignment mode badges');
    it('shows eligibility status');
    it('filters by source type');
    it('searches by name');
  });
  
  describe('Request to Join', () => {
    it('shows confirmation modal');
    it('creates pending assignment');
    it('moves card to pending tab');
    it('prevents duplicate requests');
  });
  
  describe('Auto-Join', () => {
    it('shows confirmation modal');
    it('creates assigned status immediately');
    it('moves card to assigned tab');
    it('respects service area check');
  });
  
  describe('Cancel Request', () => {
    it('shows confirmation modal');
    it('deletes pending assignment');
    it('moves card to available tab');
  });
  
  describe('Details Modal', () => {
    it('shows service area');
    it('shows vehicle eligibility');
    it('shows credential requirements');
    it('shows credential status for assigned');
  });
  
  describe('Employment Types', () => {
    it('1099 driver sees 1099-accepting brokers');
    it('W2 driver sees W2-accepting brokers');
    it('both types can request/join');
  });
});
```

### E2E Tests

```typescript
describe('Driver Trip Sources E2E', () => {
  it('driver completes onboarding and views trip sources');
  it('driver requests to join broker');
  it('driver auto-joins broker');
  it('driver cancels pending request');
  it('driver completes broker credentials after assignment');
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Initial spec | - |
