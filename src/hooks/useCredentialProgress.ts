import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as progressService from '@/services/credentialProgress';
import type { CredentialTableType } from '@/services/credentialProgress';
import type { StepProgressData, StepState } from '@/types/credentialProgress';
import { createEmptyProgressData } from '@/types/credentialProgress';

/**
 * Fetch progress for a credential
 */
export function useCredentialProgress(
  credentialId: string | undefined,
  credentialTable: CredentialTableType
) {
  return useQuery({
    queryKey: ['credential-progress', credentialId, credentialTable],
    queryFn: () => progressService.getProgress(credentialId!, credentialTable),
    enabled: !!credentialId,
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Upsert (create or update) progress
 */
export function useUpsertProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
      currentStepId,
      stepData,
    }: {
      credentialId: string;
      credentialTable: CredentialTableType;
      currentStepId: string | null;
      stepData: StepProgressData;
    }) =>
      progressService.upsertProgress(
        credentialId,
        credentialTable,
        currentStepId,
        stepData
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['credential-progress', variables.credentialId, variables.credentialTable],
      });
    },
  });
}

// Alias for backwards compatibility
export { useUpsertProgress as useUpsertCredentialProgress };

/**
 * Update current step
 */
export function useUpdateCurrentStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
      stepId,
    }: {
      credentialId: string;
      credentialTable: CredentialTableType;
      stepId: string;
    }) =>
      progressService.updateCurrentStep(credentialId, credentialTable, stepId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['credential-progress', variables.credentialId, variables.credentialTable],
      });
    },
  });
}

/**
 * Update a step's state
 */
export function useUpdateStepState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
      stepId,
      updates,
    }: {
      credentialId: string;
      credentialTable: CredentialTableType;
      stepId: string;
      updates: Partial<StepState>;
    }) =>
      progressService.updateStepProgress(
        credentialId,
        credentialTable,
        stepId,
        updates
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['credential-progress', variables.credentialId, variables.credentialTable],
      });
    },
  });
}

/**
 * Mark a step as complete
 */
export function useMarkStepComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
      stepId,
    }: {
      credentialId: string;
      credentialTable: CredentialTableType;
      stepId: string;
    }) =>
      progressService.markStepComplete(credentialId, credentialTable, stepId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['credential-progress', variables.credentialId, variables.credentialTable],
      });
    },
  });
}

/**
 * Clear all progress (for restart)
 */
export function useClearProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
    }: {
      credentialId: string;
      credentialTable: CredentialTableType;
    }) => progressService.clearProgress(credentialId, credentialTable),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['credential-progress', variables.credentialId, variables.credentialTable],
      });
    },
  });
}

/**
 * Hook to manage local step state with debounced saving
 * Useful for frequent updates like form field changes
 */
export function useStepStateManager(
  credentialId: string | undefined,
  credentialTable: CredentialTableType,
  stepId: string | undefined
) {
  const { data: progress, isLoading } = useCredentialProgress(credentialId, credentialTable);
  const updateState = useUpdateStepState();

  const stepData = progress?.step_data ?? createEmptyProgressData();
  const currentStepState = stepId ? stepData.steps[stepId] : undefined;

  const updateStepState = (updates: Partial<StepState>) => {
    if (!credentialId || !stepId) return;

    updateState.mutate({
      credentialId,
      credentialTable,
      stepId,
      updates,
    });
  };

  return {
    stepState: currentStepState,
    isLoading,
    updateStepState,
    isSaving: updateState.isPending,
  };
}
