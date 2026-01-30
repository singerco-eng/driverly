import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as featureFlagService from '@/services/featureFlags';
import type { FeatureFlagKey } from '@/types/featureFlags';

export const featureFlagKeys = {
  all: ['featureFlags'] as const,
  list: () => [...featureFlagKeys.all, 'list'] as const,
  listWithStats: () => [...featureFlagKeys.all, 'listWithStats'] as const,
  forCompany: (companyId: string) =>
    [...featureFlagKeys.all, 'company', companyId] as const,
  overridesForFlag: (flagId: string) =>
    [...featureFlagKeys.all, 'overrides', flagId] as const,
  check: (companyId: string, key: string) =>
    [...featureFlagKeys.all, 'check', companyId, key] as const,
};

export function useAllFeatureFlags() {
  return useQuery({
    queryKey: featureFlagKeys.listWithStats(),
    queryFn: featureFlagService.getAllFlagsWithStats,
  });
}

export function useCompanyFeatureFlags(companyId: string | undefined) {
  return useQuery({
    queryKey: featureFlagKeys.forCompany(companyId ?? ''),
    queryFn: () => featureFlagService.getFlagsForCompany(companyId!),
    enabled: !!companyId,
  });
}

export function useOverridesForFlag(flagId: string | undefined) {
  return useQuery({
    queryKey: featureFlagKeys.overridesForFlag(flagId ?? ''),
    queryFn: () => featureFlagService.getOverridesForFlag(flagId!),
    enabled: !!flagId,
  });
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data } = useQuery({
    queryKey: featureFlagKeys.check(companyId ?? '', key),
    queryFn: () => featureFlagService.isFeatureEnabled(companyId!, key),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (profile?.role === 'super_admin') {
    return true;
  }

  return data ?? false;
}

export function useFeatureFlags(keys: FeatureFlagKey[]): Record<string, boolean> {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data } = useQuery({
    queryKey: [...featureFlagKeys.forCompany(companyId ?? ''), 'batch', keys],
    queryFn: () => featureFlagService.getEnabledFlags(companyId!, keys),
    enabled: !!companyId && keys.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (profile?.role === 'super_admin') {
    return Object.fromEntries(keys.map((flagKey) => [flagKey, true]));
  }

  return data ?? Object.fromEntries(keys.map((flagKey) => [flagKey, false]));
}

export function useSetGlobalDefault() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      featureFlagService.setGlobalDefault(flagId, enabled),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: `Flag ${enabled ? 'enabled' : 'disabled'} globally`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update flag',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSetCompanyOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      companyId,
      flagId,
      enabled,
      reason,
    }: {
      companyId: string;
      flagId: string;
      enabled: boolean;
      reason?: string;
    }) => featureFlagService.setCompanyOverride(companyId, flagId, enabled, reason),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: `Override ${enabled ? 'enabled' : 'disabled'}`,
        description: 'Company-specific access updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to set override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveCompanyOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, flagId }: { companyId: string; flagId: string }) =>
      featureFlagService.removeCompanyOverride(companyId, flagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureFlagKeys.all });
      toast({
        title: 'Override removed',
        description: 'Company will now use global default.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove override',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
