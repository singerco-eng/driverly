# DR-001: Driver Onboarding

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 3 - Driver Core

---

## Overview

Driver Onboarding is the **post-approval** experience that guides new drivers through completing their profile, credentials, vehicle setup, and other requirements to become "active" and eligible for trips. This is a **self-service, checklist-driven** experience - drivers are not locked out but see clear guidance on what needs to be completed.

**Key Principle:** Drivers can explore the portal freely while seeing clear indicators of incomplete items. No forced wizard - just helpful guidance.

---

## Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION APPROVED                          │
│                           ↓                                      │
│                    First Login                                   │
│                           ↓                                      │
│              ┌─────────────────────────┐                        │
│              │   Welcome Modal         │ (Optional, can skip)   │
│              │   - Platform overview   │                        │
│              │   - What to complete    │                        │
│              │   - Quick start guide   │                        │
│              └─────────────────────────┘                        │
│                           ↓                                      │
│              ┌─────────────────────────┐                        │
│              │   Driver Dashboard      │                        │
│              │   - Getting Started     │                        │
│              │     Checklist           │                        │
│              │   - Action Items        │                        │
│              │   - Progress Bar        │                        │
│              └─────────────────────────┘                        │
│                           ↓                                      │
│         Complete items in any order (self-service)              │
│                           ↓                                      │
│              ┌─────────────────────────┐                        │
│              │  Requirements Met:      │                        │
│              │  ✓ Global Credentials   │                        │
│              │  ✓ Availability Set     │                        │
│              │  ✓ Payment Info         │                        │
│              │  ✓ Vehicle (1099)       │                        │
│              └─────────────────────────┘                        │
│                           ↓                                      │
│              Can toggle "Active" status                          │
│                           ↓                                      │
│              Ready for trips (per broker eligibility)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Driver Onboarding Status

```sql
-- Add to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  -- Onboarding tracking
  onboarding_completed_at timestamptz,
  welcome_modal_dismissed boolean DEFAULT false,
  
  -- Active status requirements
  has_payment_info boolean DEFAULT false,
  has_availability boolean DEFAULT false;

-- Onboarding checklist items (for tracking/display)
CREATE TABLE driver_onboarding_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Checklist items
  item_key        text NOT NULL,  -- 'profile', 'vehicle', 'global_credentials', etc.
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  skipped         boolean NOT NULL DEFAULT false,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(driver_id, item_key)
);

CREATE INDEX idx_onboarding_driver ON driver_onboarding_progress(driver_id);

-- RLS
ALTER TABLE driver_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own progress"
  ON driver_onboarding_progress FOR SELECT
  USING (driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can update own progress"
  ON driver_onboarding_progress FOR ALL
  USING (driver_id = (SELECT id FROM drivers WHERE user_id = auth.uid()));
```

### Onboarding Checklist Items

```typescript
const ONBOARDING_ITEMS = [
  // Required for "active" status
  { key: 'profile_complete', label: 'Complete Your Profile', required: true, category: 'setup' },
  { key: 'vehicle_added', label: 'Add a Vehicle', required: true, forEmploymentType: '1099', category: 'setup' },
  { key: 'vehicle_complete', label: 'Complete Vehicle Information', required: true, forEmploymentType: '1099', category: 'setup' },
  { key: 'global_credentials', label: 'Submit Required Credentials', required: true, category: 'credentials' },
  { key: 'availability_set', label: 'Set Your Availability', required: true, category: 'schedule' },
  { key: 'payment_info', label: 'Add Payment Information', required: true, category: 'payment' },
  
  // Optional / Recommended
  { key: 'broker_requested', label: 'Request Broker Assignment', required: false, category: 'brokers' },
  { key: 'broker_credentials', label: 'Complete Broker Credentials', required: false, category: 'credentials' },
  { key: 'profile_photo', label: 'Add Profile Photo', required: false, category: 'setup' },
] as const;
```

---

## "Active" Status Requirements

A driver can toggle themselves to "Active" (wanting trips) when:

