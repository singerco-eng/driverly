/**
 * Zod Validation Schemas for Driverly Database
 * 
 * These schemas match the PostgreSQL database schema and can be used for:
 * - Form validation
 * - API response validation
 * - Type generation
 * 
 * @see docs/02-DATABASE-SCHEMA.md for full database documentation
 * @generated 2026-01-20
 */

import { z } from 'zod';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const userRoleSchema = z.enum(['super_admin', 'admin', 'coordinator', 'driver']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const companyStatusSchema = z.enum(['active', 'inactive', 'suspended']);
export type CompanyStatus = z.infer<typeof companyStatusSchema>;

export const employmentTypeSchema = z.enum(['w2', '1099']);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const applicationStatusSchema = z.enum(['pending', 'under_review', 'approved', 'rejected', 'withdrawn']);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const driverStatusSchema = z.enum(['active', 'inactive', 'suspended', 'terminated']);
export type DriverStatus = z.infer<typeof driverStatusSchema>;

export const vehicleTypeSchema = z.enum(['sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van']);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

export const vehicleStatusSchema = z.enum(['active', 'inactive', 'maintenance', 'retired']);
export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

export const vehicleOwnershipSchema = z.enum(['company', 'driver', 'leased']);
export type VehicleOwnership = z.infer<typeof vehicleOwnershipSchema>;

export const credentialCategorySchema = z.enum(['driver', 'vehicle']);
export type CredentialCategory = z.infer<typeof credentialCategorySchema>;

export const credentialScopeSchema = z.enum(['global', 'broker']);
export type CredentialScope = z.infer<typeof credentialScopeSchema>;

export const credentialStatusSchema = z.enum(['not_submitted', 'pending_review', 'approved', 'rejected', 'expired']);
export type CredentialStatus = z.infer<typeof credentialStatusSchema>;

export const credentialRequirementSchema = z.enum(['required', 'optional', 'recommended']);
export type CredentialRequirement = z.infer<typeof credentialRequirementSchema>;

export const expirationTypeSchema = z.enum(['never', 'fixed_interval', 'driver_specified']);
export type ExpirationType = z.infer<typeof expirationTypeSchema>;

export const submissionTypeSchema = z.enum([
  'document_upload',
  'photo',
  'signature',
  'form',
  'admin_verified',
  'date_entry',
]);
export type SubmissionType = z.infer<typeof submissionTypeSchema>;

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked']);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export const brokerSourceTypeSchema = z.enum(['state_broker', 'facility', 'insurance', 'private', 'corporate']);
export type BrokerSourceType = z.infer<typeof brokerSourceTypeSchema>;

export const brokerAssignmentStatusSchema = z.enum(['pending', 'assigned', 'removed']);
export type BrokerAssignmentStatus = z.infer<typeof brokerAssignmentStatusSchema>;

export const vehicleAssignmentTypeSchema = z.enum(['owned', 'assigned', 'shared']);
export type VehicleAssignmentType = z.infer<typeof vehicleAssignmentTypeSchema>;

export const paymentMethodSchema = z.enum(['direct_deposit', 'check', 'paycard']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const accountTypeSchema = z.enum(['checking', 'savings']);
export type AccountType = z.infer<typeof accountTypeSchema>;

// =============================================================================
// CORE TABLE SCHEMAS
// =============================================================================

export const companySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  address_line1: z.string().max(255).nullish(),
  address_line2: z.string().max(255).nullish(),
  city: z.string().max(100).nullish(),
  state: z.string().max(50).nullish(),
  zip: z.string().max(20).nullish(),
  logo_url: z.string().url().nullish(),
  primary_color: z.string().max(7).default('#3B82F6'),
  status: companyStatusSchema.default('active'),
  ein: z.string().max(20).nullish(),
  timezone: z.string().max(50).default('America/New_York'),
  deactivation_reason: z.string().nullish(),
  deactivated_at: z.string().datetime().nullish(),
  deactivated_by: z.string().uuid().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Company = z.infer<typeof companySchema>;

export const companyInsertSchema = companySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
  primary_color: true,
  timezone: true,
});
export type CompanyInsert = z.infer<typeof companyInsertSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid().nullish(),
  email: z.string().email().max(255),
  full_name: z.string().min(1).max(255),
  phone: z.string().max(50).nullish(),
  role: userRoleSchema,
  avatar_url: z.string().url().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const driverSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  employment_type: employmentTypeSchema,
  date_of_birth: z.string().date().nullish(),
  ssn_last_four: z.string().length(4).nullish(),
  address_line1: z.string().max(255).nullish(),
  address_line2: z.string().max(255).nullish(),
  city: z.string().max(100).nullish(),
  state: z.string().max(50).nullish(),
  zip: z.string().max(20).nullish(),
  license_number: z.string().max(50).nullish(),
  license_state: z.string().length(2).nullish(),
  license_expiration: z.string().date().nullish(),
  emergency_contact_name: z.string().max(255).nullish(),
  emergency_contact_phone: z.string().max(50).nullish(),
  emergency_contact_relation: z.string().max(100).nullish(),
  application_status: applicationStatusSchema.nullish(),
  application_date: z.string().datetime().nullish(),
  approved_at: z.string().datetime().nullish(),
  approved_by: z.string().uuid().nullish(),
  rejection_reason: z.string().nullish(),
  status: driverStatusSchema.default('inactive'),
  status_reason: z.string().nullish(),
  status_changed_at: z.string().datetime().nullish(),
  onboarding_completed_at: z.string().datetime().nullish(),
  welcome_modal_dismissed: z.boolean().default(false),
  has_payment_info: z.boolean().default(false),
  has_availability: z.boolean().default(false),
  admin_notes: z.string().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Driver = z.infer<typeof driverSchema>;

