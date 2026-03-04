import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as locationService from '@/services/locations';
import type { CreateLocationData, UpdateLocationData } from '@/types/location';

export function useLocations(companyId: string | undefined) {
  return useQuery({
    queryKey: ['locations', companyId],
    queryFn: () => locationService.getLocations(companyId!),
    enabled: !!companyId,
  });
}

export function useLocationsWithStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['locations-with-stats', companyId],
    queryFn: () => locationService.getLocationsWithStats(companyId!),
    enabled: !!companyId,
  });
}

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: () => locationService.getLocationById(id!),
    enabled: !!id,
  });
}

export function useLocationDrivers(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-drivers', locationId],
    queryFn: () => locationService.getLocationDrivers(locationId!),
    enabled: !!locationId,
  });
}

export function useLocationVehicles(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-vehicles', locationId],
    queryFn: () => locationService.getLocationVehicles(locationId!),
    enabled: !!locationId,
  });
}

export function useLocationBrokers(locationId: string | undefined) {
  return useQuery({
    queryKey: ['location-brokers', locationId],
    queryFn: () => locationService.getLocationBrokers(locationId!),
    enabled: !!locationId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: CreateLocationData }) =>
      locationService.createLocation(companyId, data),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['locations', companyId] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-stats', companyId] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationData }) =>
      locationService.updateLocation(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['locations', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-stats', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['location', result.id] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationService.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-with-stats'] });
    },
  });
}

export function useAssignDriverToLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverId, locationId }: { driverId: string; locationId: string | null }) =>
      locationService.assignDriverToLocation(driverId, locationId),
    onSuccess: (_, { locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['location-drivers', locationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['location-drivers'] });
      }
      queryClient.invalidateQueries({ queryKey: ['locations-with-stats'] });
    },
  });
}

export function useAssignVehicleToLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ vehicleId, locationId }: { vehicleId: string; locationId: string | null }) =>
      locationService.assignVehicleToLocation(vehicleId, locationId),
    onSuccess: (_, { locationId }) => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['location-vehicles', locationId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['location-vehicles'] });
      }
      queryClient.invalidateQueries({ queryKey: ['locations-with-stats'] });
    },
  });
}

export function useAssignBrokerToLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      locationId,
      brokerId,
      companyId,
    }: {
      locationId: string;
      brokerId: string;
      companyId: string;
    }) => locationService.assignBrokerToLocation(locationId, brokerId, companyId),
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-brokers', locationId] });
    },
  });
}

export function useRemoveBrokerFromLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, brokerId }: { locationId: string; brokerId: string }) =>
      locationService.removeBrokerFromLocation(locationId, brokerId),
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['location-brokers', locationId] });
    },
  });
}
