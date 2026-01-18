export type AssignmentType = 'owned' | 'assigned' | 'borrowed';
export type AssignmentAction =
  | 'assigned'
  | 'unassigned'
  | 'transferred'
  | 'primary_changed'
  | 'extended'
  | 'ended_early';

export interface VehicleAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  company_id: string;
  assignment_type: AssignmentType;
  is_primary: boolean;
  starts_at: string;
  ends_at: string | null;
  assigned_at: string;
  assigned_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
  end_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  driver?: {
    id: string;
    employment_type: string;
    status: string;
    user: {
      full_name: string;
      email: string;
    };
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    vehicle_type: string;
    status: string;
  };
}

export interface AssignmentHistory {
  id: string;
  vehicle_id: string;
  driver_id: string;
  company_id: string;
  assignment_type: string;
  is_primary: boolean;
  action: AssignmentAction;
  started_at: string | null;
  ended_at: string | null;
  performed_by: string | null;
  reason: string | null;
  notes: string | null;
  assignment_id: string | null;
  transferred_to_driver_id: string | null;
  created_at: string;
  // Joined
  driver?: {
    id: string;
    user: {
      full_name: string;
    };
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
  };
  performed_by_user?: {
    full_name: string;
  };
  transferred_to_driver?: {
    id: string;
    user: {
      full_name: string;
    };
  };
}

export interface AssignVehicleFormData {
  vehicle_id: string;
  driver_id: string;
  assignment_type: AssignmentType;
  is_primary: boolean;
  starts_at?: string;
  ends_at?: string; // Required for 'borrowed'
}

export interface TransferVehicleFormData {
  to_driver_id: string;
  reason: string;
  notes?: string;
  is_primary: boolean;
}

export interface UnassignVehicleFormData {
  reason: string;
  notes?: string;
}

export interface ExtendAssignmentFormData {
  new_ends_at: string;
  reason?: string;
}