export const driverInsertSchema = driverSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  status: true,
  welcome_modal_dismissed: true,
  has_payment_info: true,
  has_availability: true,
});
export type DriverInsert = z.infer<typeof driverInsertSchema>;

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100),
  color: z.string().min(1).max(50),
  vin: z.string().max(17).nullish(),
  license_plate: z.string().min(1).max(20),
  license_state: z.string().length(2).nullish(),
  vehicle_type: vehicleTypeSchema,
  wheelchair_capacity: z.number().int().default(0),
  stretcher_capacity: z.number().int().default(0),
  ambulatory_capacity: z.number().int().default(4),
  ownership: vehicleOwnershipSchema.default('company'),
  owner_driver_id: z.string().uuid().nullish(),
  status: vehicleStatusSchema.default('active'),
  last_inspection_date: z.string().date().nullish(),
  next_inspection_due: z.string().date().nullish(),
  mileage: z.number().int().nullish(),
  insurance_policy_number: z.string().max(100).nullish(),
  insurance_expiration: z.string().date().nullish(),
  admin_notes: z.string().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Vehicle = z.infer<typeof vehicleSchema>;

export const vehicleInsertSchema = vehicleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  wheelchair_capacity: true,
  stretcher_capacity: true,
  ambulatory_capacity: true,
  ownership: true,
  status: true,
});
export type VehicleInsert = z.infer<typeof vehicleInsertSchema>;

// =============================================================================
// BROKER SCHEMAS
// =============================================================================

export const brokerSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().max(50).nullish(),
  source_type: brokerSourceTypeSchema.default('state_broker'),
  logo_url: z.string().url().nullish(),
  contact_name: z.string().max(255).nullish(),
  contact_email: z.string().email().nullish(),
  contact_phone: z.string().max(50).nullish(),
  address_line1: z.string().nullish(),
  address_line2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zip_code: z.string().nullish(),
  website: z.string().url().nullish(),
  contract_number: z.string().nullish(),
  notes: z.string().nullish(),
  service_states: z.array(z.string()).default([]),
  accepted_vehicle_types: z.array(vehicleTypeSchema).default(['sedan', 'wheelchair_van', 'stretcher_van', 'suv', 'minivan']),
  accepted_employment_types: z.array(employmentTypeSchema).default(['w2', '1099']),
  allow_driver_requests: z.boolean().default(false),
  allow_driver_auto_signup: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Broker = z.infer<typeof brokerSchema>;

