import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as companiesService from '@/services/companies';
import type { CompanyFormData } from '@/types/company';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: companiesService.getCompanies,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => companiesService.getCompany(id),
    enabled: !!id,
  });
}

export function useCompanyBySlug(slug: string) {
  return useQuery({
    queryKey: ['companies', 'slug', slug],
    queryFn: () => companiesService.getCompanyBySlug(slug),
    enabled: !!slug,
  });
}

export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: ['companies', id, 'detail'],
    queryFn: () => companiesService.getCompanyDetail(id),
    enabled: !!id,
  });
}

export function useCompanyAdmins(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'admins'],
    queryFn: () => companiesService.getCompanyAdmins(companyId),
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompanyFormData) => companiesService.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyFormData> }) =>
      companiesService.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useDeactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      companiesService.deactivateCompany(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useSuspendCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      companiesService.suspendCompany(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useReactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companiesService.reactivateCompany(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}
