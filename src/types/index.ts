/**
 * Types Barrel File
 * 
 * This file exports all canonical types from a single location.
 * Use this to prevent duplicate type definitions and ensure consistency.
 * 
 * Usage:
 *   import type { Broker, CredentialType, Driver } from '@/types';
 */

// ============================================
// APPLICATION & ONBOARDING
// ============================================
export type {
  DriverApplication,
  ApplicationStatus,
  ApplicationFilters,
  ApplicationSubmission,
} from './application';

export type {
  OnboardingItem,
  OnboardingProgress,
  OnboardingStatus,
} from './onboarding';

// ============================================
// BROKER
// ============================================
export type {
  Broker,
  BrokerFormData,
  BrokerWithStats,
  BrokerStatus,
  BrokerRate,
  BrokerRateFormData,
  DriverBrokerAssignment,
  AssignmentStatus,
  RequestedBy,
  VehicleType,
  TripSourceType,
  BrokerAssignmentMode,
} from './broker';

export {
  SOURCE_TYPE_CONFIG,
  getSourceTypeLabel,
  getBrokerAssignmentMode,
  getAssignmentModeLabel,
} from './broker';

// ============================================
// COMPANY
// ============================================
export type { Company, CompanyStatus } from './company';

// ============================================
// CREDENTIALS
// ============================================
export type {
  CredentialType,
  CredentialTypeEdits,
  CredentialTypeFormData,
  CredentialTypeWithStats,
  CreateCredentialTypeSimple,
  CredentialCategory,
  CredentialScope,
  EmploymentType,
  RequirementLevel,
  SubmissionType,
  ExpirationType,
  CredentialStatus,
  CredentialDisplayStatus,
  DriverCredential,
  VehicleCredential,
  CredentialWithDisplayStatus,
  CredentialProgressSummary,
  CredentialSubmissionHistory,
  SignatureData,
  FormSchema,
  FormField,
} from './credential';

// ============================================
// CREDENTIAL PROGRESS (Step-by-step tracking)
// ============================================
export type {
  CredentialProgress,
  StepProgressData,
  StepState,
  StepValidation,
} from './credentialProgress';

export {
  createEmptyStepState,
  createEmptyProgressData,
  getStepState,
  updateStepState,
  markStepCompleted,
  areAllRequiredStepsCompleted,
  createValidStepValidation,
} from './credentialProgress';

// ============================================
// CREDENTIAL REVIEW
// ============================================
export type {
  ReviewStatus,
  CredentialForReview,
  ReviewQueueFilters,
  ReviewQueueStats,
  ApproveCredentialData,
  RejectCredentialData,
  VerifyCredentialData,
  UnverifyCredentialData,
  ReviewHistoryItem,
} from './credentialReview';

// ============================================
// INSTRUCTION BUILDER
// ============================================
export type {
  CredentialTypeInstructions,
  InstructionSettings,
  InstructionStep,
  StepType,
  StepCondition,
  StepCompletion,
  ContentBlock,
  BlockType,
  BlockContent,
  HeadingBlockContent,
  ParagraphBlockContent,
  RichTextBlockContent,
  ImageBlockContent,
  VideoBlockContent,
  ExternalLinkBlockContent,
  AlertBlockContent,
  ChecklistBlockContent,
  ChecklistItem,
  ButtonBlockContent,
  DividerBlockContent,
  FormFieldBlockContent,
  FileUploadBlockContent,
  SignaturePadBlockContent,
  QuizQuestionBlockContent,
  QuizOption,
  InstructionTemplate,
} from './instructionBuilder';

export {
  createEmptyInstructions,
  createStep,
  createBlock,
} from './instructionBuilder';

// ============================================
// DRIVER
// ============================================
export type {
  Driver,
  DriverStatus,
  DriverWithUser,
  DriverFormData,
} from './driver';

// ============================================
// DRIVER VEHICLE
// ============================================
export type {
  DriverVehicle,
  DriverVehicleAssignment,
  AssignmentType,
} from './driverVehicle';

// ============================================
// INVITATION
// ============================================
export type {
  Invitation,
  InvitationStatus,
  InvitationFormData,
} from './invitation';

// ============================================
// PROFILE
// ============================================
export type {
  Profile,
  ProfileFormData,
  ProfileNotificationSettings,
} from './profile';

// ============================================
// THEME
// ============================================
export type { ThemeTokens, ThemeSettings } from './theme';

// ============================================
// VEHICLE
// ============================================
export type {
  Vehicle,
  VehicleStatus,
  VehicleOwnership,
  VehicleFormData,
} from './vehicle';

// ============================================
// VEHICLE ASSIGNMENT
// ============================================
export type {
  VehicleAssignment,
  VehicleAssignmentFormData,
} from './vehicleAssignment';
