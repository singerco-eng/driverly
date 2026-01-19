import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as onboardingService from '@/services/onboarding';
import type { PaymentInfoFormData } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';

export function useOnboardingStatus(driverId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-status', driverId],
    queryFn: () => onboardingService.getOnboardingStatus(driverId!),
    enabled: !!driverId,
    refetchInterval: 30000,
  });
}

export function useToggleDriverActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      driverId,
      active,
      reason,
    }: {
      driverId: string;
      active: boolean;
      reason?: string;
    }) => onboardingService.toggleDriverActive(driverId, active, reason),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
    },
  });
}

export function useDriverAvailability(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-availability', driverId],
    queryFn: () => onboardingService.getDriverAvailability(driverId!),
    enabled: !!driverId,
  });
}

export function useSaveDriverAvailability() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({
      driverId,
      availability,
    }: {
      driverId: string;
      availability: any[];
    }) => onboardingService.saveDriverAvailability(driverId, profile!.company_id!, availability),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-availability', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}

export function useDriverPaymentInfo(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-payment-info', driverId],
    queryFn: () => onboardingService.getDriverPaymentInfo(driverId!),
    enabled: !!driverId,
  });
}

export function useSaveDriverPaymentInfo() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({
      driverId,
      formData,
    }: {
      driverId: string;
      formData: PaymentInfoFormData;
    }) => onboardingService.saveDriverPaymentInfo(driverId, profile!.company_id!, formData),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-payment-info', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}
