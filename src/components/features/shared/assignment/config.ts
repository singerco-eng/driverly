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
