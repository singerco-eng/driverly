import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  updateVehicleMileage,
} from '@/services/vehicles';
import type { VehicleFilters, VehicleStatus, CreateVehicleData } from '@/types/vehicle';
import { useToast } from '@/hooks/use-toast';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (filters?: VehicleFilters) => ['vehicles', 'list', filters] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
};

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: vehicleKeys.list(filters),
    queryFn: () => getVehicles(filters),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => getVehicle(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateVehicleData) => createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      toast({
        title: 'Vehicle added',
        description: 'New vehicle has been created',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create vehicle',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      vehicleId,
      data,
    }: {
      vehicleId: string;
      data: Partial<CreateVehicleData>;
    }) => updateVehicle(vehicleId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) });
      toast({
        title: 'Vehicle updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update vehicle',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      vehicleId,
      status,
      reason,
    }: {
      vehicleId: string;
      status: VehicleStatus;
      reason?: string;
    }) => updateVehicleStatus(vehicleId, status, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
      queryClient.setQueryData(vehicleKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }));
      toast({
        title: 'Status updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateVehicleMileage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ vehicleId, mileage }: { vehicleId: string; mileage: number }) =>
      updateVehicleMileage(vehicleId, mileage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) });
      toast({
        title: 'Mileage updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update mileage',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