```typescript
function canDriverBeActive(driver: Driver): { canActivate: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  // 1. Profile must be complete
  if (!isProfileComplete(driver)) {
    blockers.push('Complete your profile information');
  }
  
  // 2. Global credentials must be complete (all required, approved)
  const globalCredStatus = getGlobalCredentialStatus(driver.id);
  if (!globalCredStatus.allComplete) {
    blockers.push(`Submit required credentials (${globalCredStatus.missing} remaining)`);
  }
  
  // 3. Availability must be set
  if (!driver.has_availability) {
    blockers.push('Set your availability schedule');
  }
  
  // 4. Payment info must be entered
  if (!driver.has_payment_info) {
    blockers.push('Add payment information');
  }
  
  // 5. For 1099: Must have at least one complete, active vehicle
  if (driver.employment_type === '1099') {
    const vehicles = getDriverVehicles(driver.id);
    const completeVehicle = vehicles.find(v => v.is_complete && v.status === 'active');
    if (!completeVehicle) {
      blockers.push('Add and complete vehicle information');
    }
  }
  
  return {
    canActivate: blockers.length === 0,
    blockers,
  };
}
```

---

## User Stories

### Driver Stories

1. **As a new Driver**, I want to see a welcome overview so that I understand what I need to do to start driving.

2. **As a Driver**, I want to see a clear checklist of what I need to complete so that I know my progress.

3. **As a Driver**, I want to complete tasks in any order so that I can work at my own pace.

4. **As a Driver**, I want to see which items are blocking me from being "active" so that I can prioritize.

5. **As a Driver**, I want to easily navigate to each incomplete section so that I can complete items efficiently.

6. **As a Driver**, I want to skip the welcome modal if I already know what to do.

7. **As a Driver**, I want my progress saved if I log out so that I can continue later.

8. **As a Driver**, I want to see my overall completion percentage so that I feel progress.

9. **As a Driver**, I want to toggle myself "active" when ready so that I can start receiving trips.

---

## UI Specifications

### 1. Welcome Modal (First Login)

**Trigger:** First login after application approval, `welcome_modal_dismissed = false`

