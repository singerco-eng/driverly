import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as credentialTypesService from '@/services/credentialTypes';
import type { CredentialTypeFormData } from '@/types/credential';
import { useAuth } from '@/contexts/AuthContext';

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

export function useUpdateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CredentialTypeFormData> }) =>
      credentialTypesService.updateCredentialType(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
    },
  });
}

export function useDeactivateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.deactivateCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
    },
  });
}

export function useReactivateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.reactivateCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
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
