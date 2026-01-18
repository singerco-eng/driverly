import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDrivers,
  getDriver,
  updateDriverStatus,
  updateDriver,
  addDriverNote,
  getDriverNotes,
  deleteDriverNote,
  getDriverByUserId,
} from '@/services/drivers';
import type { DriverFilters, DriverStatus, Driver } from '@/types/driver';
import { useToast } from '@/hooks/use-toast';

export const driverKeys = {
  all: ['drivers'] as const,
  list: (filters?: DriverFilters) => ['drivers', 'list', filters] as const,
  detail: (id: string) => ['drivers', 'detail', id] as const,
  notes: (driverId: string) => ['drivers', driverId, 'notes'] as const,
};

export function useDrivers(filters?: DriverFilters) {
  return useQuery({
    queryKey: driverKeys.list(filters),
    queryFn: () => getDrivers(filters),
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: () => getDriver(id),
    enabled: !!id,
  });
}

export function useDriverByUserId(userId?: string) {
  return useQuery({
    queryKey: ['drivers', 'user', userId],
    queryFn: () => getDriverByUserId(userId!),
    enabled: !!userId,
  });
}

export function useUpdateDriverStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      driverId,
      status,
      reason,
    }: {
      driverId: string;
      status: DriverStatus;
      reason?: string;
    }) => updateDriverStatus(driverId, status, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
      queryClient.setQueryData(driverKeys.detail(data.id), (old: any) => ({
        ...old,
        ...data,
      }));
      toast({
        title: 'Status updated',
        description: `Driver is now ${data.status}`,
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

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      driverId,
      driverData,
      userData,
    }: {
      driverId: string;
      driverData: Partial<Driver>;
      userData?: { full_name?: string; email?: string; phone?: string };
    }) => updateDriver(driverId, driverData, userData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.all });
      queryClient.invalidateQueries({ queryKey: driverKeys.detail(data.id) });
      toast({
        title: 'Driver updated',
        description: 'Profile has been saved',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update driver',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDriverNotes(driverId: string) {
  return useQuery({
    queryKey: driverKeys.notes(driverId),
    queryFn: () => getDriverNotes(driverId),
    enabled: !!driverId,
  });
}

export function useAddDriverNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      driverId,
      companyId,
      content,
    }: {
      driverId: string;
      companyId: string;
      content: string;
    }) => addDriverNote(driverId, companyId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.notes(variables.driverId) });
      toast({
        title: 'Note added',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDriverNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ noteId }: { noteId: string; driverId: string }) =>
      deleteDriverNote(noteId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.notes(variables.driverId) });
      toast({
        title: 'Note deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete note',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