export const brokerInsertSchema = brokerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  source_type: true,
  service_states: true,
  accepted_vehicle_types: true,
  accepted_employment_types: true,
  allow_driver_requests: true,
  allow_driver_auto_signup: true,
  status: true,
  is_active: true,
});
export type BrokerInsert = z.infer<typeof brokerInsertSchema>;

export const brokerRateSchema = z.object({
  id: z.string().uuid(),
  broker_id: z.string().uuid(),
  company_id: z.string().uuid(),
  vehicle_type: vehicleTypeSchema,
  base_rate: z.number(),
  per_mile_rate: z.number(),
  effective_from: z.string().date(),
  effective_to: z.string().date().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullish(),
  created_by: z.string().uuid().nullish(),
});
export type BrokerRate = z.infer<typeof brokerRateSchema>;

// =============================================================================
// CREDENTIAL SCHEMAS
// =============================================================================

/** Instruction config JSONB structure */
export const instructionBlockSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: z.enum(['paragraph', 'heading', 'list', 'link', 'image', 'video', 'file_upload', 'photo_upload', 'signature', 'date_input', 'text_input', 'checkbox', 'quiz_question']),
  content: z.record(z.unknown()),
});

export const instructionStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  type: z.enum(['information', 'action', 'review']),
  required: z.boolean(),
  blocks: z.array(instructionBlockSchema),
  conditions: z.array(z.unknown()).default([]),
  completion: z.object({
    type: z.enum(['auto', 'manual', 'all_blocks']),
    autoCompleteOnView: z.boolean().optional(),
  }),
});

export const instructionConfigSchema = z.object({
  version: z.number().default(2),
  settings: z.object({
    showProgressBar: z.boolean().default(false),
    allowStepSkip: z.boolean().default(false),
    completionBehavior: z.enum(['required_only', 'all_steps']).default('required_only'),
    externalSubmissionAllowed: z.boolean().default(false),
  }),
  steps: z.array(instructionStepSchema).default([]),
});
export type InstructionConfig = z.infer<typeof instructionConfigSchema>;

export const credentialTypeSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullish(),
  instruction_config: instructionConfigSchema.nullish(),
  category: credentialCategorySchema,
  scope: credentialScopeSchema,
  broker_id: z.string().uuid().nullish(),
  requires_driver_action: z.boolean().default(true),
  employment_type: z.enum(['both', 'w2_only', '1099_only']).default('both'),
  requirement: credentialRequirementSchema.default('required'),
  vehicle_types: z.array(vehicleTypeSchema).nullish(),
  submission_type: submissionTypeSchema.nullish(),
  form_schema: z.record(z.unknown()).nullish(),
  signature_document_url: z.string().url().nullish(),
  expiration_type: expirationTypeSchema.default('never'),
  expiration_interval_days: z.number().int().positive().nullish(),
  expiration_warning_days: z.number().int().positive().default(30),
  grace_period_days: z.number().int().positive().default(30),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_seeded: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().nullish(),
});
export type CredentialType = z.infer<typeof credentialTypeSchema>;

export const credentialTypeInsertSchema = credentialTypeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  requires_driver_action: true,
  employment_type: true,
  requirement: true,
  expiration_type: true,
  expiration_warning_days: true,
  grace_period_days: true,
  display_order: true,
  is_active: true,
  is_seeded: true,
});
export type CredentialTypeInsert = z.infer<typeof credentialTypeInsertSchema>;

/** Signature data stored in credentials */
export const signatureDataSchema = z.object({
  type: z.enum(['typed', 'drawn']),
  value: z.string(),
  timestamp: z.string().datetime(),
  ip_address: z.string().ip().optional(),
});
export type SignatureData = z.infer<typeof signatureDataSchema>;

