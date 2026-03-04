# CODEX-045: UX-002 Unified Assignment Modal

> **Status:** Planning
> **Priority:** Medium
> **Estimated Effort:** Medium (12-15 files, 11 user stories)

---

## Overview

### Problem Statement

The codebase has **11 separate assignment modal components** with significant code duplication:

| Modal | Lines | Purpose |
|-------|-------|---------|
| `AssignDriverToVehicleModal` | 237 | Assign driver to vehicle (from vehicle context) |
| `AssignVehicleToDriverModal` | 225 | Assign vehicle to driver (from driver context) |
| `TransferVehicleModal` | 219 | Transfer vehicle between drivers |
| `UnassignVehicleModal` | 136 | Remove vehicle from driver |
| `ExtendAssignmentModal` | 109 | Extend borrowed assignment end date |
| `EndAssignmentEarlyModal` | ~80 | End borrowed assignment before scheduled |
| `AssignDriverToLocationModal` | 104 | Assign driver to location |
| `AssignVehicleToLocationModal` | ~100 | Assign vehicle to location |
| `AssignBrokerToLocationModal` | ~100 | Assign broker to location |
| `AssignDriversModal` | 267 | Bulk assign drivers to broker |

**Total: ~1,500+ lines of duplicated patterns**

This creates:
1. **Maintenance burden** - Bug fixes must be applied to multiple files
2. **Inconsistent UX** - Slight variations in patterns confuse users
3. **Onboarding friction** - New developers must learn multiple component patterns

### Solution

Create a single **UnifiedAssignmentModal** component that handles all assignment scenarios through a declarative, configuration-driven architecture.

### Terminology

| Term | Definition |
|------|------------|
| **Mode** | The specific assignment operation being performed (e.g., `assign-driver-to-vehicle`) |
| **Context** | The source entity from which the assignment is initiated |
| **Target Entity** | The entity being selected/assigned (driver, vehicle, or broker) |
| **Assignment Type** | For vehicle assignments: `owned`, `assigned`, or `borrowed` |

---

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    UnifiedAssignmentModal                        │
├─────────────────────────────────────────────────────────────────┤
│  Props:                                                          │
│    - mode: AssignmentMode                                        │
│    - context: SourceContext                                      │
│    - onSuccess?: () => void                                      │
├─────────────────────────────────────────────────────────────────┤
│  Internal Components:                                            │
│    ├── EntitySelector (single/multi, search, filters)           │
│    │     ├── DriverListItem (driver-specific rendering)         │
│    │     ├── VehicleListItem (vehicle-specific rendering)       │
│    │     └── BrokerListItem (broker-specific rendering)         │
│    ├── AssignmentTypePanel (assigned/borrowed + dates)          │
│    ├── ReasonPanel (dropdown + notes textarea)                  │
│    ├── PrimaryToggle (checkbox for primary vehicle)             │
│    └── WarningBanner (contextual warnings)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────┐    mode + context    ┌─────────────────────────┐
│  Consumer Page  │ ─────────────────────▶ UnifiedAssignmentModal │
│  (VehicleDetail)│                       │                         │
└─────────────────┘                       │  ┌─────────────────┐   │
                                          │  │  Mode Config    │   │
                                          │  │  (determines UI)│   │
                                          │  └────────┬────────┘   │
                                          │           │            │
                                          │  ┌────────▼────────┐   │
                                          │  │ EntitySelector  │   │
                                          │  │ AssignmentType  │   │
                                          │  │ ReasonPanel     │   │
                                          │  └────────┬────────┘   │
                                          │           │            │
                                          │  ┌────────▼────────┐   │
                                          │  │ useAssignment   │   │
                                          │  │ Mutation        │   │
                                          │  └────────┬────────┘   │
                                          └───────────│────────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────────────┐
                                          │  Existing Service Hooks │
                                          │  - useAssignVehicle     │
                                          │  - useTransferVehicle   │
                                          │  - useAssignDriver...   │
                                          └─────────────────────────┘
