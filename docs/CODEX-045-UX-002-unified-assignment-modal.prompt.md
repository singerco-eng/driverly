# CODEX-045: UX-002 Unified Assignment Modal - Implementation Prompts

> **Each user story below is a self-contained task that can be completed by an individual agent.**
> **Reference the context document:** `docs/CODEX-045-UX-002-unified-assignment-modal.md`

---

## Prerequisites

Before starting any task:
1. Read the context document: `docs/CODEX-045-UX-002-unified-assignment-modal.md`
2. Understand the existing modal patterns in `src/components/features/admin/`
3. Run `npm run typecheck` after each story to verify no TypeScript errors

---

## User Story 1: Type Definitions

### Context
Create all TypeScript type definitions for the unified assignment modal system.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Full context - Type Definitions section
src/types/vehicleAssignment.ts                        # Existing assignment types
src/types/broker.ts                                   # Broker type for context
src/types/driver.ts                                   # Driver type reference
src/types/vehicle.ts                                  # Vehicle type reference
```

### Task
1. Create `src/components/features/shared/assignment/types.ts`

### Types to Create

```typescript
// src/components/features/shared/assignment/types.ts

import type { Broker } from '@/types/broker';
import type { AssignmentType } from '@/types/vehicleAssignment';

// ============================================
// ASSIGNMENT MODES
// ============================================

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

// ============================================
// SOURCE CONTEXT (Discriminated Union)
// ============================================

export type VehicleContext = {
  type: 'vehicle';
  vehicleId: string;
  vehicleName: string;
};

export type DriverContext = {
  type: 'driver';
  driverId: string;
  driverName: string;
  employmentType: 'w2' | '1099';
};

export type LocationContext = {
  type: 'location';
  locationId: string;
  locationName: string;
};

export type BrokerContext = {
  type: 'broker';
  broker: Broker;
};

export type AssignmentContext = {
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

export type SourceContext =
  | VehicleContext
  | DriverContext
  | LocationContext
  | BrokerContext
  | AssignmentContext;

// ============================================
// MODE CONFIGURATION
// ============================================

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

// ============================================
// MODAL PROPS
// ============================================

export interface UnifiedAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AssignmentMode;
  context: SourceContext;
  onSuccess?: () => void;
}

// ============================================
// INTERNAL STATE
// ============================================

export interface AssignmentFormState {
  selectedIds: string[];
  assignmentType: AssignmentType;
  isPrimary: boolean;
  startsAt?: Date;
  endsAt?: Date;
  newEndDate?: Date;
  reason: string;
  notes: string;
}

// ============================================
// ENTITY SELECTOR PROPS
// ============================================

export interface EntitySelectorProps {
  mode: 'single' | 'multi';
  targetEntity: 'driver' | 'vehicle' | 'broker';
  context: SourceContext;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDriverSelect?: (driver: any) => void; // For 1099 rules
}

// ============================================
// PANEL PROPS
// ============================================

export interface AssignmentTypePanelProps {
  value: AssignmentType;
  onChange: (value: AssignmentType) => void;
  disabled1099: boolean;
  showDates: boolean;
  startsAt?: Date;
  endsAt?: Date;
  onStartsAtChange: (date?: Date) => void;
  onEndsAtChange: (date?: Date) => void;
}

export interface ReasonPanelProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  showNotes: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
}

export interface WarningBannerProps {
  mode: AssignmentMode;
  context: SourceContext;
  selectedIds: string[];
  selectedDriver?: any; // For 1099 warning
}
```

### Verification
- [ ] All types compile without errors
- [ ] AssignmentMode has exactly 10 values
- [ ] SourceContext discriminated union covers all 5 context types
- [ ] ModeConfig interface matches context document specification
- [ ] No TypeScript errors when running `npm run typecheck`

---

## User Story 2: Mode Configuration Map

### Context
Create the configuration map that defines behavior for each of the 10 assignment modes.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Mode Configuration Reference section
src/components/features/admin/AssignDriverToVehicleModal.tsx    # Existing patterns
src/components/features/admin/TransferVehicleModal.tsx          # Reason options
src/components/features/admin/UnassignVehicleModal.tsx          # Reason options
```

### Task
1. Create `src/components/features/shared/assignment/config.ts`

### Implementation

