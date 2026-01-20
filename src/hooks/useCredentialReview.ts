import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewService from '@/services/credentialReview';
import type {
  ReviewQueueFilters,
  ApproveCredentialData,
  RejectCredentialData,
  VerifyCredentialData,
  UnverifyCredentialData,
} from '@/types/credentialReview';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useDriverCredentialsForReview(
  companyId: string | undefined,
  filters: ReviewQueueFilters,
) {
  return useQuery({
    queryKey: ['credential-review', 'driver', companyId, filters],
    queryFn: () => reviewService.getDriverCredentialsForReview(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useVehicleCredentialsForReview(
  companyId: string | undefined,
  filters: ReviewQueueFilters,
) {
  return useQuery({
    queryKey: ['credential-review', 'vehicle', companyId, filters],
    queryFn: () => reviewService.getVehicleCredentialsForReview(companyId!, filters),
    enabled: !!companyId,
  });
}

/**
 * Admin hook: Gets ALL vehicle credential types with existing records merged.
 * Unlike useVehicleCredentialsForReview, this shows all credential types for the company,
 * not just ones the vehicle has submitted.
 */
export function useVehicleCredentialsForAdmin(
  companyId: string | undefined,
  vehicleId: string | undefined,
) {
  return useQuery({
    queryKey: ['credential-review', 'vehicle-admin', companyId, vehicleId],
    queryFn: () => reviewService.getVehicleCredentialsForAdmin(companyId!, vehicleId!),
    enabled: !!companyId && !!vehicleId,
  });
}

/**
 * Admin hook: Gets ALL driver credential types with existing records merged.
 * Unlike useDriverCredentialsForReview, this shows all credential types for the company,
 * not just ones the driver has submitted.
 */
export function useDriverCredentialsForAdmin(
  companyId: string | undefined,
  driverId: string | undefined,
) {
  return useQuery({
    queryKey: ['credential-review', 'driver-admin', companyId, driverId],
    queryFn: () => reviewService.getDriverCredentialsForAdmin(companyId!, driverId!),
    enabled: !!companyId && !!driverId,
  });
}

export function useReviewQueueStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-review', 'stats', companyId],
    queryFn: () => reviewService.getReviewQueueStats(companyId!),
    enabled: !!companyId,
    refetchInterval: 60000,
  });
}

export function useReviewHistory(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-review', 'history', companyId],
    queryFn: () => reviewService.getReviewHistory(companyId!),
    enabled: !!companyId,
  });
}

export function useApproveCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: {
      credentialId: string;
      credentialTable: 'driver_credentials' | 'vehicle_credentials';
      data: ApproveCredentialData;
    }) => reviewService.approveCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: {
      credentialId: string;
      credentialTable: 'driver_credentials' | 'vehicle_credentials';
      data: RejectCredentialData;
    }) => reviewService.rejectCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVerifyCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: {
      credentialId: string;
      credentialTable: 'driver_credentials' | 'vehicle_credentials';
      data: VerifyCredentialData;
    }) => reviewService.verifyCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential verified' });
    },
  });
}

export function useUnverifyCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: {
      credentialId: string;
      credentialTable: 'driver_credentials' | 'vehicle_credentials';
      data: UnverifyCredentialData;
    }) => reviewService.unverifyCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Verification removed' });
    },
  });
}
