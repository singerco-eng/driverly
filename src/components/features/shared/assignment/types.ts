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
