import type { Vehicle } from '@/types/vehicle';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

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

export type CredentialDisplayStatus =
  | CredentialStatus
  | 'expiring'
  | 'awaiting';

export interface CredentialType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  // NEW: Rich instruction configuration (v2+)
  instruction_config: CredentialTypeInstructions | null;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  // NEW: Explicit flag for admin-only credentials
  requires_driver_action: boolean;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[] | null;
  // DEPRECATED: Legacy field for backwards compatibility
  submission_type?: SubmissionType | null;
  form_schema: FormSchema | null;
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

export interface CredentialTypeEdits {
  requirement?: RequirementLevel;
  employment_type?: EmploymentType;
  grace_period_days?: number;
  expiration_type?: ExpirationType;
  expiration_interval_days?: number | null;
  expiration_warning_days?: number;
  is_active?: boolean;
  requires_driver_action?: boolean;
}

export interface CredentialTypeFormData {
  name: string;
  description: string;
  // NEW: Instruction configuration
  instruction_config?: CredentialTypeInstructions | null;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  requires_driver_action: boolean;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[];
  submission_type?: SubmissionType | null;
  form_schema: FormSchema | null;
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

export interface CreateCredentialTypeSimple {
  name: string;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  template_id: string | null;
}

export interface SignatureData {
  type: 'typed' | 'drawn';
  value: string;
  timestamp: string;
  ip_address?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// For driver/vehicle credential instances
export interface DriverCredential {
  id: string;
  driver_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  document_urls: string[] | null;
  signature_data: SignatureData | null;
  form_data: Record<string, any> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submission_version: number;
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
  document_urls: string[] | null;
  signature_data: SignatureData | null;
  form_data: Record<string, any> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  submission_version: number;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
  vehicle?: Vehicle;
}

// Broker (minimal for this task)
export interface Broker {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

export interface CredentialSubmissionHistory {
  id: string;
  credential_id: string;
  credential_table: 'driver_credentials' | 'vehicle_credentials';
  company_id: string;
  submission_data: Record<string, any>;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  submitted_at: string;
  created_at: string;
}

export interface CredentialWithDisplayStatus {
  credential: DriverCredential | VehicleCredential;
  credentialType: CredentialType;
  displayStatus: CredentialDisplayStatus;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  canSubmit: boolean;
}

export interface CredentialProgress {
  total: number;
  complete: number;
  pending: number;
  actionNeeded: number;
  percentage: number;
}