**Component:** `Modal` (can dismiss)

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome to [Company Name]! 🎉                             [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're approved and ready to get started.                      │
│                                                                 │
│  Here's what you'll need to complete:                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1️⃣  Complete Your Profile                               │   │
│  │     Verify your personal information                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2️⃣  Set Up Your Vehicle                                 │   │
│  │     Add vehicle details and photos                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3️⃣  Submit Credentials                                  │   │
│  │     Upload required documents                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4️⃣  Set Availability & Payment                          │   │
│  │     Tell us when you can drive and how to pay you       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Take your time - complete these at your own pace.              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ☐ Don't show this again                                        │
│                                                                 │
│                              [Skip for Now]  [Get Started]      │
└─────────────────────────────────────────────────────────────────┘
```

**Actions:**
- **Get Started** → Dismiss modal, navigate to first incomplete item
- **Skip for Now** → Dismiss modal, stay on dashboard
- **Don't show again** → Sets `welcome_modal_dismissed = true`

---

### 2. Driver Dashboard with Getting Started

**Route:** `/driver` (home)

**Layout:** Dashboard with prominent "Getting Started" section for incomplete drivers

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, John! 👋                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  🚀 Getting Started                           65%       │   │
│  │  ════════════════════════════░░░░░░░░░░░░░░░░░░░░░░    │   │
│  │                                                         │   │
│  │  Complete these items to start driving:                 │   │
│  │                                                         │   │
│  │  Setup                                                  │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ✓ Complete Your Profile                         │   │   │
│  │  │   Profile information verified                  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ⚠ Complete Vehicle Information          [Fix →] │   │   │
│  │  │   Missing: VIN, interior photo                  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  Credentials                                            │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ○ Submit Required Credentials           [Start →]│   │   │
│  │  │   3 credentials remaining                       │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  Schedule & Payment                                     │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ○ Set Your Availability                 [Set →] │   │   │
│  │  │   Required to receive trips                     │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ ○ Add Payment Information              [Add →]  │   │   │
│  │  │   Required to receive payments                  │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Quick Actions ──────────────────────────────────────────   │
│                                                                 │
│  [📄 My Credentials]  [🚗 My Vehicles]  [📅 Availability]      │
│                                                                 │
│  ── Recent Activity ────────────────────────────────────────   │
│                                                                 │
│  No activity yet. Complete your setup to start driving!         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Checklist Item States:**
| State | Icon | Description |
|-------|------|-------------|
| Complete | ✓ (green) | Item finished |
| In Progress | ⚠ (yellow) | Started but incomplete |
| Not Started | ○ (gray) | Not yet begun |
| Blocked | 🔒 | Depends on another item |

**Progress Bar:**
- Shows percentage of required items complete
- Visually fills as items are completed

---

### 3. Dashboard After Onboarding Complete

**When all required items done but driver is inactive:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, John! 👋                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ✅ You're ready to drive!                              │   │
│  │                                                         │   │
│  │  All required items are complete. Toggle yourself       │   │
│  │  active to start receiving trip opportunities.          │   │
│  │                                                         │   │
│  │                    [Go Active →]                        │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Your Status ────────────────────────────────────────────   │
│                                                                 │
│  Status: Inactive                     [Set Active]              │
│  Brokers: 2 assigned, 1 eligible                                │
│  Vehicle: 2022 Toyota Camry (Active)                           │
│                                                                 │
│  ── Optional Items ─────────────────────────────────────────   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Request Additional Brokers               [Browse →]  │   │
│  │   Expand your trip opportunities                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠ Complete Broker Credentials              [View →]    │   │
│  │   2 credentials pending for MedTrans                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Cannot Activate Modal

**Trigger:** Driver tries to toggle "Active" but has blockers

```
┌─────────────────────────────────────────────────────────────────┐
│  Can't Go Active Yet                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Complete these items first:                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✕ Submit required credentials (2 remaining)    [Fix →] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✕ Set your availability schedule              [Set →]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                    [Got It]     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Active/Inactive Toggle

**Location:** Dashboard header or status section

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Your Status                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   ● Active                              [Toggle: ON]    │   │
│  │                                                         │   │
│  │   You're available to receive trips                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                        OR                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   ○ Inactive                            [Toggle: OFF]   │   │
│  │                                                         │   │
│  │   You won't receive trip opportunities                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Going Inactive - Optional Reason:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Going Inactive                                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You won't receive trip opportunities while inactive.           │
│                                                                 │
│  Reason (optional)                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Select reason                                         │   │
│  │   • Taking a break                                      │   │
│  │   • Vacation                                            │   │
│  │   • Vehicle maintenance                                 │   │
│  │   • Personal reasons                                    │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Go Inactive]            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. Incomplete Item Banners

**Shown throughout the portal when relevant items incomplete:**

**On Credentials Page (if incomplete):**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ 3 required credentials incomplete                           │
│     Complete these to become eligible for trips                 │
└─────────────────────────────────────────────────────────────────┘
```

**On Vehicles Page (if incomplete):**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Vehicle information incomplete                              │
│     Add VIN and photos to complete your vehicle                 │
│                                              [Complete Now]     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Progress Persistence

**If driver logs out and returns:**

- Welcome modal not shown again (if dismissed)
- Dashboard shows current progress state
- Checklist reflects completed items
- Incomplete banner shown if applicable

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome back, John! 👋                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📋 Continue Setup                            65%       │   │
│  │                                                         │   │
│  │  You have 3 items remaining to start driving.          │   │
│  │                                                         │   │
│  │                              [Continue Setup →]         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. Mobile-Optimized Experience

**Key considerations:**
- Touch-friendly buttons and inputs
- Camera access for photo uploads
- Touch-friendly signature capture
- Vertical scrolling checklist
- Full-width cards on mobile

**Mobile Dashboard:**
```
┌─────────────────────────────┐
│ ☰  Driverly         [👤]   │
├─────────────────────────────┤
│                             │
│ Good morning, John! 👋      │
│                             │
│ ┌─────────────────────────┐ │
│ │ Getting Started    65%  │ │
│ │ ═══════════════░░░░░░░░ │ │
│ │                         │ │
│ │ ✓ Profile Complete      │ │
│ │                         │ │
│ │ ⚠ Vehicle Info          │ │
│ │   Missing VIN    [Fix]  │ │
│ │                         │ │
│ │ ○ Credentials           │ │
│ │   3 remaining  [Start]  │ │
│ │                         │ │
│ │ ○ Availability          │ │
│ │              [Set →]    │ │
│ │                         │ │
│ │ ○ Payment               │ │
│ │              [Add →]    │ │
│ └─────────────────────────┘ │
│                             │
│ ─── Quick Actions ───       │
│                             │
│ [Credentials] [Vehicles]    │
│                             │
└─────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Welcome Modal

