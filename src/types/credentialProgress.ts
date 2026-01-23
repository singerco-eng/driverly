/**
 * Credential Progress Types
 * Tracks step-by-step progress through multi-step credentials
 */

// ============================================
// DATABASE RECORD
// ============================================

export interface CredentialProgress {
  id: string;
  credential_id: string;
  credential_table: 'driver_credentials' | 'vehicle_credentials';
  current_step_id: string | null;
  step_data: StepProgressData;
  created_at: string;
  updated_at: string;
}

// ============================================
// STEP DATA STRUCTURE
// ============================================

export interface StepProgressData {
  steps: Record<string, StepState>;
}

export interface StepState {
  /** Whether this step has been completed */
  completed: boolean;
  
  /** When the step was completed */
  completedAt: string | null;
  
  /** Form field values keyed by field key */
  formData: Record<string, unknown>;
  
  /** Storage paths for uploaded files */
  uploadedFiles: string[];
  
  /** Signature data if step includes signature block */
  signatureData: SignatureData | null;
  
  /** Checklist item states keyed by item ID */
  checklistStates: Record<string, boolean>;
  
  /** IDs of external link blocks that have been visited */
  externalLinksVisited: string[];
  
  /** Quiz answers keyed by question block ID */
  quizAnswers: Record<string, string>;
  
  /** Whether video blocks have been watched (keyed by block ID) */
  videosWatched: Record<string, boolean>;
}

// Re-export SignatureData from credential.ts to avoid duplication
// The canonical definition is in credential.ts (includes optional ip_address field)
import type { SignatureData } from '@/types/credential';
export type { SignatureData };

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createEmptyStepState(): StepState {
  return {
    completed: false,
    completedAt: null,
    formData: {},
    uploadedFiles: [],
    signatureData: null,
    checklistStates: {},
    externalLinksVisited: [],
    quizAnswers: {},
    videosWatched: {},
  };
}

export function createEmptyProgressData(): StepProgressData {
  return { steps: {} };
}

/**
 * Get or create step state from progress data
 */
export function getStepState(
  progressData: StepProgressData,
  stepId: string
): StepState {
  return progressData.steps[stepId] ?? createEmptyStepState();
}

/**
 * Update a specific step's state immutably
 */
export function updateStepState(
  progressData: StepProgressData,
  stepId: string,
  updates: Partial<StepState>
): StepProgressData {
  const currentState = getStepState(progressData, stepId);
  return {
    steps: {
      ...progressData.steps,
      [stepId]: { ...currentState, ...updates },
    },
  };
}

/**
 * Mark a step as completed
 */
export function markStepCompleted(
  progressData: StepProgressData,
  stepId: string
): StepProgressData {
  return updateStepState(progressData, stepId, {
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Check if all required steps are completed
 */
export function areAllRequiredStepsCompleted(
  progressData: StepProgressData,
  requiredStepIds: string[]
): boolean {
  return requiredStepIds.every(
    (stepId) => progressData.steps[stepId]?.completed === true
  );
}

// ============================================
// VALIDATION HELPERS
// ============================================

export interface StepValidation {
  isValid: boolean;
  missingFields: string[];
  missingUploads: boolean;
  missingSignature: boolean;
  incompleteChecklist: boolean;
  unvisitedLinks: string[];
  unwatchedVideos: string[];
  incorrectQuizAnswers: string[];
}

export function createValidStepValidation(): StepValidation {
  return {
    isValid: true,
    missingFields: [],
    missingUploads: false,
    missingSignature: false,
    incompleteChecklist: false,
    unvisitedLinks: [],
    unwatchedVideos: [],
    incorrectQuizAnswers: [],
  };
}
