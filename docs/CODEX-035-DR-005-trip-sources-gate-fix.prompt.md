# CODEX-035: DR-005 Trip Sources Gate Fix

> **Copy this entire document when starting the implementation session.**

---

## Context

The Trip Sources page (`/driver/brokers`) has an incorrect gate that blocks drivers from accessing the page. The current implementation uses `onboardingStatus.isComplete` but should use `onboardingStatus.canActivate` to align with the business definition of "active".

### Business Definition: "Active" = Can Take Trips

A driver can go **ACTIVE** (and therefore take trips) when:

1. Profile complete ✓
2. Profile photo ✓
3. Vehicle added (1099 only) ✓
4. Vehicle complete (1099 only) ✓
5. Global driver credentials approved ✓
6. Availability set ✓
7. Payment info added ✓ **ONLY if `driver_payments` feature flag is ON**
8. At least one active vehicle with global vehicle credentials ✓

**Key insight**: Trip Sources should be accessible when a driver CAN take trips (or is already taking trips). This means using `canActivate` instead of `isComplete`.

### The Problem

1. **Wrong gate condition**: Uses `isComplete` which doesn't check vehicle eligibility
2. **`isComplete` vs `canActivate`**:
   - `isComplete` = all onboarding items done (NO vehicle check)
   - `canActivate` = all onboarding items done + active vehicle with credentials
3. **Gate component shows wrong info**: Shows only missing credentials, but could be blocked by vehicle issues

---

## Current State

### OnboardingStatus Fields (src/services/onboarding.ts)

```typescript
return {
  items,
  progress: progress_pct,
  isComplete: completedRequired.length === requiredItems.length,  // Just onboarding items
  canActivate,  // Onboarding items + active vehicle with creds
  blockers,     // List of what's blocking activation
};
```

### Current `canActivate` Logic (line 174)

```typescript
const canActivate = completedRequired.length === requiredItems.length && hasEligibleVehicle;
```

This already:
- Respects payment feature flag (payment_info filtered out when disabled - lines 122-124)
- Requires profile, photo, credentials, availability
- Requires active vehicle with global vehicle credentials

### Trip Sources Gate (src/pages/driver/TripSources.tsx line 347)

```typescript
// CURRENT - WRONG
{!onboardingStatus?.isComplete ? (
  <GlobalCredentialsGate missingCredentials={missingGlobalCredentials} />
) : (
  // Show trip sources
)}
```

---

## Required Changes

### 1. Change Route from `/driver/brokers` to `/driver/trip-sources`

**File:** `src/App.tsx`

```typescript
// Change from:
<Route path="brokers" element={<TripSources />} />

// To:
<Route path="trip-sources" element={<TripSources />} />
```

**File:** `src/components/layouts/DriverLayout.tsx`

Update the navigation link to use the new route.

**Other files:** Search for `/driver/brokers` and update to `/driver/trip-sources`:
- Any `Link` or `navigate()` calls
- `VehicleOverviewTab.tsx` has a link to brokers

### 2. Update Trip Sources Gate Logic

**File:** `src/pages/driver/TripSources.tsx`

Change the gate condition to allow access if:
- Driver is already active (`status === 'active'`), OR
- Driver CAN go active (`canActivate === true`)

```typescript
// Around line 347, change from:
{!onboardingStatus?.isComplete ? (

// To:
{!(driver?.status === 'active' || onboardingStatus?.canActivate) ? (
```

### 3. Redesign ActivationGate Component

**File:** `src/components/features/driver/GlobalCredentialsGate.tsx`

Rename to `ActivationGate` and redesign with:
- **Employment-type tailored intro blurb**:
  - 1099: "Trip sources are brokers and facilities you can sign up with to receive trips. Add more sources to increase your earning opportunities."
  - W2: "Trip sources are brokers and facilities your company works with. Complete your setup to see available assignments."
- **Separate driver and vehicle sections** with clear headers
- **"Go to Credentials" button** (not dashboard)
- Show what trip sources ARE before listing blockers

### 4. Update TripSources to Pass Required Data

**File:** `src/pages/driver/TripSources.tsx`

Pass employment type and structured blockers to the gate component.

---

## Detailed Implementation Steps

### Step 1: Update Route

**File:** `src/App.tsx`

```typescript
// Find line with brokers route and change:
<Route path="brokers" element={<TripSources />} />

// To:
<Route path="trip-sources" element={<TripSources />} />
```

