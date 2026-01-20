import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as driverVehicleService from '@/services/driverVehicles';
import type { AddVehicleWizardData, SetInactiveData, RetireVehicleData } from '@/types/driverVehicle';
import { useToast } from '@/hooks/use-toast';

export function useOwnedVehicles(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicles', 'owned', driverId],
    queryFn: () => driverVehicleService.getOwnedVehicles(driverId!),
    enabled: !!driverId,
  });
}

export function useAssignedVehicles(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicles', 'assigned', driverId],
    queryFn: () => driverVehicleService.getAssignedVehicles(driverId!),
    enabled: !!driverId,
  });
}

export function useDriverVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicle', vehicleId],
    queryFn: () => driverVehicleService.getDriverVehicle(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { driverId: string; companyId: string; data: AddVehicleWizardData }) =>
      driverVehicleService.createVehicle(params.driverId, params.companyId, params.data),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles', 'owned', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Vehicle added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add vehicle', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; data: Partial<AddVehicleWizardData> }) =>
      driverVehicleService.updateVehicle(params.vehicleId, params.data),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-vehicle', vehicle.id] });
      toast({ title: 'Vehicle updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVehiclePhotos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      vehicleId: string;
      photos: {
        exterior_photo_url?: string | null;
        interior_photo_url?: string | null;
        wheelchair_lift_photo_url?: string | null;
      };
    }) => driverVehicleService.updateVehiclePhotos(params.vehicleId, params.photos),
    onSuccess: (_, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-vehicle', vehicleId] });
      toast({ title: 'Photos updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetVehicleActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (vehicleId: string) => driverVehicleService.setVehicleActive(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle set to active' });
    },
  });
}

export function useSetVehicleInactive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; data: SetInactiveData }) =>
      driverVehicleService.setVehicleInactive(params.vehicleId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle set to inactive' });
    },
  });
}

export function useRetireVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; driverId: string; data: RetireVehicleData }) =>
      driverVehicleService.retireVehicle(params.vehicleId, params.driverId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle retired' });
    },
  });
}

export function useSetPrimaryVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { driverId: string; vehicleId: string }) =>
      driverVehicleService.setPrimaryVehicle(params.driverId, params.vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Primary vehicle updated' });
    },
  });
}

export function useUploadVehiclePhoto() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; file: File; photoType: 'exterior' | 'interior' | 'lift' }) =>
      driverVehicleService.uploadVehiclePhoto(params.vehicleId, params.file, params.photoType),
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}
