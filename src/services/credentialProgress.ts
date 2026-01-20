import { supabase } from '@/integrations/supabase/client';
import type {
  CredentialProgress,
  StepProgressData,
  StepState,
} from '@/types/credentialProgress';
import { createEmptyProgressData, getStepState, updateStepState } from '@/types/credentialProgress';

export type CredentialTableType = 'driver_credentials' | 'vehicle_credentials';

/**
 * Get progress record for a credential
 */
export async function getProgress(
  credentialId: string,
  credentialTable: CredentialTableType
): Promise<CredentialProgress | null> {
  try {
    const { data, error } = await supabase
      .from('credential_progress')
      .select('*')
      .eq('credential_id', credentialId)
      .eq('credential_table', credentialTable)
      .maybeSingle();

    if (error) {
      console.warn('credential_progress query error:', error.message);
      return null;
    }

    return data as CredentialProgress | null;
  } catch (err) {
    console.warn('credential_progress fetch failed:', err);
    return null;
  }
}

/**
 * Create or update progress record
 */
export async function upsertProgress(
  credentialId: string,
  credentialTable: CredentialTableType,
  currentStepId: string | null,
  stepData: StepProgressData
): Promise<CredentialProgress> {
  const { data, error } = await supabase
    .from('credential_progress')
    .upsert(
      {
        credential_id: credentialId,
        credential_table: credentialTable,
        current_step_id: currentStepId,
        step_data: stepData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'credential_id,credential_table',
      }
    )
    .select()
    .single();

  if (error) throw error;

  return data as CredentialProgress;
}

/**
 * Update the current step being worked on
 */
export async function updateCurrentStep(
  credentialId: string,
  credentialTable: CredentialTableType,
  stepId: string
): Promise<void> {
  const { error } = await supabase
    .from('credential_progress')
    .update({
      current_step_id: stepId,
      updated_at: new Date().toISOString(),
    })
    .eq('credential_id', credentialId)
    .eq('credential_table', credentialTable);

  if (error) throw error;
}

/**
 * Update a specific step's state within the progress data
 */
export async function updateStepProgress(
  credentialId: string,
  credentialTable: CredentialTableType,
  stepId: string,
  updates: Partial<StepState>
): Promise<void> {
  // First get current progress
  const current = await getProgress(credentialId, credentialTable);
  const currentData = current?.step_data ?? createEmptyProgressData();
  
  // Merge updates into the step
  const currentStepState = getStepState(currentData, stepId);
  const updatedData = updateStepState(currentData, stepId, {
    ...currentStepState,
    ...updates,
  });

  // Upsert the updated data
  await upsertProgress(
    credentialId,
    credentialTable,
    current?.current_step_id ?? stepId,
    updatedData
  );
}

/**
 * Mark a step as completed
 */
export async function markStepComplete(
  credentialId: string,
  credentialTable: CredentialTableType,
  stepId: string
): Promise<void> {
  await updateStepProgress(credentialId, credentialTable, stepId, {
    completed: true,
    completedAt: new Date().toISOString(),
  });
}

/**
 * Clear all progress for a credential (e.g., when restarting)
 */
export async function clearProgress(
  credentialId: string,
  credentialTable: CredentialTableType
): Promise<void> {
  const { error } = await supabase
    .from('credential_progress')
    .delete()
    .eq('credential_id', credentialId)
    .eq('credential_table', credentialTable);

  if (error) throw error;
}