```typescript
// src/components/features/shared/assignment/config.ts

import type { AssignmentMode, ModeConfig, SourceContext, AssignmentContext } from './types';

// Helper to safely cast context
const asAssignment = (ctx: SourceContext): AssignmentContext => ctx as AssignmentContext;

export const ASSIGNMENT_MODE_CONFIGS: Record<AssignmentMode, ModeConfig> = {
  // ============================================
  // VEHICLE-DRIVER MODES
  // ============================================

  'assign-driver-to-vehicle': {
    title: 'Assign Driver to Vehicle',
    description: (ctx) => `Select a driver to assign to ${(ctx as any).vehicleName}.`,
    submitLabel: 'Assign Driver',
    selectionMode: 'single',
    targetEntity: 'driver',
    showAssignmentType: true,
    showDateRange: true,
    showPrimaryToggle: true,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
    employment1099Rules: {
      disableAssignedType: true,
      forceBorrowedType: true,
    },
  },

  'assign-vehicle-to-driver': {
    title: 'Assign Vehicle to Driver',
    description: (ctx) => {
      const d = ctx as any;
      return `Select a company vehicle to assign to ${d.driverName} (${d.employmentType.toUpperCase()}).`;
    },
    submitLabel: 'Assign Vehicle',
    selectionMode: 'single',
    targetEntity: 'vehicle',
    showAssignmentType: true,
    showDateRange: true,
    showPrimaryToggle: true,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
  },

  'transfer-vehicle': {
    title: 'Transfer Vehicle',
    description: (ctx) => {
      const a = asAssignment(ctx);
      return `${a.vehicleName} is currently assigned to ${a.currentDriverName}. Select a new driver.`;
    },
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
  },

  'unassign-vehicle': {
    title: 'Unassign Vehicle',
    description: (ctx) => {
      const a = asAssignment(ctx);
      return `Unassign ${a.vehicleName} from ${a.currentDriverName}.`;
    },
    submitLabel: 'Unassign Vehicle',
    selectionMode: 'none',
    targetEntity: null,
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: true,
    showNotes: true,
    showNewEndDate: false,
    reasonOptions: [
      'Vehicle needs maintenance',
      'Driver no longer needs',
      'Driver terminated',
      'Reassigning',
      'Other',
    ],
  },

  'extend-assignment': {
    title: 'Extend Borrowed Assignment',
    description: (ctx) => {
      const a = asAssignment(ctx);
      const endDate = a.currentEndDate ? new Date(a.currentEndDate).toLocaleDateString() : 'N/A';
      return `${a.vehicleName} is scheduled to end on ${endDate}. Select a new end date.`;
    },
    submitLabel: 'Extend Assignment',
    selectionMode: 'none',
    targetEntity: null,
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: false,
    showNotes: true,
    showNewEndDate: true,
  },

  'end-assignment-early': {
    title: 'End Assignment Early',
    description: (ctx) => {
      const a = asAssignment(ctx);
      return `End the borrowed assignment of ${a.vehicleName} before the scheduled end date.`;
    },
    submitLabel: 'End Assignment',
    selectionMode: 'none',
    targetEntity: null,
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: true,
    showNotes: false,
    showNewEndDate: false,
    reasonOptions: ['No longer needed', 'Driver request', 'Vehicle issue', 'Other'],
  },

  // ============================================
  // LOCATION MODES
  // ============================================

  'assign-driver-to-location': {
    title: 'Assign Driver to Location',
    description: (ctx) => `Select a driver to assign to ${(ctx as any).locationName}.`,
    submitLabel: 'Assign Driver',
    selectionMode: 'single',
    targetEntity: 'driver',
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
  },

  'assign-vehicle-to-location': {
    title: 'Assign Vehicle to Location',
    description: (ctx) => `Select a vehicle to assign to ${(ctx as any).locationName}.`,
    submitLabel: 'Assign Vehicle',
    selectionMode: 'single',
    targetEntity: 'vehicle',
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
  },

  'assign-broker-to-location': {
    title: 'Assign Trip Source to Location',
    description: (ctx) => `Select a trip source to associate with ${(ctx as any).locationName}.`,
    submitLabel: 'Assign Trip Source',
    selectionMode: 'single',
    targetEntity: 'broker',
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
  },

  // ============================================
  // BROKER MODES
  // ============================================

  'assign-drivers-to-broker': {
    title: 'Assign Drivers',
    description: (ctx) => {
      const b = ctx as any;
      return `Select drivers to assign to ${b.broker.name}. Eligibility is based on status and employment type.`;
    },
    submitLabel: 'Assign Drivers',
    selectionMode: 'multi',
    targetEntity: 'driver',
    showAssignmentType: false,
    showDateRange: false,
    showPrimaryToggle: false,
    showReason: false,
    showNotes: false,
    showNewEndDate: false,
  },
};

// ============================================
// HELPER: Get config for mode
// ============================================

export function getModeConfig(mode: AssignmentMode): ModeConfig {
  return ASSIGNMENT_MODE_CONFIGS[mode];
}
```

### Verification
- [ ] All 10 modes have configurations
- [ ] description functions return correct strings for each context type
- [ ] reasonOptions match existing modals exactly
- [ ] employment1099Rules only set for assign-driver-to-vehicle
- [ ] No TypeScript errors

---

## User Story 3: Entity Selector Component

### Context
Create the unified entity selector that handles single and multi-select for drivers, vehicles, and brokers.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Architecture section
src/components/features/admin/AssignDriverToVehicleModal.tsx    # Driver selection pattern (lines 56-180)
src/components/features/admin/AssignDriversModal.tsx            # Multi-select pattern
src/hooks/useVehicleAssignments.ts                              # useAvailableDrivers, useAvailableVehicles
```

### Task
1. Create `src/components/features/shared/assignment/EntitySelector.tsx`
2. Create `src/components/features/shared/assignment/DriverListItem.tsx`
3. Create `src/components/features/shared/assignment/VehicleListItem.tsx`
4. Create `src/components/features/shared/assignment/BrokerListItem.tsx`

### EntitySelector Implementation

```typescript
// src/components/features/shared/assignment/EntitySelector.tsx

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Car, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailableDrivers, useAvailableVehicles } from '@/hooks/useVehicleAssignments';
import { useBrokers } from '@/hooks/useBrokers';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { DriverListItem } from './DriverListItem';
import { VehicleListItem } from './VehicleListItem';
import { BrokerListItem } from './BrokerListItem';
import type { EntitySelectorProps, SourceContext } from './types';