- [ ] Shows on first login after approval
- [ ] Can be dismissed/skipped
- [ ] "Don't show again" checkbox persists preference
- [ ] "Get Started" navigates to first incomplete item
- [ ] Mobile-friendly layout

### AC-2: Getting Started Checklist

- [ ] Shows on dashboard when onboarding incomplete
- [ ] Groups items by category (Setup, Credentials, Schedule)
- [ ] Shows completion state for each item (✓, ⚠, ○)
- [ ] Each item links to relevant section
- [ ] Shows what's missing for incomplete items
- [ ] Progress bar shows percentage complete

### AC-3: Checklist Items (Required)

- [ ] Profile Complete - linked to profile section
- [ ] Vehicle Added (1099 only) - linked to vehicles
- [ ] Vehicle Complete (1099 only) - linked to vehicle edit
- [ ] Global Credentials - linked to credentials section
- [ ] Availability Set - linked to availability section
- [ ] Payment Info - linked to payment settings

### AC-4: Checklist Items (Optional)

- [ ] Request Broker Assignment - linked to broker discovery
- [ ] Broker Credentials - linked to credentials section
- [ ] Profile Photo - linked to profile section

### AC-5: Progress Tracking

- [ ] Progress persists across sessions
- [ ] Items auto-complete when underlying data is complete
- [ ] Progress percentage updates in real-time
- [ ] Onboarding marked complete when all required items done

### AC-6: Active Status Toggle

- [ ] Cannot activate until all requirements met
- [ ] Shows blockers when activation attempted
- [ ] Blockers link to relevant sections
- [ ] Can toggle inactive at any time (optional reason)
- [ ] Status persists across sessions

### AC-7: W2 Differences

- [ ] Vehicle checklist items hidden for W2 (may have assigned vehicle)
- [ ] Same flow otherwise with conditional display

### AC-8: Mobile Experience

- [ ] Responsive layout for mobile screens
- [ ] Touch-friendly buttons and inputs
- [ ] Camera integration for photo uploads
- [ ] Touch-friendly signature pad (for credentials)

### AC-9: Dashboard After Completion

- [ ] Getting Started section replaced with status summary
- [ ] Shows "Ready to drive" message when complete
- [ ] Prominent "Go Active" button
- [ ] Optional items still shown as recommendations

---

## API/Queries

### Get Onboarding Status

```typescript
async function getOnboardingStatus(driverId: string) {
  const driver = await getDriver(driverId);
  
  // Get checklist progress
  const { data: progress } = await supabase
    .from('driver_onboarding_progress')
    .select('*')
    .eq('driver_id', driverId);
  
  // Calculate completion for each item
  const items = await Promise.all(ONBOARDING_ITEMS.map(async (item) => {
    // Skip items not for this employment type
    if (item.forEmploymentType && item.forEmploymentType !== driver.employment_type) {
      return null;
    }
    
    const saved = progress?.find(p => p.item_key === item.key);
    const isComplete = await calculateItemCompletion(item.key, driverId);
    
    return {
      ...item,
      completed: isComplete,
      completedAt: saved?.completed_at,
      skipped: saved?.skipped,
    };
  }));
  
  const validItems = items.filter(Boolean);
  const requiredItems = validItems.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed);
  
  return {
    items: validItems,
    progress: Math.round((completedRequired.length / requiredItems.length) * 100),
    isComplete: completedRequired.length === requiredItems.length,
    canActivate: completedRequired.length === requiredItems.length,
    blockers: requiredItems.filter(i => !i.completed).map(i => i.label),
  };
}

async function calculateItemCompletion(key: string, driverId: string): Promise<boolean> {
  switch (key) {
    case 'profile_complete':
      return isProfileComplete(driverId);
    case 'vehicle_added':
      return (await getDriverVehicles(driverId)).length > 0;
    case 'vehicle_complete':
      const vehicles = await getDriverVehicles(driverId);
      return vehicles.some(v => v.is_complete);
    case 'global_credentials':
      const status = await getGlobalCredentialStatus(driverId);
      return status.allComplete;
    case 'availability_set':
      const driver = await getDriver(driverId);
      return driver.has_availability;
    case 'payment_info':
      const driverPayment = await getDriver(driverId);
      return driverPayment.has_payment_info;
    default:
      return false;
  }
}
```

