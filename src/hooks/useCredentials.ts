import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as credentialService from '@/services/credentials';
import type {
  SubmitDocumentPayload,
  SubmitSignaturePayload,
  SubmitFormPayload,
  SubmitDatePayload,
} from '@/services/credentials';
import { useToast } from '@/hooks/use-toast';

export function useDriverCredentials(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-credentials', driverId],
    queryFn: () => credentialService.getDriverCredentials(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleCredentials(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-credentials', vehicleId],
    queryFn: () => credentialService.getVehicleCredentials(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useDriverCredentialProgress(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-credential-progress', driverId],
    queryFn: () => credentialService.getDriverCredentialProgress(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleCredentialProgress(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-credential-progress', vehicleId],
    queryFn: () => credentialService.getVehicleCredentialProgress(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useCredentialHistory(
  credentialId: string | undefined,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
) {
  return useQuery({
    queryKey: ['credential-history', credentialId, credentialTable],
    queryFn: () => credentialService.getCredentialHistory(credentialId!, credentialTable),
    enabled: !!credentialId,
  });
}

export function useSubmitDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitDocumentPayload) =>
      credentialService.submitDocumentCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['driver-credential-progress'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential-progress'] });
      toast({ title: 'Document submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitSignaturePayload) =>
      credentialService.submitSignatureCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Signature submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitFormPayload) => credentialService.submitFormCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Form submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitDate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitDatePayload) => credentialService.submitDateCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Date submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUploadCredentialDocument() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      file,
      userId,
      credentialId,
    }: {
      file: File;
      userId: string;
      credentialId: string;
    }) => credentialService.uploadCredentialDocument(file, userId, credentialId),
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useEnsureDriverCredential() {
  return useMutation({
    mutationFn: ({
      driverId,
      credentialTypeId,
      companyId,
    }: {
      driverId: string;
      credentialTypeId: string;
      companyId: string;
    }) => credentialService.ensureDriverCredential(driverId, credentialTypeId, companyId),
  });
}

/**
 * Admin version - allows admins to create credentials for any driver
 */
export function useAdminEnsureDriverCredential() {
  return useMutation({
    mutationFn: ({
      driverId,
      credentialTypeId,
      companyId,
    }: {
      driverId: string;
      credentialTypeId: string;
      companyId: string;
    }) => credentialService.adminEnsureDriverCredential(driverId, credentialTypeId, companyId),
  });
}

export function useEnsureVehicleCredential() {
  return useMutation({
    mutationFn: ({
      vehicleId,
      credentialTypeId,
      companyId,
    }: {
      vehicleId: string;
      credentialTypeId: string;
      companyId: string;
    }) => credentialService.ensureVehicleCredential(vehicleId, credentialTypeId, companyId),
  });
}

/**
 * Admin version - allows admins to create credentials for any vehicle
 */
export function useAdminEnsureVehicleCredential() {
  return useMutation({
    mutationFn: ({
      vehicleId,
      credentialTypeId,
      companyId,
    }: {
      vehicleId: string;
      credentialTypeId: string;
      companyId: string;
    }) => credentialService.adminEnsureVehicleCredential(vehicleId, credentialTypeId, companyId),
  });
}

/**
 * Generic submit hook for instruction-based credentials
 */
export function useSubmitCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      credentialId,
      credentialTable,
    }: {
      credentialId: string;
      credentialTable: 'driver_credentials' | 'vehicle_credentials';
    }) => credentialService.submitCredential(credentialId, credentialTable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['driver-credential-progress'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential-progress'] });
      queryClient.invalidateQueries({ queryKey: ['credential-progress'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}