```

---

## Assignment Modes

### Complete Mode List (10 modes)

| Mode | Selection | Target | Has Type | Has Dates | Has Primary | Has Reason |
|------|-----------|--------|----------|-----------|-------------|------------|
| `assign-driver-to-vehicle` | single | driver | yes | borrowed | yes | no |
| `assign-vehicle-to-driver` | single | vehicle | yes | borrowed | yes | no |
| `transfer-vehicle` | single | driver | no | no | yes | yes |
| `unassign-vehicle` | none | - | no | no | no | yes |
| `extend-assignment` | none | - | no | end only | no | optional |
| `end-assignment-early` | none | - | no | no | no | yes |
| `assign-driver-to-location` | single | driver | no | no | no | no |
| `assign-vehicle-to-location` | single | vehicle | no | no | no | no |
| `assign-broker-to-location` | single | broker | no | no | no | no |
| `assign-drivers-to-broker` | multi | driver | no | no | no | no |

### Employment Type Rules (1099 vs W2)

| Rule | W2 Driver | 1099 Driver |
|------|-----------|-------------|
| Assignment Type Options | `assigned` or `borrowed` | `borrowed` only |
| Create Own Vehicles | No | Yes (creates `owned` assignment) |
| Edit Vehicle Info | Photos only | Full edit |
| Company Vehicle Assignment | Yes | Yes (borrowed only) |

**Implementation Note:** When a 1099 driver is selected, the `assigned` option must be disabled and `borrowed` auto-selected.

---

## Type Definitions

### Assignment Mode Type

```typescript
export type AssignmentMode =
  // Vehicle-Driver (6 modes)
  | 'assign-driver-to-vehicle'
  | 'assign-vehicle-to-driver'
  | 'transfer-vehicle'
  | 'unassign-vehicle'
  | 'extend-assignment'
  | 'end-assignment-early'
  // Location (3 modes)
  | 'assign-driver-to-location'
  | 'assign-vehicle-to-location'
  | 'assign-broker-to-location'
  // Broker (1 mode)
  | 'assign-drivers-to-broker';
```

### Source Context Type (Discriminated Union)

```typescript
export type SourceContext =
  | { 
      type: 'vehicle'; 
      vehicleId: string; 
      vehicleName: string;
    }
  | { 
      type: 'driver'; 
      driverId: string; 
      driverName: string; 
      employmentType: 'w2' | '1099';
    }
  | { 
      type: 'location'; 
      locationId: string; 
      locationName: string;
    }
  | { 
      type: 'broker'; 
      broker: Broker;
    }
  | { 
      type: 'assignment'; 
      assignmentId: string; 
      vehicleId: string;
      vehicleName: string; 
      currentDriverId: string; 
      currentDriverName: string;
      currentEndDate?: string;
      isOnlyVehicle?: boolean;
      isPrimary?: boolean;
    };
```

### Mode Configuration Type

```typescript
export interface ModeConfig {
  // Dialog metadata
  title: string;
  description: (ctx: SourceContext) => string;
  submitLabel: string;
  
  // Selection config
  selectionMode: 'single' | 'multi' | 'none';
  targetEntity: 'driver' | 'vehicle' | 'broker' | null;
  
  // UI panels to show
  showAssignmentType: boolean;
  showDateRange: boolean;
  showPrimaryToggle: boolean;
  showReason: boolean;
  showNotes: boolean;
  showNewEndDate: boolean;
  
  // Reason dropdown options (if showReason)
  reasonOptions?: string[];
  
