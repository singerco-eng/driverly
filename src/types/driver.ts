import type { Vehicle } from './vehicle';

export type EmploymentType = 'w2' | '1099';
export type ApplicationStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';
export type DriverStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export interface Driver {
  id: string;
  user_id: string;
  company_id: string;
  employment_type: EmploymentType;

  // Personal
  date_of_birth: string | null;
  ssn_last_four: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  // License
  license_number: string | null;
  license_state: string | null;
  license_expiration: string | null;
  license_front_url: string | null;
  license_back_url: string | null;

  // Emergency Contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;

  // Application
  application_status: ApplicationStatus;
  application_date: string | null;
  application_submitted_at: string | null;
  experience_notes: string | null;
  referral_source: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  can_reapply_at: string | null;
  eula_accepted_at: string | null;
  eula_version: string | null;

  // Status
  status: DriverStatus;
  status_changed_at: string | null;
  status_changed_by: string | null;
  suspension_reason: string | null;
  archived_at: string | null;
  archived_by: string | null;

  // Activity
  last_active_at: string | null;
  admin_notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface DriverWithUser extends Driver {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
}

export interface DriverWithDetails extends DriverWithUser {
  vehicles?: DriverVehicleAssignment[];
  notes?: DriverNote[];
}

export interface DriverNote {
  id: string;
  driver_id: string;
  company_id: string;
  content: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by?: string | null;
  author?: {
    full_name: string;
  };
}

export interface DriverVehicleAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  company_id: string;
  assignment_type: 'owned' | 'assigned' | 'borrowed';
  is_primary: boolean;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  assigned_by?: string | null;
  vehicle?: Vehicle;
}

export interface DriverFilters {
  search?: string;
  status?: DriverStatus | 'all';
  employmentType?: EmploymentType | 'all';
  applicationStatus?: ApplicationStatus | 'all';
}