### Dismiss Welcome Modal

```typescript
async function dismissWelcomeModal(driverId: string, dontShowAgain: boolean) {
  if (dontShowAgain) {
    await supabase
      .from('drivers')
      .update({ welcome_modal_dismissed: true })
      .eq('id', driverId);
  }
}
```

### Toggle Active Status

```typescript
async function toggleDriverActive(driverId: string, active: boolean, reason?: string) {
  if (active) {
    // Verify can activate
    const { canActivate, blockers } = await getOnboardingStatus(driverId);
    if (!canActivate) {
      throw new Error(`Cannot activate: ${blockers.join(', ')}`);
    }
  }
  
  await supabase
    .from('drivers')
    .update({
      status: active ? 'active' : 'inactive',
      status_reason: active ? null : reason,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', driverId);
  
  // Mark onboarding complete if activating for first time
  if (active) {
    await supabase
      .from('drivers')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', driverId)
      .is('onboarding_completed_at', null);
  }
}
```

---

## Business Rules

1. **Checklist auto-completion:** Items are automatically marked complete when underlying data requirements are met (not manually checked)

2. **Required items for activation:**
   - Profile complete (all required fields)
   - Global credentials complete (all required, approved)
   - Availability set (at least some availability)
   - Payment info entered
   - Vehicle complete and active (1099 only)

3. **W2 vehicle exception:** W2 drivers may have company vehicle assigned, so vehicle checklist items are conditional

4. **Welcome modal once:** Only shown on first login, never again if dismissed

5. **Progress calculation:** Only counts required items, optional items don't affect percentage

6. **Activation blockers:** Must be resolved before driver can toggle active

7. **Inactive with reason:** Optional reason when going inactive, stored for admin visibility

---

## Dependencies

- AD-001 - Driver Applications (approval triggers portal access)
- AD-002 - Driver Management (status management)
- AD-003 - Vehicle Management (vehicle completion)
- AD-005 - Credential Types (credential requirements)
- DR-002 - Profile Management (profile completion)
- DR-003 - Vehicle Management (driver's vehicle management)
- DR-004 - Credential Submission (credential completion)
- DR-005 - Availability (availability setting)

---

## Testing Requirements

### Integration Tests

```typescript
describe('DR-001: Driver Onboarding', () => {
  describe('Welcome Modal', () => {
    it('shows on first login after approval');
    it('does not show if previously dismissed');
    it('persists dont show again preference');
  });
  
  describe('Checklist Progress', () => {
    it('calculates progress based on required items');
    it('auto-completes profile item when profile complete');
    it('auto-completes vehicle item when vehicle added');
    it('auto-completes credentials item when all approved');
    it('hides vehicle items for W2 drivers');
  });
  
  describe('Active Status', () => {
    it('blocks activation when requirements incomplete');
    it('shows specific blockers');
    it('allows activation when all requirements met');
    it('allows deactivation at any time');
    it('records deactivation reason');
  });
  
  describe('Progress Persistence', () => {
    it('maintains progress across sessions');
    it('updates progress when items completed');
    it('marks onboarding complete on first activation');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