export const driverCredentialSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  credential_type_id: z.string().uuid(),
  company_id: z.string().uuid(),
  status: credentialStatusSchema.default('not_submitted'),
  document_url: z.string().url().nullish(),
  document_urls: z.array(z.string().url()).nullish(),
  signature_data: signatureDataSchema.nullish(),
  form_data: z.record(z.unknown()).nullish(),
  entered_date: z.string().date().nullish(),
  driver_expiration_date: z.string().date().nullish(),
  notes: z.string().nullish(),
  submission_version: z.number().int().default(1),
  expires_at: z.string().datetime().nullish(),
  grace_period_ends: z.string().datetime().nullish(),
  reviewed_at: z.string().datetime().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  review_notes: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  submitted_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DriverCredential = z.infer<typeof driverCredentialSchema>;

export const vehicleCredentialSchema = z.object({
  id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  credential_type_id: z.string().uuid(),
  company_id: z.string().uuid(),
  status: credentialStatusSchema.default('not_submitted'),
  document_url: z.string().url().nullish(),
  document_urls: z.array(z.string().url()).nullish(),
  signature_data: signatureDataSchema.nullish(),
  form_data: z.record(z.unknown()).nullish(),
  entered_date: z.string().date().nullish(),
  driver_expiration_date: z.string().date().nullish(),
  notes: z.string().nullish(),
  submission_version: z.number().int().default(1),
  expires_at: z.string().datetime().nullish(),
  grace_period_ends: z.string().datetime().nullish(),
  reviewed_at: z.string().datetime().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  review_notes: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  submitted_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type VehicleCredential = z.infer<typeof vehicleCredentialSchema>;

export const credentialTableSchema = z.enum(['driver_credentials', 'vehicle_credentials']);
export type CredentialTable = z.infer<typeof credentialTableSchema>;

export const credentialProgressSchema = z.object({
  id: z.string().uuid(),
  credential_id: z.string().uuid(),
  credential_table: credentialTableSchema,
  current_step_id: z.string().nullish(),
  step_data: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CredentialProgress = z.infer<typeof credentialProgressSchema>;

export const credentialSubmissionHistorySchema = z.object({
  id: z.string().uuid(),
  credential_id: z.string().uuid(),
  credential_table: credentialTableSchema,
  company_id: z.string().uuid(),
  submission_data: z.record(z.unknown()),
  status: z.enum(['submitted', 'pending_review', 'approved', 'rejected', 'expired']),
  reviewed_at: z.string().datetime().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  review_notes: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  expires_at: z.string().datetime().nullish(),
  submitted_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type CredentialSubmissionHistory = z.infer<typeof credentialSubmissionHistorySchema>;

// =============================================================================
// ASSIGNMENT SCHEMAS
// =============================================================================

export const driverVehicleAssignmentSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  company_id: z.string().uuid(),
  assignment_type: vehicleAssignmentTypeSchema.default('assigned'),
  is_primary: z.boolean().default(false),
  assigned_at: z.string().datetime().nullish(),
  unassigned_at: z.string().datetime().nullish(),
  ended_at: z.string().datetime().nullish(),
  starts_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DriverVehicleAssignment = z.infer<typeof driverVehicleAssignmentSchema>;

export const driverBrokerAssignmentSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  broker_id: z.string().uuid(),
  company_id: z.string().uuid(),
  status: brokerAssignmentStatusSchema.default('pending'),
  requested_by: z.enum(['admin', 'driver']),
  requested_at: z.string().datetime(),
  approved_by: z.string().uuid().nullish(),
  approved_at: z.string().datetime().nullish(),
  removed_by: z.string().uuid().nullish(),
  removed_at: z.string().datetime().nullish(),
  removal_reason: z.string().nullish(),
  created_at: z.string().datetime(),
});
export type DriverBrokerAssignment = z.infer<typeof driverBrokerAssignmentSchema>;

// =============================================================================
// ONBOARDING SCHEMAS
// =============================================================================

export const driverOnboardingProgressSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  company_id: z.string().uuid(),
  item_key: z.string(),
  completed: z.boolean().default(false),
  completed_at: z.string().datetime().nullish(),
  skipped: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DriverOnboardingProgress = z.infer<typeof driverOnboardingProgressSchema>;

export const driverAvailabilitySchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  company_id: z.string().uuid(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(), // TIME format
  end_time: z.string(),   // TIME format
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DriverAvailability = z.infer<typeof driverAvailabilitySchema>;

export const driverPaymentInfoSchema = z.object({
  id: z.string().uuid(),
  driver_id: z.string().uuid(),
  company_id: z.string().uuid(),
  payment_method: paymentMethodSchema,
  bank_name: z.string().nullish(),
  account_type: accountTypeSchema.nullish(),
  routing_number_last4: z.string().length(4).nullish(),
  account_number_last4: z.string().length(4).nullish(),
  check_address_line1: z.string().nullish(),
  check_address_line2: z.string().nullish(),
  check_city: z.string().nullish(),
  check_state: z.string().nullish(),
  check_zip: z.string().nullish(),
  is_verified: z.boolean().default(false),
  verified_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DriverPaymentInfo = z.infer<typeof driverPaymentInfoSchema>;

// =============================================================================
// THEME SCHEMAS
// =============================================================================

const themeColorSchema = z.string(); // HSL values like "218 95% 58%"

export const platformThemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().default('default'),
  primary: themeColorSchema,
  primary_foreground: themeColorSchema,
  secondary: themeColorSchema,
  secondary_foreground: themeColorSchema,
  accent: themeColorSchema,
  accent_foreground: themeColorSchema,
  background: themeColorSchema,
  foreground: themeColorSchema,
  card: themeColorSchema,
  card_foreground: themeColorSchema,
  muted: themeColorSchema,
  muted_foreground: themeColorSchema,
  border: themeColorSchema,
  ring: themeColorSchema,
  success: themeColorSchema,
  success_foreground: themeColorSchema,
  warning: themeColorSchema,
  warning_foreground: themeColorSchema,
  destructive: themeColorSchema,
  destructive_foreground: themeColorSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PlatformTheme = z.infer<typeof platformThemeSchema>;

export const companyThemeSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  // All theme colors are optional overrides
  primary: themeColorSchema.nullish(),
  primary_foreground: themeColorSchema.nullish(),
  secondary: themeColorSchema.nullish(),
  secondary_foreground: themeColorSchema.nullish(),
  accent: themeColorSchema.nullish(),
  accent_foreground: themeColorSchema.nullish(),
  background: themeColorSchema.nullish(),
  foreground: themeColorSchema.nullish(),
  card: themeColorSchema.nullish(),
  card_foreground: themeColorSchema.nullish(),
  muted: themeColorSchema.nullish(),
  muted_foreground: themeColorSchema.nullish(),
  border: themeColorSchema.nullish(),
  ring: themeColorSchema.nullish(),
  success: themeColorSchema.nullish(),
  success_foreground: themeColorSchema.nullish(),
  warning: themeColorSchema.nullish(),
  warning_foreground: themeColorSchema.nullish(),
  destructive: themeColorSchema.nullish(),
  destructive_foreground: themeColorSchema.nullish(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CompanyTheme = z.infer<typeof companyThemeSchema>;

// =============================================================================
// INVITATION SCHEMA
// =============================================================================

export const invitationSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid().nullish(),
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().nullish(),
  role: z.enum(['admin', 'coordinator', 'driver']),
  token: z.string(),
  status: invitationStatusSchema.default('pending'),
  invited_by: z.string().uuid().nullish(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullish(),
  created_at: z.string().datetime(),
});
export type Invitation = z.infer<typeof invitationSchema>;

// =============================================================================
// RPC RESPONSE SCHEMAS
// =============================================================================

/** Response from get_driver_required_credentials RPC */
export const driverRequiredCredentialSchema = z.object({
  credential_type_id: z.string().uuid(),
  credential_type_name: z.string(),
  category: credentialCategorySchema,
  scope: credentialScopeSchema,
  broker_id: z.string().uuid().nullish(),
  broker_name: z.string().nullish(),
  submission_type: submissionTypeSchema.nullish(),
  requires_driver_action: z.boolean(),
  requirement: credentialRequirementSchema,
  existing_credential_id: z.string().uuid().nullish(),
  current_status: credentialStatusSchema.nullish(),
});
export type DriverRequiredCredential = z.infer<typeof driverRequiredCredentialSchema>;

/** Response from get_vehicle_required_credentials RPC */
export const vehicleRequiredCredentialSchema = z.object({
  credential_type_id: z.string().uuid(),
  credential_type_name: z.string(),
  scope: credentialScopeSchema,
  broker_id: z.string().uuid().nullish(),
  broker_name: z.string().nullish(),
  submission_type: submissionTypeSchema.nullish(),
  requires_driver_action: z.boolean(),
  requirement: credentialRequirementSchema,
  existing_credential_id: z.string().uuid().nullish(),
  current_status: credentialStatusSchema.nullish(),
});
export type VehicleRequiredCredential = z.infer<typeof vehicleRequiredCredentialSchema>;

/** Response from can_driver_join_broker RPC */
export const canDriverJoinBrokerSchema = z.object({
  can_join: z.boolean(),
  join_mode: z.enum(['auto_signup', 'request', 'admin_only', 'not_eligible']),
  reason: z.string(),
});
export type CanDriverJoinBroker = z.infer<typeof canDriverJoinBrokerSchema>;

// =============================================================================
// AGGREGATE SCHEMAS (for common UI patterns)
// =============================================================================

/** Summary stats for credential progress (UI display) */
export const credentialProgressSummarySchema = z.object({
  total: z.number().int(),
  complete: z.number().int(),
  pending: z.number().int(),
  actionNeeded: z.number().int(),
  percentage: z.number(),
});
export type CredentialProgressSummary = z.infer<typeof credentialProgressSummarySchema>;

/** Driver with expanded relations */
export const driverWithUserSchema = driverSchema.extend({
  user: userSchema.optional(),
  vehicle_count: z.number().int().optional(),
  credential_progress: credentialProgressSummarySchema.optional(),
});
export type DriverWithUser = z.infer<typeof driverWithUserSchema>;

/** Vehicle with credentials */
export const vehicleWithCredentialsSchema = vehicleSchema.extend({
  credentials: z.array(vehicleCredentialSchema).optional(),
  credential_progress: credentialProgressSummarySchema.optional(),
});
export type VehicleWithCredentials = z.infer<typeof vehicleWithCredentialsSchema>;

// =============================================================================
// FORM VALIDATION SCHEMAS
// =============================================================================

/** Driver profile form (subset for editing) */
export const driverProfileFormSchema = z.object({
  date_of_birth: z.string().date().optional(),
  address_line1: z.string().min(1, 'Address is required').max(255),
  address_line2: z.string().max(255).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zip: z.string().min(5, 'ZIP code must be at least 5 characters').max(20),
  license_number: z.string().min(1, 'License number is required').max(50),
  license_state: z.string().length(2, 'State must be 2 characters'),
  license_expiration: z.string().date(),
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required').max(255),
  emergency_contact_phone: z.string().min(10, 'Phone must be at least 10 digits').max(50),
  emergency_contact_relation: z.string().max(100).optional(),
});
export type DriverProfileForm = z.infer<typeof driverProfileFormSchema>;

/** Vehicle form */
export const vehicleFormSchema = z.object({
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  color: z.string().min(1, 'Color is required').max(50),
  vin: z.string().length(17, 'VIN must be 17 characters').optional().or(z.literal('')),
  license_plate: z.string().min(1, 'License plate is required').max(20),
  license_state: z.string().length(2).optional(),
  vehicle_type: vehicleTypeSchema,
  wheelchair_capacity: z.number().int().min(0).optional(),
  stretcher_capacity: z.number().int().min(0).optional(),
  ambulatory_capacity: z.number().int().min(0).optional(),
  ownership: vehicleOwnershipSchema.optional(),
});
export type VehicleForm = z.infer<typeof vehicleFormSchema>;

/** Broker form */
export const brokerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional(),
  source_type: brokerSourceTypeSchema,
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal('')),
  service_states: z.array(z.string()).optional(),
  accepted_vehicle_types: z.array(vehicleTypeSchema).optional(),
  accepted_employment_types: z.array(employmentTypeSchema).optional(),
  allow_driver_requests: z.boolean().optional(),
  allow_driver_auto_signup: z.boolean().optional(),
});
export type BrokerForm = z.infer<typeof brokerFormSchema>;
