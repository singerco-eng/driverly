import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as credentialTypesService from '@/services/credentialTypes';
import type {
  CredentialTypeEdits,
  CredentialTypeFormData,
  CreateCredentialTypeSimple,
} from '@/types/credential';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

export function useCredentialTypes(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', companyId],
    queryFn: () => credentialTypesService.getCredentialTypes(companyId!),
    enabled: !!companyId,
  });
}

export function useCredentialType(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', 'detail', id],
    queryFn: () => credentialTypesService.getCredentialType(id!),
    enabled: !!id,
  });
}

export function useCredentialTypeWithStats(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', 'detail', id, 'stats'],
    queryFn: () => credentialTypesService.getCredentialTypeWithStats(id!),
    enabled: !!id,
  });
}

export function useCreateCredentialType() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: CredentialTypeFormData }) =>
      credentialTypesService.createCredentialType(companyId, data, user!.id),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', companyId] });
    },
  });
}

/**
 * Hook to create credential type with simple modal
 */
export function useCreateCredentialTypeSimple() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
      createdBy,
    }: {
      companyId: string;
      data: CreateCredentialTypeSimple;
      createdBy: string;
    }) => credentialTypesService.createCredentialTypeSimple(companyId, data, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create credential type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get a single credential type by ID
 */
export function useCredentialTypeById(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-type', id],
    queryFn: () => credentialTypesService.getCredentialTypeById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to update instruction config
 */
export function useUpdateInstructionConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      credentialTypeId,
      config,
    }: {
      credentialTypeId: string;
      config: CredentialTypeInstructions;
    }) => credentialTypesService.updateInstructionConfig(credentialTypeId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credential-type', variables.credentialTypeId] });
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Changes saved',
        description: 'Credential type updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save changes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCredentialType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: { id: string } & CredentialTypeEdits) => {
      const { id, ...fields } = updates;
      return credentialTypesService.updateCredentialType(id, fields);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credential-type', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Credential type updated',
        description: 'Changes saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update credential type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeactivateCredentialType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.deactivateCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
      toast({
        title: 'Credential deactivated',
        description: 'Drivers will no longer see this credential.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to deactivate credential',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReactivateCredentialType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      effectiveDate,
    }: {
      id: string;
      effectiveDate?: Date;
    }) => credentialTypesService.reactivateCredentialType(id, effectiveDate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
      toast({
        title: 'Credential reactivated',
        description:
          result.status === 'scheduled'
            ? 'Credential is scheduled to go live.'
            : 'Credential is active again.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to reactivate credential',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function usePublishCredentialType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      effectiveDate,
    }: {
      id: string;
      effectiveDate?: Date;
    }) => credentialTypesService.publishCredentialType(id, effectiveDate),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
      toast({
        title: 'Credential published',
        description:
          result.status === 'scheduled'
            ? 'Credential is scheduled to go live.'
            : 'Credential is now active.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to publish credential',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUnpublishCredentialType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.unpublishCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
      toast({
        title: 'Schedule canceled',
        description: 'Credential returned to draft.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to cancel schedule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.deleteCredentialType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
    },
  });
}

export function useBrokers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId],
    queryFn: () => credentialTypesService.getBrokers(companyId!),
    enabled: !!companyId,
  });
}
