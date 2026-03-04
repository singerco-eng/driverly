import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as locationCredentialService from '@/services/locationCredentials';

export function useLocationCredentials(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-credentials', locationId],
    queryFn: () => locationCredentialService.getLocationCredentials(locationId!),
    enabled: !!locationId,
  });
}

export function useLocationCredential(id: string | undefined) {
  return useQuery({
    queryKey: ['location-credential', id],
    queryFn: () => locationCredentialService.getLocationCredential(id!),
    enabled: !!id,
  });
}

export function useSubmitLocationCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      locationId,
      credentialTypeId,
      companyId,
      data,
    }: {
      locationId: string;
      credentialTypeId: string;
      companyId: string;
      data: {
        document_url?: string;
        document_urls?: string[];
        form_data?: Record<string, unknown>;
        entered_date?: string;
        driver_expiration_date?: string;
        notes?: string;
      };
    }) =>
      locationCredentialService.submitLocationCredential(
        locationId,
        credentialTypeId,
        companyId,
        data,
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['location-credentials', result.location_id] });
      queryClient.invalidateQueries({ queryKey: ['location-credential', result.id] });
    },
  });
}

export function useUpdateLocationCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      locationId,
      credentialTypeId,
      companyId,
      data,
    }: {
      locationId: string;
      credentialTypeId: string;
      companyId: string;
      data: {
        document_url?: string;
        document_urls?: string[];
        form_data?: Record<string, unknown>;
        entered_date?: string;
        driver_expiration_date?: string;
        notes?: string;
      };
    }) =>
      locationCredentialService.submitLocationCredential(
        locationId,
        credentialTypeId,
        companyId,
        data,
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['location-credentials', result.location_id] });
      queryClient.invalidateQueries({ queryKey: ['location-credential', result.id] });
    },
  });
}