**File:** `src/components/layouts/DriverLayout.tsx`

Update navigation item href from `/driver/brokers` to `/driver/trip-sources`.

**File:** `src/components/features/driver/VehicleOverviewTab.tsx`

Update the "View All Brokers" link:
```typescript
// Change from:
<Link to="/driver/brokers">View All Brokers</Link>

// To:
<Link to="/driver/trip-sources">View Trip Sources</Link>
```

### Step 2: Rename and Redesign Gate Component

**File:** `src/components/features/driver/GlobalCredentialsGate.tsx`

**STATUS: COMPLETED**

The component has been redesigned to match the app's design system:

**Design Pattern:**
- Two full-width cards (matches Dashboard layout)
- Card 1: "What are Trip Sources?" - info card with building icon
- Card 2: "Complete Setup" - similar to Dashboard's "Getting Started" checklist

**Key Design Elements:**
- `CardHeader` with `CardTitle` for proper heading structure
- DRIVER / VEHICLE section headers (uppercase, `text-xs font-medium text-muted-foreground uppercase tracking-wide`)
- Blocker items in rounded boxes (`p-3 rounded-lg bg-muted/30 border border-border/40`)
- "Continue" buttons with `variant="outline"` (matches other pages)
- No centered card - full-width to match rest of app

**Employment-type blurbs:**
- 1099: "Trip sources are brokers and facilities you can sign up with to receive trips. Add more sources to increase your earning opportunities."
- W2: "Trip sources are brokers and facilities your company works with. Complete your setup to see available assignments."

See the actual implementation in the file - it has already been updated.

### Step 3: Update TripSources Page

**File:** `src/pages/driver/TripSources.tsx`

#### 3a. Update import

```typescript
import { ActivationGate } from '@/components/features/driver/GlobalCredentialsGate';
```

#### 3b. Categorize blockers into driver vs vehicle

Add a useMemo to split blockers:

```typescript
const { driverBlockers, vehicleBlockers } = useMemo(() => {
  const blockers = onboardingStatus?.blockers ?? [];
  
  const vehicleLabels = [
    'Add a Vehicle',
    'Complete Vehicle Information', 
    'Active vehicle with required credentials',
  ];
  
  return {
    driverBlockers: blockers.filter(b => !vehicleLabels.includes(b)),
    vehicleBlockers: blockers.filter(b => vehicleLabels.includes(b)),
  };
}, [onboardingStatus?.blockers]);
```

#### 3c. Update the gate condition and component

```typescript
// Change from:
{!onboardingStatus?.isComplete ? (
  <GlobalCredentialsGate missingCredentials={missingGlobalCredentials} />
) : (

// To:
{!(driver?.status === 'active' || onboardingStatus?.canActivate) ? (
  <ActivationGate
    employmentType={driver?.employment_type as '1099' | 'w2'}
    driverBlockers={driverBlockers}
    vehicleBlockers={vehicleBlockers}
  />
) : (
```

#### 3d. Clean up unused code

Remove the `missingGlobalCredentials` useMemo (around lines 253-276) since we now use categorized blockers.

### Step 4: Add State Filtering for Available Trip Sources

**File:** `src/pages/driver/TripSources.tsx`

The available brokers should prioritize showing trip sources in the driver's state. Update the `availableBrokers` filtering:

```typescript
const availableBrokers = useMemo(() => {
  if (!driver) return [];
  
  return brokers
    .filter(
      (broker) =>
        !assignmentByBroker.has(broker.id) &&
        broker.accepted_employment_types.includes(driver.employment_type)
    )
    .sort((a, b) => {
      // Prioritize brokers in driver's state
      const aInState = a.service_states.length === 0 || 
        (driver.state && a.service_states.includes(driver.state));
      const bInState = b.service_states.length === 0 || 
        (driver.state && b.service_states.includes(driver.state));
      
      if (aInState && !bInState) return -1;
      if (!aInState && bInState) return 1;
      return a.name.localeCompare(b.name);
    });
}, [brokers, assignmentByBroker, driver]);
```

Optionally, add a visual indicator or section header for "In Your State" vs "Other States".

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Change route from `brokers` to `trip-sources` |
| `src/components/layouts/DriverLayout.tsx` | Update nav link href |
| `src/components/features/driver/VehicleOverviewTab.tsx` | Update "View All Brokers" link |
| `src/components/features/driver/GlobalCredentialsGate.tsx` | Redesign as `ActivationGate` with sections |
| `src/pages/driver/TripSources.tsx` | Use `canActivate`, split blockers, state sorting |

