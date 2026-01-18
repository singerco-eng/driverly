import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as assignmentService from '@/services/vehicleAssignments';
import type {
  AssignVehicleFormData,
  TransferVehicleFormData,
  UnassignVehicleFormData,
  ExtendAssignmentFormData,
} from '@/types/vehicleAssignment';
import { useAuth } from '@/contexts/AuthContext';

export function useDriverAssignments(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-assignments', driverId],
    queryFn: () => assignmentService.getDriverAssignments(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleAssignment(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-assignment', vehicleId],
    queryFn: () => assignmentService.getVehicleAssignment(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useAvailableVehicles(companyId: string | undefined) {
  return useQuery({
    queryKey: ['available-vehicles', companyId],
    queryFn: () => assignmentService.getAvailableVehicles(companyId!),
    enabled: !!companyId,
  });
}

export function useAvailableDrivers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['available-drivers', companyId],
    queryFn: () => assignmentService.getAvailableDrivers(companyId!),
    enabled: !!companyId,
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: (formData: AssignVehicleFormData) =>
      assignmentService.assignVehicle(formData, profile!.company_id!, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments', variables.driver_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useTransferVehicle() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: TransferVehicleFormData }) =>
      assignmentService.transferVehicle(assignmentId, data, profile!.company_id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useUnassignVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: UnassignVehicleFormData }) =>
      assignmentService.unassignVehicle(assignmentId, data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useExtendAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: ExtendAssignmentFormData }) =>
      assignmentService.extendAssignment(assignmentId, data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useEndAssignmentEarly() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      assignmentService.endAssignmentEarly(assignmentId, reason, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useSetPrimaryVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, driverId }: { assignmentId: string; driverId: string }) =>
      assignmentService.setPrimaryVehicle(assignmentId, driverId, user!.id),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments', driverId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useVehicleAssignmentHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-history', 'vehicle', vehicleId],
    queryFn: () => assignmentService.getVehicleAssignmentHistory(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useDriverAssignmentHistory(driverId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-history', 'driver', driverId],
    queryFn: () => assignmentService.getDriverAssignmentHistory(driverId!),
    enabled: !!driverId,
  });
}
