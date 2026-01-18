export type CredentialCategory = 'driver' | 'vehicle';
export type CredentialScope = 'global' | 'broker';
export type EmploymentType = 'both' | 'w2_only' | '1099_only';
export type RequirementLevel = 'required' | 'optional' | 'recommended';
export type SubmissionType =
  | 'document_upload'
  | 'photo'
  | 'signature'
  | 'form'
  | 'admin_verified'
  | 'date_entry';
export type ExpirationType = 'never' | 'fixed_interval' | 'driver_specified';
export type CredentialStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface CredentialType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[] | null;
  submission_type: SubmissionType;
  form_schema: Record<string, unknown> | null;
  signature_document_url: string | null;
  expiration_type: ExpirationType;
  expiration_interval_days: number | null;
  expiration_warning_days: number;
  grace_period_days: number;
  display_order: number;
  is_active: boolean;
  is_seeded: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  broker?: {
    id: string;
    name: string;
  } | null;
}

export interface CredentialTypeFormData {
  name: string;
  description: string;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[];
  submission_type: SubmissionType;
  form_schema: Record<string, unknown> | null;
  signature_document_url: string | null;
  expiration_type: ExpirationType;
  expiration_interval_days: number | null;
  expiration_warning_days: number;
  grace_period_days: number;
}

export interface CredentialTypeWithStats extends CredentialType {
  total_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  expired_count: number;
}

// For driver/vehicle credential instances
export interface DriverCredential {
  id: string;
  driver_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  signature_data: Record<string, unknown> | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
}

export interface VehicleCredential {
  id: string;
  vehicle_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  signature_data: Record<string, unknown> | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
}

// Broker (minimal for this task)
export interface Broker {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}