  // Business logic
  employment1099Rules?: {
    disableAssignedType: boolean;
    forceBorrowedType: boolean;
  };
}
```

---

## Mode Configuration Reference

### assign-driver-to-vehicle

```typescript
{
  title: 'Assign Driver to Vehicle',
  description: (ctx) => `Select a driver to assign to ${ctx.vehicleName}`,
  submitLabel: 'Assign Driver',
  selectionMode: 'single',
  targetEntity: 'driver',
  showAssignmentType: true,
  showDateRange: true, // Only when borrowed
  showPrimaryToggle: true,
  showReason: false,
  showNotes: false,
  showNewEndDate: false,
  employment1099Rules: {
    disableAssignedType: true,
    forceBorrowedType: true,
  },
}
```

### transfer-vehicle

```typescript
{
  title: 'Transfer Vehicle',
  description: (ctx) => `${ctx.vehicleName} is currently assigned to ${ctx.currentDriverName}. Select a new driver.`,
  submitLabel: 'Transfer Vehicle',
  selectionMode: 'single',
  targetEntity: 'driver',
  showAssignmentType: false,
  showDateRange: false,
  showPrimaryToggle: true,
  showReason: true,
  showNotes: true,
  showNewEndDate: false,
  reasonOptions: ['Driver reassignment', 'Route optimization', 'Driver request', 'Other'],
}
```

### unassign-vehicle

```typescript
{
  title: 'Unassign Vehicle',
  description: (ctx) => `Unassign ${ctx.vehicleName} from ${ctx.currentDriverName}.`,
  submitLabel: 'Unassign Vehicle',
  selectionMode: 'none',
  targetEntity: null,
  showAssignmentType: false,
  showDateRange: false,
  showPrimaryToggle: false,
  showReason: true,
  showNotes: true,
  showNewEndDate: false,
  reasonOptions: ['Vehicle needs maintenance', 'Driver no longer needs', 'Driver terminated', 'Reassigning', 'Other'],
}
```

### assign-drivers-to-broker

```typescript
{
  title: 'Assign Drivers',
  description: (ctx) => `Select drivers to assign to ${ctx.broker.name}. Eligibility is based on status and employment type.`,
  submitLabel: 'Assign Drivers',
  selectionMode: 'multi',
  targetEntity: 'driver',
  showAssignmentType: false,
  showDateRange: false,
  showPrimaryToggle: false,
  showReason: false,
  showNotes: false,
  showNewEndDate: false,
  // Note: eligibilityFn handled separately
}
```

---

## File Structure

```
src/components/features/shared/assignment/
├── UnifiedAssignmentModal.tsx      # Main modal component (~200 lines)
├── types.ts                        # All type definitions (~80 lines)
├── config.ts                       # Mode configuration map (~200 lines)
├── EntitySelector.tsx              # Shared search/select component (~150 lines)
├── DriverListItem.tsx              # Driver row rendering (~50 lines)
├── VehicleListItem.tsx             # Vehicle row rendering (~50 lines)
├── BrokerListItem.tsx              # Broker row rendering (~40 lines)
├── AssignmentTypePanel.tsx         # Assignment type + dates (~80 lines)
├── ReasonPanel.tsx                 # Reason dropdown + notes (~60 lines)
├── PrimaryToggle.tsx               # Primary checkbox (~20 lines)
├── WarningBanner.tsx               # Contextual warnings (~60 lines)
├── hooks/
│   └── useAssignmentMutation.ts    # Route to correct service (~100 lines)
└── index.ts                        # Public exports
```

**Total: ~900 lines** (vs ~1,500 lines currently = 40% reduction)

---

## Warning Banner Logic

The WarningBanner component must handle these scenarios:

| Mode | Condition | Warning Message |
|------|-----------|-----------------|
| `transfer-vehicle` | Driver has 1 vehicle | "{driverName}'s only active vehicle. They will have no vehicle after this transfer." |
| `unassign-vehicle` | Driver has 1 vehicle | "{driverName} will have no vehicle after this unassignment." |
| `unassign-vehicle` | Is primary vehicle | "This is the primary vehicle. Another vehicle will be set as primary if available." |
| `assign-driver-to-vehicle` | 1099 selected | "1099 drivers can only have borrowed assignments." |

---

## Eligibility Logic (Broker Mode)

For `assign-drivers-to-broker` mode, drivers must pass eligibility check:

```typescript
const isEligible = (driver: DriverWithUser, broker: Broker) => {
  // Must be active
  if (driver.status !== 'active') return false;
  
  // If broker has no employment type restrictions, all active drivers eligible
  if (broker.accepted_employment_types.length === 0) return true;
  
  // Check employment type match
  return broker.accepted_employment_types.includes(driver.employment_type);
};
```

Display eligibility badge in the multi-select list:
- Eligible: Green badge "Eligible"
- Not Eligible: Muted outline badge "Not Eligible"

---

## Existing Hooks to Reuse

The UnifiedAssignmentModal will NOT create new services. It will use existing hooks:

| Hook | Source File | Used By Modes |
|------|-------------|---------------|
| `useAssignVehicle` | `useVehicleAssignments.ts` | assign-driver-to-vehicle, assign-vehicle-to-driver |
| `useTransferVehicle` | `useVehicleAssignments.ts` | transfer-vehicle |
| `useUnassignVehicle` | `useVehicleAssignments.ts` | unassign-vehicle |
| `useExtendAssignment` | `useVehicleAssignments.ts` | extend-assignment |
| `useEndAssignmentEarly` | `useVehicleAssignments.ts` | end-assignment-early |
| `useAssignDriverToLocation` | `useLocations.ts` | assign-driver-to-location |
| `useAssignVehicleToLocation` | `useLocations.ts` | assign-vehicle-to-location |
| `useAssignBrokerToLocation` | `useLocations.ts` | assign-broker-to-location |
| `useAssignDriverToBroker` | `useBrokers.ts` | assign-drivers-to-broker |
| `useAvailableDrivers` | `useVehicleAssignments.ts` | Driver selection modes |
| `useAvailableVehicles` | `useVehicleAssignments.ts` | Vehicle selection modes |
| `useBrokers` | `useBrokers.ts` | Broker selection modes |

---

## Migration Strategy

### Phase 1: Build Component (No Breaking Changes)
1. Create `src/components/features/shared/assignment/` folder structure
2. Implement all types, config, and subcomponents
3. Build and test UnifiedAssignmentModal independently

### Phase 2: Gradual Adoption
1. Migrate `LocationDetail` first (simplest - no date/type options)
2. Migrate `VehicleDetail` (most complex - all options)
3. Migrate `DriverDetail` and `BrokerDetail`
4. Each page migration is a separate, small change

### Phase 3: Cleanup
1. Remove old modal components from `src/components/features/admin/`
2. Delete ~1,500 lines of duplicated code

---

## Success Metrics

- [ ] 11 modals reduced to 1 component
- [ ] ~1,500 lines of code eliminated (40% reduction)
- [ ] All existing functionality preserved
- [ ] Consistent UX across all assignment flows
- [ ] Type-safe mode/context combinations
- [ ] No TypeScript errors after migration