**Search for other references:**
```bash
rg "/driver/brokers" --type ts --type tsx
```

---

## Testing Checklist

### Route Change Tests

#### TC-0: Route Updated
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Trip Sources page loads
- [ ] Navigate to `/driver/brokers`
- [ ] **Expected**: 404 or redirect (old route should not work)
- [ ] Check DriverLayout nav link points to `/driver/trip-sources`
- [ ] Check VehicleOverviewTab link says "View Trip Sources"

### Gate Tests

#### TC-1: Active Driver Access
- [ ] Login as an active driver (`status === 'active'`)
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Trip Sources page loads (no gate shown)

#### TC-2: Can Activate - All Requirements Met
- [ ] Login as a driver with:
  - All onboarding items complete
  - Active vehicle with all global vehicle credentials
  - Status is still `inactive`
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Trip Sources page loads (no gate shown)

#### TC-3: Gate Display - 1099 Driver
- [ ] Login as 1099 driver with blockers
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows 1099-specific blurb about earning opportunities
- [ ] **Expected**: Driver and Vehicle sections are separated
- [ ] **Expected**: "Go to Credentials" button (not Dashboard)

#### TC-4: Gate Display - W2 Driver  
- [ ] Login as W2 driver with blockers
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows W2-specific blurb about company assignments

#### TC-5: Cannot Activate - Driver Issues Only
- [ ] Login as a driver with:
  - Missing global driver credentials
  - Active vehicle with all credentials
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows "Driver Requirements" section only
- [ ] **Expected**: No "Vehicle Requirements" section

#### TC-6: Cannot Activate - Vehicle Issues Only
- [ ] Login as a driver with:
  - All driver onboarding complete
  - No active vehicle or missing vehicle credentials
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows "Vehicle Requirements" section only

#### TC-7: Cannot Activate - Both Driver and Vehicle Issues
- [ ] Login as a driver with:
  - Missing driver credentials
  - Missing vehicle credentials
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows both "Driver Requirements" and "Vehicle Requirements"

#### TC-8: Payment Feature Flag OFF
- [ ] Disable `driver_payments` feature flag for company
- [ ] Login as driver with everything complete EXCEPT payment info
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Trip Sources page loads (payment not required)

#### TC-9: Payment Feature Flag ON
- [ ] Enable `driver_payments` feature flag for company
- [ ] Login as driver with everything complete EXCEPT payment info
- [ ] Navigate to `/driver/trip-sources`
- [ ] **Expected**: Gate shows "Add Payment Information" in Driver Requirements

### State Filtering Tests

#### TC-10: Trip Sources Sorted by State
- [ ] Login as driver in state "TX"
- [ ] View Available tab
- [ ] **Expected**: Trip sources serving TX appear first
- [ ] **Expected**: Trip sources NOT serving TX appear after

---

## Business Logic Summary

### When Can a Driver Go ACTIVE?

| Requirement | Required? |
|-------------|-----------|
| Profile complete | Yes |
| Profile photo | Yes |
| Vehicle added (1099) | Yes |
| Vehicle info complete (1099) | Yes |
| Global driver credentials | Yes |
| Availability set | Yes |
| Payment info | **Only if `driver_payments` ON** |
| Active vehicle with global vehicle creds | Yes |

### When Can a Driver Access Trip Sources?

- `driver.status === 'active'` (already active), OR
- `onboardingStatus.canActivate === true` (could go active)

This ensures consistency: **if you can take trips, you can browse for more trip sources**.

---

## Code Quality

- [ ] No TypeScript errors after changes
- [ ] No linter warnings introduced
- [ ] Remove unused `missingGlobalCredentials` code
- [ ] Component shows accurate blocker information

---

## Summary

This fix ensures:

1. **Better route** - `/driver/trip-sources` instead of `/driver/brokers`
2. **Consistent "active" definition** - same requirements everywhere
3. **Trip Sources unlocks at the right time** - when driver can take trips
4. **Payment feature flag respected** - payment only required when feature is ON
5. **Improved gate UX**:
   - Employment-type tailored intro (1099 vs W2)
   - Separate Driver and Vehicle requirement sections
   - "Go to Credentials" primary action
   - Clear "Fix" links for each blocker
6. **State-aware sorting** - trip sources in driver's state shown first
7. **Reuses existing logic** - `canActivate` and `blockers` from onboarding
