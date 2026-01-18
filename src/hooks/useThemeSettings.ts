import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as themeService from '@/services/theme';
import type { ThemeTokens } from '@/types/theme';

export function usePlatformTheme() {
  return useQuery({
    queryKey: ['theme', 'platform'],
    queryFn: themeService.getPlatformTheme,
  });
}

export function useCompanyTheme(companyId?: string | null) {
  return useQuery({
    queryKey: ['theme', 'company', companyId],
    queryFn: () => themeService.getCompanyTheme(companyId || ''),
    enabled: !!companyId,
  });
}

export function useUpdatePlatformTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<ThemeTokens>) => themeService.upsertPlatformTheme(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', 'platform'] });
    },
  });
}

export function useUpdateCompanyTheme(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<ThemeTokens>) => themeService.upsertCompanyTheme(companyId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme', 'company', companyId] });
    },
  });
}