export function EntitySelector({
  mode,
  targetEntity,
  context,
  selectedIds,
  onSelectionChange,
  onDriverSelect,
}: EntitySelectorProps) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');

  // Fetch data based on target entity and context
  const { data: availableDrivers, isLoading: driversLoading } = useAvailableDrivers(
    targetEntity === 'driver' ? profile?.company_id : undefined
  );
  const { data: allDrivers, isLoading: allDriversLoading } = useDrivers();
  const { data: availableVehicles, isLoading: vehiclesLoading } = useAvailableVehicles(
    targetEntity === 'vehicle' ? profile?.company_id : undefined
  );
  const { data: brokers, isLoading: brokersLoading } = useBrokers(
    targetEntity === 'broker' ? profile?.company_id : undefined
  );

  // Use appropriate driver source based on mode
  const drivers = context.type === 'broker' ? allDrivers : availableDrivers;
  const isLoading =
    (targetEntity === 'driver' && (context.type === 'broker' ? allDriversLoading : driversLoading)) ||
    (targetEntity === 'vehicle' && vehiclesLoading) ||
    (targetEntity === 'broker' && brokersLoading);

  // Filter entities based on context and search
  const filteredEntities = useMemo(() => {
    let entities: any[] = [];

    if (targetEntity === 'driver') {
      entities = drivers || [];
      // Filter out current driver for transfer mode
      if (context.type === 'assignment') {
        entities = entities.filter((d: any) => d.id !== context.currentDriverId);
      }
      // Filter out already assigned drivers for location mode
      if (context.type === 'location') {
        entities = entities.filter((d: any) => d.location_id !== context.locationId);
      }
      // Filter out already assigned drivers for broker mode
      if (context.type === 'broker') {
        // This filtering happens in the parent or via broker assignments query
      }
    } else if (targetEntity === 'vehicle') {
      entities = availableVehicles || [];
      // Filter out already assigned vehicles for location mode
      if (context.type === 'location') {
        entities = entities.filter((v: any) => v.location_id !== context.locationId);
      }
    } else if (targetEntity === 'broker') {
      entities = brokers || [];
      // Filter out already assigned brokers for location mode
      // This would require location broker assignments data
    }

    // Apply search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      entities = entities.filter((entity: any) => {
        if (targetEntity === 'driver') {
          return `${entity.user?.full_name} ${entity.user?.email}`.toLowerCase().includes(term);
        }
        if (targetEntity === 'vehicle') {
          return `${entity.year} ${entity.make} ${entity.model} ${entity.license_plate}`.toLowerCase().includes(term);
        }
        if (targetEntity === 'broker') {
          return entity.name.toLowerCase().includes(term);
        }
        return true;
      });
    }

    return entities;
  }, [drivers, availableVehicles, brokers, targetEntity, context, search]);

  // Handle selection
  const handleSingleSelect = (id: string) => {
    onSelectionChange([id]);
    if (targetEntity === 'driver' && onDriverSelect) {
      const driver = filteredEntities.find((d: any) => d.id === id);
      onDriverSelect(driver);
    }
  };

  const handleMultiSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredEntities.map((e: any) => e.id));
    } else {
      onSelectionChange([]);
    }
  };

  // Get placeholder and icon
  const getSearchPlaceholder = () => {
    switch (targetEntity) {
      case 'driver': return 'Search by name or email...';
      case 'vehicle': return 'Search by make, model, or plate...';
      case 'broker': return 'Search by name...';
      default: return 'Search...';
    }
  };

  const EmptyIcon = targetEntity === 'driver' ? Users : targetEntity === 'vehicle' ? Car : Building2;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={getSearchPlaceholder()}
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="rounded-lg border p-3 max-h-64 overflow-auto space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))
        ) : filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <EmptyIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">
              {search ? 'No matches found' : `No ${targetEntity}s available`}
            </p>
          </div>
        ) : mode === 'single' ? (
          <RadioGroup value={selectedIds[0] || ''} onValueChange={handleSingleSelect}>
            {filteredEntities.map((entity: any) => (
              <div key={entity.id}>
                {targetEntity === 'driver' && (
                  <DriverListItem driver={entity} context={context} />
                )}
                {targetEntity === 'vehicle' && (
                  <VehicleListItem vehicle={entity} />
                )}
                {targetEntity === 'broker' && (
                  <BrokerListItem broker={entity} />
                )}
              </div>
            ))}
          </RadioGroup>
        ) : (
          <>
            {/* Select All for multi-select */}
            <div className="flex items-center gap-2 pb-2 border-b mb-2">
              <Checkbox
                checked={selectedIds.length === filteredEntities.length && filteredEntities.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all ({filteredEntities.length})
              </span>
            </div>
            {filteredEntities.map((entity: any) => (
              <div
                key={entity.id}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer"
                onClick={() => handleMultiSelect(entity.id, !selectedIds.includes(entity.id))}
              >
                <Checkbox
                  checked={selectedIds.includes(entity.id)}
                  onCheckedChange={(checked) => handleMultiSelect(entity.id, checked === true)}
                  onClick={(e) => e.stopPropagation()}
                />
                {targetEntity === 'driver' && (
                  <DriverListItem driver={entity} context={context} isMultiSelect />
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Selection count for multi-select */}
      {mode === 'multi' && selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} {targetEntity}{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
```

### DriverListItem Implementation

```typescript
// src/components/features/shared/assignment/DriverListItem.tsx

import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';
import type { SourceContext } from './types';

interface DriverListItemProps {
  driver: any;
  context: SourceContext;
  isMultiSelect?: boolean;
}

export function DriverListItem({ driver, context, isMultiSelect }: DriverListItemProps) {
  const activeCount = driver.active_assignments?.length || 0;
  const is1099 = driver.employment_type === '1099';

  // Eligibility check for broker context
  const isEligible = context.type === 'broker'
    ? driver.status === 'active' &&
      (context.broker.accepted_employment_types.length === 0 ||
        context.broker.accepted_employment_types.includes(driver.employment_type))
    : true;

  const content = (
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{driver.user?.full_name}</span>
        <Badge variant="outline" className="uppercase text-xs">
          {driver.employment_type}
        </Badge>
        {driver.status !== 'active' && (
          <Badge variant="secondary" className="uppercase text-xs">
            {driver.status}
          </Badge>
        )}
        {context.type === 'broker' && (
          <Badge
            variant={isEligible ? 'default' : 'outline'}
            className={
              isEligible
                ? 'bg-green-500/20 text-green-600 border-green-500/30 text-xs'
                : 'text-muted-foreground text-xs'
            }
          >
            {isEligible ? 'Eligible' : 'Not Eligible'}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {driver.user?.email}
      </p>
      {!isMultiSelect && (
        <p className="text-sm text-muted-foreground">
          {activeCount === 0
            ? 'No vehicle assigned'
            : `${activeCount} active vehicle${activeCount === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );

  if (isMultiSelect) {
    return content;
  }

  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={driver.id} className="mt-1" />
      {content}
    </label>
  );
}
```

### VehicleListItem Implementation

```typescript
// src/components/features/shared/assignment/VehicleListItem.tsx

import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';

interface VehicleListItemProps {
  vehicle: any;
}

export function VehicleListItem({ vehicle }: VehicleListItemProps) {
  const current = vehicle.current_assignment;
  const assignedTo = current?.driver?.user?.full_name;
  const isAssigned = !!assignedTo;

  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={vehicle.id} className="mt-1" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
          <Badge variant="outline" className="capitalize text-xs">
            {vehicle.vehicle_type?.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Plate: {vehicle.license_plate || '—'}
        </p>
        {isAssigned && (
          <p className="text-xs text-amber-600">
            Assigned to {assignedTo}. Selecting will transfer this vehicle.
          </p>
        )}
      </div>
    </label>
  );
}
```

### BrokerListItem Implementation

```typescript
// src/components/features/shared/assignment/BrokerListItem.tsx

import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { getSourceTypeLabel } from '@/types/broker';

interface BrokerListItemProps {
  broker: any;
}

export function BrokerListItem({ broker }: BrokerListItemProps) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={broker.id} className="mt-1" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{broker.name}</span>
          <Badge variant="outline" className="text-xs">
            {getSourceTypeLabel(broker.source_type)}
          </Badge>
          {broker.status !== 'active' && (
            <Badge variant="secondary" className="uppercase text-xs">
              {broker.status}
            </Badge>
          )}
        </div>
        {broker.code && (
          <p className="text-sm text-muted-foreground">Code: {broker.code}</p>
        )}
      </div>
    </label>
  );
}
```

### Verification
- [ ] EntitySelector renders correctly for all three entity types
- [ ] Single select uses RadioGroup
- [ ] Multi-select uses Checkboxes with select all
- [ ] Search filtering works for all entity types
- [ ] Driver eligibility badges show for broker context
- [ ] "Assigned to X" warning shows for vehicles with current assignment
- [ ] Empty state displays correctly
- [ ] No TypeScript errors

---

## User Story 4: Assignment Panels

### Context
Create the reusable panel components for assignment type selection, date pickers, and reason input.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Mode Configuration section
src/components/features/admin/AssignDriverToVehicleModal.tsx    # Assignment type pattern (lines 185-218)
src/components/features/admin/TransferVehicleModal.tsx          # Reason pattern (lines 165-196)
src/components/features/admin/ExtendAssignmentModal.tsx         # Date pattern
```

### Task
1. Create `src/components/features/shared/assignment/AssignmentTypePanel.tsx`
2. Create `src/components/features/shared/assignment/ReasonPanel.tsx`
3. Create `src/components/features/shared/assignment/PrimaryToggle.tsx`

### AssignmentTypePanel Implementation

```typescript
// src/components/features/shared/assignment/AssignmentTypePanel.tsx

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import type { AssignmentType } from '@/types/vehicleAssignment';
import type { AssignmentTypePanelProps } from './types';

export function AssignmentTypePanel({
  value,
  onChange,
  disabled1099,
  showDates,
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
}: AssignmentTypePanelProps) {
  const needsEndDate = value === 'borrowed';
  const hasValidEndDate = !needsEndDate || (!!endsAt && (!startsAt || endsAt.getTime() > startsAt.getTime()));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Assignment Type</label>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as AssignmentType)}
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="assigned" disabled={disabled1099} />
            <span className={disabled1099 ? 'text-muted-foreground' : ''}>
              Assigned (ongoing)
            </span>
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="borrowed" />
            Borrowed (temporary)
          </label>
        </RadioGroup>
        {disabled1099 && (
          <p className="text-xs text-muted-foreground">
            1099 drivers can only have borrowed assignments.
          </p>
        )}
      </div>

      {showDates && needsEndDate && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Start Date (optional)</label>
            <DatePicker date={startsAt} onDateChange={onStartsAtChange} />
          </div>
          <div>
            <label className="text-sm font-medium">End Date</label>
            <DatePicker date={endsAt} onDateChange={onEndsAtChange} />
            {!hasValidEndDate && endsAt && (
              <p className="text-xs text-destructive mt-1">
                End date must be after start date.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### ReasonPanel Implementation

```typescript
// src/components/features/shared/assignment/ReasonPanel.tsx

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ReasonPanelProps } from './types';

export function ReasonPanel({
  options,
  value,
  onChange,
  showNotes,
  notes,
  onNotesChange,
}: ReasonPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Reason</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showNotes && (
        <div>
          <label className="text-sm font-medium">Additional Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Optional notes..."
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}
```

### PrimaryToggle Implementation

```typescript
// src/components/features/shared/assignment/PrimaryToggle.tsx

import { Checkbox } from '@/components/ui/checkbox';

interface PrimaryToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function PrimaryToggle({
  checked,
  onChange,
  label = 'Set as primary vehicle',
}: PrimaryToggleProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      {label}
    </label>
  );
}
```

### Verification
- [ ] AssignmentTypePanel shows assigned/borrowed options
- [ ] Assigned option disabled when disabled1099 is true
- [ ] Date pickers only show when borrowed is selected
- [ ] End date validation works correctly
- [ ] ReasonPanel dropdown shows all options
- [ ] Notes textarea appears when showNotes is true
- [ ] PrimaryToggle checkbox works correctly
- [ ] No TypeScript errors

---

## User Story 5: Warning Banner Component

### Context
Create a component that shows contextual warnings based on the assignment mode and current state.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Warning Banner Logic section
src/components/features/admin/TransferVehicleModal.tsx    # Warning pattern (lines 199-204)
src/components/features/admin/UnassignVehicleModal.tsx    # Warning pattern (lines 115-121)
```

### Task
1. Create `src/components/features/shared/assignment/WarningBanner.tsx`

### Implementation

```typescript
// src/components/features/shared/assignment/WarningBanner.tsx

import { AlertTriangle } from 'lucide-react';
import type { WarningBannerProps } from './types';

export function WarningBanner({
  mode,
  context,
  selectedIds,
  selectedDriver,
}: WarningBannerProps) {
  const warnings: string[] = [];

  // Transfer/Unassign: Driver will have no vehicles
  if (
    (mode === 'transfer-vehicle' || mode === 'unassign-vehicle') &&
    context.type === 'assignment' &&
    context.isOnlyVehicle
  ) {
    warnings.push(
      `This is ${context.currentDriverName}'s only active vehicle. They will have no vehicle after this ${mode === 'transfer-vehicle' ? 'transfer' : 'unassignment'}.`
    );
  }

  // Unassign: Is primary vehicle
  if (
    mode === 'unassign-vehicle' &&
    context.type === 'assignment' &&
    context.isPrimary &&
    !context.isOnlyVehicle
  ) {
    warnings.push(
      'This is the primary vehicle. Another vehicle will be set as primary if available.'
    );
  }

  // 1099 driver selected for vehicle assignment
  if (
    (mode === 'assign-driver-to-vehicle') &&
    selectedDriver?.employment_type === '1099'
  ) {
    warnings.push('1099 drivers can only have borrowed (temporary) assignments.');
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
```

### Verification
- [ ] Warning shows when driver will have no vehicles after transfer
- [ ] Warning shows when driver will have no vehicles after unassign
- [ ] Warning shows when unassigning primary vehicle
- [ ] Warning shows when 1099 driver selected
- [ ] No warning banner rendered when no warnings apply
- [ ] Dark mode styling works correctly
- [ ] No TypeScript errors

---

## User Story 6: Assignment Mutation Hook

### Context
Create a hook that routes form submissions to the correct existing mutation based on the assignment mode.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Existing Hooks to Reuse section
src/hooks/useVehicleAssignments.ts                   # Vehicle assignment mutations
src/hooks/useLocations.ts                            # Location assignment mutations
src/hooks/useBrokers.ts                              # Broker assignment mutations
```

### Task
1. Create `src/components/features/shared/assignment/hooks/useAssignmentMutation.ts`

### Implementation

```typescript
// src/components/features/shared/assignment/hooks/useAssignmentMutation.ts

import { useCallback, useMemo } from 'react';
import {
  useAssignVehicle,
  useTransferVehicle,
  useUnassignVehicle,
  useExtendAssignment,
  useEndAssignmentEarly,
} from '@/hooks/useVehicleAssignments';
import {
  useAssignDriverToLocation,
  useAssignVehicleToLocation,
  useAssignBrokerToLocation,
} from '@/hooks/useLocations';
import { useAssignDriverToBroker } from '@/hooks/useBrokers';
import { useAuth } from '@/contexts/AuthContext';
import type { AssignmentMode, SourceContext, AssignmentFormState } from '../types';

interface MutationResult {
  mutate: (state: AssignmentFormState) => Promise<void>;
  isPending: boolean;
}

export function useAssignmentMutation(
  mode: AssignmentMode,
  context: SourceContext
): MutationResult {
  const { profile } = useAuth();

  // Initialize all mutations
  const assignVehicle = useAssignVehicle();
  const transferVehicle = useTransferVehicle();
  const unassignVehicle = useUnassignVehicle();
  const extendAssignment = useExtendAssignment();
  const endAssignmentEarly = useEndAssignmentEarly();
  const assignDriverToLocation = useAssignDriverToLocation();
  const assignVehicleToLocation = useAssignVehicleToLocation();
  const assignBrokerToLocation = useAssignBrokerToLocation();
  const assignDriverToBroker = useAssignDriverToBroker();

  const mutate = useCallback(
    async (state: AssignmentFormState) => {
      switch (mode) {
        case 'assign-driver-to-vehicle':
          if (context.type !== 'vehicle') throw new Error('Invalid context');
          await assignVehicle.mutateAsync({
            vehicle_id: context.vehicleId,
            driver_id: state.selectedIds[0],
            assignment_type: state.assignmentType,
            is_primary: state.isPrimary,
            starts_at: state.startsAt?.toISOString(),
            ends_at: state.assignmentType === 'borrowed' && state.endsAt
              ? state.endsAt.toISOString()
              : undefined,
          });
          break;

        case 'assign-vehicle-to-driver':
          if (context.type !== 'driver') throw new Error('Invalid context');
          await assignVehicle.mutateAsync({
            vehicle_id: state.selectedIds[0],
            driver_id: context.driverId,
            assignment_type: state.assignmentType,
            is_primary: state.isPrimary,
            starts_at: state.startsAt?.toISOString(),
            ends_at: state.assignmentType === 'borrowed' && state.endsAt
              ? state.endsAt.toISOString()
              : undefined,
          });
          break;

        case 'transfer-vehicle':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await transferVehicle.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              to_driver_id: state.selectedIds[0],
              reason: state.reason,
              notes: state.notes || undefined,
              is_primary: state.isPrimary,
            },
          });
          break;

        case 'unassign-vehicle':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await unassignVehicle.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              reason: state.reason,
              notes: state.notes || undefined,
            },
          });
          break;

        case 'extend-assignment':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          if (!state.newEndDate) throw new Error('New end date required');
          await extendAssignment.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              new_ends_at: state.newEndDate.toISOString(),
              reason: state.notes || undefined,
            },
          });
          break;

        case 'end-assignment-early':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await endAssignmentEarly.mutateAsync({
            assignmentId: context.assignmentId,
            reason: state.reason,
          });
          break;

        case 'assign-driver-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          await assignDriverToLocation.mutateAsync({
            driverId: state.selectedIds[0],
            locationId: context.locationId,
          });
          break;

        case 'assign-vehicle-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          await assignVehicleToLocation.mutateAsync({
            vehicleId: state.selectedIds[0],
            locationId: context.locationId,
          });
          break;

        case 'assign-broker-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          if (!profile?.company_id) throw new Error('Company ID required');
          await assignBrokerToLocation.mutateAsync({
            locationId: context.locationId,
            brokerId: state.selectedIds[0],
            companyId: profile.company_id,
          });
          break;

        case 'assign-drivers-to-broker':
          if (context.type !== 'broker') throw new Error('Invalid context');
          // Bulk assign - call mutation for each driver
          await Promise.all(
            state.selectedIds.map((driverId) =>
              assignDriverToBroker.mutateAsync({
                driverId,
                brokerId: context.broker.id,
              })
            )
          );
          break;

        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    },
    [
      mode,
      context,
      profile?.company_id,
      assignVehicle,
      transferVehicle,
      unassignVehicle,
      extendAssignment,
      endAssignmentEarly,
      assignDriverToLocation,
      assignVehicleToLocation,
      assignBrokerToLocation,
      assignDriverToBroker,
    ]
  );

  const isPending = useMemo(
    () =>
      assignVehicle.isPending ||
      transferVehicle.isPending ||
      unassignVehicle.isPending ||
      extendAssignment.isPending ||
      endAssignmentEarly.isPending ||
      assignDriverToLocation.isPending ||
      assignVehicleToLocation.isPending ||
      assignBrokerToLocation.isPending ||
      assignDriverToBroker.isPending,
    [
      assignVehicle.isPending,
      transferVehicle.isPending,
      unassignVehicle.isPending,
      extendAssignment.isPending,
      endAssignmentEarly.isPending,
      assignDriverToLocation.isPending,
      assignVehicleToLocation.isPending,
      assignBrokerToLocation.isPending,
      assignDriverToBroker.isPending,
    ]
  );

  return { mutate, isPending };
}
```

### Verification
- [ ] Hook compiles without errors
- [ ] All 10 modes have case handlers
- [ ] Context type validation in each case
- [ ] isPending aggregates all mutation pending states
- [ ] Bulk assignment for broker mode calls all mutations
- [ ] No TypeScript errors

---

## User Story 7: Main UnifiedAssignmentModal Component

### Context
Create the main modal component that ties together all subcomponents and handles the complete assignment workflow.

### Required Reading
```
docs/CODEX-045-UX-002-unified-assignment-modal.md    # Core Component Logic section
src/components/features/admin/AssignDriverToVehicleModal.tsx    # State management pattern
src/components/features/shared/assignment/*                      # All subcomponents from previous stories
```

### Task
1. Create `src/components/features/shared/assignment/UnifiedAssignmentModal.tsx`
2. Create `src/components/features/shared/assignment/index.ts` (exports)

### UnifiedAssignmentModal Implementation

```typescript
// src/components/features/shared/assignment/UnifiedAssignmentModal.tsx

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getModeConfig } from './config';
import { EntitySelector } from './EntitySelector';
import { AssignmentTypePanel } from './AssignmentTypePanel';
import { ReasonPanel } from './ReasonPanel';
import { PrimaryToggle } from './PrimaryToggle';
import { WarningBanner } from './WarningBanner';
import { useAssignmentMutation } from './hooks/useAssignmentMutation';
import type { UnifiedAssignmentModalProps, AssignmentFormState } from './types';
import type { AssignmentType } from '@/types/vehicleAssignment';

const initialState: AssignmentFormState = {
  selectedIds: [],
  assignmentType: 'assigned',
  isPrimary: false,
  startsAt: undefined,
  endsAt: undefined,
  newEndDate: undefined,
  reason: '',
  notes: '',
};

export function UnifiedAssignmentModal({
  open,
  onOpenChange,
  mode,
  context,
  onSuccess,
}: UnifiedAssignmentModalProps) {
  const { toast } = useToast();
  const config = getModeConfig(mode);
  const { mutate, isPending } = useAssignmentMutation(mode, context);

  // Form state
  const [state, setState] = useState<AssignmentFormState>(initialState);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setState({
        ...initialState,
        // Default primary to true for first vehicle assignment
        isPrimary: config.showPrimaryToggle,
      });
      setSelectedDriver(null);
    }
  }, [open, config.showPrimaryToggle]);

  // Handle 1099 rules
  useEffect(() => {
    if (config.employment1099Rules && selectedDriver?.employment_type === '1099') {
      if (state.assignmentType === 'assigned') {
        setState((s) => ({ ...s, assignmentType: 'borrowed' }));
      }
    }
  }, [selectedDriver, config.employment1099Rules, state.assignmentType]);

  // Auto-set primary based on existing assignments
  useEffect(() => {
    if (selectedDriver && config.showPrimaryToggle) {
      const activeCount = selectedDriver.active_assignments?.length || 0;
      setState((s) => ({ ...s, isPrimary: activeCount === 0 }));
    }
  }, [selectedDriver, config.showPrimaryToggle]);

  // Validation
  const canSubmit = useCallback(() => {
    // Selection required for non-'none' modes
    if (config.selectionMode !== 'none' && state.selectedIds.length === 0) {
      return false;
    }

    // Reason required when shown
    if (config.showReason && !state.reason) {
      return false;
    }

    // New end date required for extend mode
    if (config.showNewEndDate && !state.newEndDate) {
      return false;
    }

    // Valid end date for borrowed assignments
    if (config.showDateRange && state.assignmentType === 'borrowed') {
      if (!state.endsAt) return false;
      if (state.startsAt && state.endsAt.getTime() <= state.startsAt.getTime()) {
        return false;
      }
    }

    // New end date must be after current end date
    if (config.showNewEndDate && context.type === 'assignment' && context.currentEndDate) {
      const currentEnd = new Date(context.currentEndDate);
      if (state.newEndDate && state.newEndDate.getTime() <= currentEnd.getTime()) {
        return false;
      }
    }

    return true;
  }, [config, state, context]);

  // Submit handler
  const handleSubmit = async () => {
    if (!canSubmit()) return;

    try {
      await mutate(state);
      toast({
        title: 'Success',
        description: `${config.title} completed successfully.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  // Check if 1099 rules should disable assigned type
  const disabled1099 =
    config.employment1099Rules?.disableAssignedType &&
    selectedDriver?.employment_type === '1099';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description(context)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Entity Selector */}
          {config.selectionMode !== 'none' && config.targetEntity && (
            <EntitySelector
              mode={config.selectionMode}
              targetEntity={config.targetEntity}
              context={context}
              selectedIds={state.selectedIds}
              onSelectionChange={(ids) => setState((s) => ({ ...s, selectedIds: ids }))}
              onDriverSelect={setSelectedDriver}
            />
          )}

          {/* Assignment Type Panel */}
          {config.showAssignmentType && (
            <AssignmentTypePanel
              value={state.assignmentType}
              onChange={(v) => setState((s) => ({ ...s, assignmentType: v }))}
              disabled1099={disabled1099 || false}
              showDates={config.showDateRange}
              startsAt={state.startsAt}
              endsAt={state.endsAt}
              onStartsAtChange={(d) => setState((s) => ({ ...s, startsAt: d }))}
              onEndsAtChange={(d) => setState((s) => ({ ...s, endsAt: d }))}
            />
          )}

          {/* New End Date (for extend mode) */}
          {config.showNewEndDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">New End Date</label>
              <DatePicker
                date={state.newEndDate}
                onDateChange={(d) => setState((s) => ({ ...s, newEndDate: d }))}
              />
              {context.type === 'assignment' && context.currentEndDate && state.newEndDate && (
                (() => {
                  const currentEnd = new Date(context.currentEndDate);
                  const isValid = state.newEndDate.getTime() > currentEnd.getTime();
                  return !isValid ? (
                    <p className="text-xs text-destructive">
                      New end date must be after current end date ({currentEnd.toLocaleDateString()}).
                    </p>
                  ) : null;
                })()
              )}
              {/* Optional reason/notes for extend */}
              {config.showNotes && (
                <div className="mt-4">
                  <label className="text-sm font-medium">Reason (optional)</label>
                  <Textarea
                    value={state.notes}
                    onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Optional reason for extension..."
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Reason Panel */}
          {config.showReason && config.reasonOptions && (
            <ReasonPanel
              options={config.reasonOptions}
              value={state.reason}
              onChange={(v) => setState((s) => ({ ...s, reason: v }))}
              showNotes={config.showNotes}
              notes={state.notes}
              onNotesChange={(v) => setState((s) => ({ ...s, notes: v }))}
            />
          )}

          {/* Primary Toggle */}
          {config.showPrimaryToggle && (
            <PrimaryToggle
              checked={state.isPrimary}
              onChange={(v) => setState((s) => ({ ...s, isPrimary: v }))}
              label={
                mode === 'transfer-vehicle'
                  ? 'Set as primary for new driver'
                  : 'Set as primary vehicle'
              }
            />
          )}

          {/* Warning Banner */}
          <WarningBanner
            mode={mode}
            context={context}
            selectedIds={state.selectedIds}
            selectedDriver={selectedDriver}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isPending}>
            {isPending ? 'Processing...' : config.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Index Exports

```typescript
// src/components/features/shared/assignment/index.ts

export { UnifiedAssignmentModal } from './UnifiedAssignmentModal';
export type {
  AssignmentMode,
  SourceContext,
  VehicleContext,
  DriverContext,
  LocationContext,
  BrokerContext,
  AssignmentContext,
  UnifiedAssignmentModalProps,
} from './types';
```

### Verification
- [ ] Modal opens and closes correctly
- [ ] Title and description update based on mode
- [ ] Entity selector shows/hides based on config
- [ ] Assignment type panel shows/hides based on config
- [ ] Date pickers appear when borrowed selected
- [ ] Reason panel shows/hides based on config
- [ ] Primary toggle shows/hides based on config
- [ ] Warning banner shows appropriate warnings
- [ ] Submit button disabled until form is valid
- [ ] Submit calls correct mutation
- [ ] Success toast shows after submission
- [ ] Error toast shows on failure
- [ ] No TypeScript errors

---

## User Story 8: Migrate LocationDetail Page

### Context
Migrate the LocationDetail page to use UnifiedAssignmentModal for all three assignment types.

### Required Reading
```
src/pages/admin/LocationDetail.tsx                              # Current implementation
src/components/features/admin/AssignDriverToLocationModal.tsx   # Modal to replace
src/components/features/admin/AssignVehicleToLocationModal.tsx  # Modal to replace
src/components/features/admin/AssignBrokerToLocationModal.tsx   # Modal to replace
src/components/features/shared/assignment/                      # New unified modal
```

### Task
1. Update `src/pages/admin/LocationDetail.tsx` to use UnifiedAssignmentModal
2. Remove imports for old modals
3. Replace modal usage with unified modal

### Changes Required

**Replace old modal imports:**
```typescript
// REMOVE these imports:
// import { AssignDriverToLocationModal } from '@/components/features/admin/AssignDriverToLocationModal';
// import { AssignVehicleToLocationModal } from '@/components/features/admin/AssignVehicleToLocationModal';
// import { AssignBrokerToLocationModal } from '@/components/features/admin/AssignBrokerToLocationModal';

// ADD this import:
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type { AssignmentMode, LocationContext } from '@/components/features/shared/assignment';
```

**Update state management:**
```typescript
// REPLACE multiple modal states:
// const [assignDriverOpen, setAssignDriverOpen] = useState(false);
// const [assignVehicleOpen, setAssignVehicleOpen] = useState(false);
// const [assignBrokerOpen, setAssignBrokerOpen] = useState(false);

// WITH single modal state:
const [assignmentModal, setAssignmentModal] = useState<{
  open: boolean;
  mode: AssignmentMode | null;
}>({ open: false, mode: null });

// Helper functions:
const openAssignDriver = () => setAssignmentModal({ open: true, mode: 'assign-driver-to-location' });
const openAssignVehicle = () => setAssignmentModal({ open: true, mode: 'assign-vehicle-to-location' });
const openAssignBroker = () => setAssignmentModal({ open: true, mode: 'assign-broker-to-location' });
const closeModal = () => setAssignmentModal({ open: false, mode: null });
```

**Update button handlers:**
```typescript
// Change onClick handlers from:
// onClick={() => setAssignDriverOpen(true)}
// TO:
// onClick={openAssignDriver}
```

**Replace modals with single UnifiedAssignmentModal:**
```tsx
// REMOVE:
// <AssignDriverToLocationModal ... />
// <AssignVehicleToLocationModal ... />
// <AssignBrokerToLocationModal ... />

// ADD single modal at end of component:
{assignmentModal.mode && (
  <UnifiedAssignmentModal
    open={assignmentModal.open}
    onOpenChange={(open) => !open && closeModal()}
    mode={assignmentModal.mode}
    context={{
      type: 'location',
      locationId: location.id,
      locationName: location.name,
    }}
  />
)}
```

### Verification
- [ ] LocationDetail page compiles without errors
- [ ] "Assign Driver" button opens modal with correct mode
- [ ] "Assign Vehicle" button opens modal with correct mode
- [ ] "Assign Trip Source" button opens modal with correct mode
- [ ] Driver assignment works correctly
- [ ] Vehicle assignment works correctly
- [ ] Broker assignment works correctly
- [ ] Modal closes after successful assignment
- [ ] Lists refresh after assignment
- [ ] No TypeScript errors

---

## User Story 9: Migrate VehicleDetail Page

### Context
Migrate the VehicleDetail page to use UnifiedAssignmentModal for vehicle-driver assignments including transfer, unassign, extend, and end-early.

### Required Reading
```
src/pages/admin/VehicleDetail.tsx                              # Current implementation
src/components/features/admin/VehicleAssignmentsTab.tsx        # Uses multiple modals
src/components/features/admin/AssignDriverToVehicleModal.tsx   # Modal to replace
src/components/features/admin/TransferVehicleModal.tsx         # Modal to replace
src/components/features/admin/UnassignVehicleModal.tsx         # Modal to replace
src/components/features/admin/ExtendAssignmentModal.tsx        # Modal to replace
src/components/features/admin/EndAssignmentEarlyModal.tsx      # Modal to replace (if exists)
```

### Task
1. Update `src/components/features/admin/VehicleAssignmentsTab.tsx` to use UnifiedAssignmentModal
2. Replace all modal imports and usages

### Changes Required

**Replace imports:**
```typescript
// REMOVE old modal imports
// ADD:
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type { AssignmentMode, VehicleContext, AssignmentContext } from '@/components/features/shared/assignment';
```

**Update state management:**
```typescript
interface ModalState {
  open: boolean;
  mode: AssignmentMode | null;
  context: VehicleContext | AssignmentContext | null;
}

const [modal, setModal] = useState<ModalState>({ open: false, mode: null, context: null });

// Helper functions for each action:
const openAssignDriver = () => setModal({
  open: true,
  mode: 'assign-driver-to-vehicle',
  context: { type: 'vehicle', vehicleId: vehicle.id, vehicleName },
});

const openTransfer = (assignment: VehicleAssignment) => setModal({
  open: true,
  mode: 'transfer-vehicle',
  context: {
    type: 'assignment',
    assignmentId: assignment.id,
    vehicleId: vehicle.id,
    vehicleName,
    currentDriverId: assignment.driver_id,
    currentDriverName: assignment.driver?.user.full_name || 'Unknown',
  },
});

const openUnassign = (assignment: VehicleAssignment, isOnlyVehicle: boolean) => setModal({
  open: true,
  mode: 'unassign-vehicle',
  context: {
    type: 'assignment',
    assignmentId: assignment.id,
    vehicleId: vehicle.id,
    vehicleName,
    currentDriverId: assignment.driver_id,
    currentDriverName: assignment.driver?.user.full_name || 'Unknown',
    isOnlyVehicle,
    isPrimary: assignment.is_primary,
  },
});

const openExtend = (assignment: VehicleAssignment) => setModal({
  open: true,
  mode: 'extend-assignment',
  context: {
    type: 'assignment',
    assignmentId: assignment.id,
    vehicleId: vehicle.id,
    vehicleName,
    currentDriverId: assignment.driver_id,
    currentDriverName: assignment.driver?.user.full_name || 'Unknown',
    currentEndDate: assignment.ends_at || undefined,
  },
});

const openEndEarly = (assignment: VehicleAssignment) => setModal({
  open: true,
  mode: 'end-assignment-early',
  context: {
    type: 'assignment',
    assignmentId: assignment.id,
    vehicleId: vehicle.id,
    vehicleName,
    currentDriverId: assignment.driver_id,
    currentDriverName: assignment.driver?.user.full_name || 'Unknown',
  },
});

const closeModal = () => setModal({ open: false, mode: null, context: null });
```

**Replace modal components:**
```tsx
// At end of component, replace all old modals with:
{modal.mode && modal.context && (
  <UnifiedAssignmentModal
    open={modal.open}
    onOpenChange={(open) => !open && closeModal()}
    mode={modal.mode}
    context={modal.context}
  />
)}
```

### Verification
- [ ] VehicleAssignmentsTab compiles without errors
- [ ] "Assign Driver" button works correctly
- [ ] "Transfer" button opens correct modal with driver context
- [ ] "Unassign" button opens correct modal with warning info
- [ ] "Extend" button opens correct modal with current end date
- [ ] "End Early" button opens correct modal
- [ ] All operations complete successfully
- [ ] Lists refresh after operations
- [ ] No TypeScript errors

---

## User Story 10: Migrate DriverDetail and BrokerDetail Pages

### Context
Complete the migration by updating DriverDetail and BrokerDetail pages.

### Required Reading
```
src/pages/admin/DriverDetail.tsx                              # Current implementation
src/pages/admin/BrokerDetail.tsx                              # Current implementation
src/components/features/admin/AssignVehicleToDriverModal.tsx  # Modal to replace
src/components/features/admin/AssignDriversModal.tsx          # Modal to replace
```

### Task
1. Update `src/pages/admin/DriverDetail.tsx` to use UnifiedAssignmentModal
2. Update `src/pages/admin/BrokerDetail.tsx` to use UnifiedAssignmentModal

### DriverDetail Changes

**Replace imports and add modal state:**
```typescript
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type { AssignmentMode, DriverContext } from '@/components/features/shared/assignment';

// State
const [assignVehicleOpen, setAssignVehicleOpen] = useState(false);

// Context for modal
const driverContext: DriverContext = {
  type: 'driver',
  driverId: driver.id,
  driverName: driver.user.full_name,
  employmentType: driver.employment_type,
};
```

**Replace modal usage:**
```tsx
<UnifiedAssignmentModal
  open={assignVehicleOpen}
  onOpenChange={setAssignVehicleOpen}
  mode="assign-vehicle-to-driver"
  context={driverContext}
/>
```

### BrokerDetail Changes

**Replace imports and add modal state:**
```typescript
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type { BrokerContext } from '@/components/features/shared/assignment';

// State
const [assignDriversOpen, setAssignDriversOpen] = useState(false);

// Context for modal
const brokerContext: BrokerContext = {
  type: 'broker',
  broker,
};
```

**Replace modal usage:**
```tsx
<UnifiedAssignmentModal
  open={assignDriversOpen}
  onOpenChange={setAssignDriversOpen}
  mode="assign-drivers-to-broker"
  context={brokerContext}
/>
```

### Verification
- [ ] DriverDetail page compiles without errors
- [ ] "Assign Vehicle" button works correctly
- [ ] Vehicle assignment respects employment type rules
- [ ] BrokerDetail page compiles without errors
- [ ] "Assign Drivers" button works correctly
- [ ] Multi-select driver assignment works
- [ ] Eligibility badges display correctly
- [ ] All assignments complete successfully
- [ ] No TypeScript errors

---

## User Story 11: Cleanup Old Modals

### Context
Remove the old modal components now that all pages have been migrated.

### Required Reading
```
src/components/features/admin/                                  # All old modals
src/pages/admin/*.tsx                                           # Verify no imports remain
```

### Task
1. Delete old modal files
2. Verify no remaining imports
3. Run typecheck to confirm

### Files to Delete

```
src/components/features/admin/AssignDriverToVehicleModal.tsx
src/components/features/admin/AssignVehicleToDriverModal.tsx
src/components/features/admin/TransferVehicleModal.tsx
src/components/features/admin/UnassignVehicleModal.tsx
src/components/features/admin/ExtendAssignmentModal.tsx
src/components/features/admin/EndAssignmentEarlyModal.tsx (if exists)
src/components/features/admin/AssignDriverToLocationModal.tsx
src/components/features/admin/AssignVehicleToLocationModal.tsx
src/components/features/admin/AssignBrokerToLocationModal.tsx
src/components/features/admin/AssignDriversModal.tsx
```

### Verification Steps

1. Search entire codebase for imports of deleted files:
```bash
# Run in terminal:
rg "AssignDriverToVehicleModal|AssignVehicleToDriverModal|TransferVehicleModal|UnassignVehicleModal|ExtendAssignmentModal|AssignDriverToLocationModal|AssignVehicleToLocationModal|AssignBrokerToLocationModal|AssignDriversModal" src/
```

2. Run typecheck:
```bash
npm run typecheck
```

### Final Verification
- [ ] All old modal files deleted
- [ ] No import errors in any page
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Application builds successfully
- [ ] All assignment flows work in browser testing
- [ ] Code reduction: ~1,500 lines removed

---

## Summary

After completing all 11 user stories:

| Metric | Before | After |
|--------|--------|-------|
| Modal Components | 11 | 1 |
| Lines of Code | ~1,500 | ~900 |
| Patterns to Learn | 11 | 1 |
| Test Coverage | 11 separate | 1 unified |

The UnifiedAssignmentModal provides:
- **Single source of truth** for all assignment logic
- **Type-safe** mode/context combinations
- **Consistent UX** across all assignment flows
- **Easy to extend** with new modes via config
- **Reduced maintenance burden** - fix once, apply everywhere
