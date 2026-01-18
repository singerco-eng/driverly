import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as brokersService from '@/services/brokers';
import type { BrokerFormData, UpdateRatesFormData } from '@/types/broker';
import { useAuth } from '@/contexts/AuthContext';

export function useBrokers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId],
    queryFn: () => brokersService.getBrokers(companyId!),
    enabled: !!companyId,
  });
}

export function useBrokersWithStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId, 'stats'],
    queryFn: () => brokersService.getBrokersWithStats(companyId!),
    enabled: !!companyId,
  });
}

export function useBroker(id: string | undefined) {
  return useQuery({
    queryKey: ['brokers', 'detail', id],
    queryFn: () => brokersService.getBroker(id!),
    enabled: !!id,
  });
}

export function useCreateBroker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: BrokerFormData }) =>
      brokersService.createBroker(companyId, data, user!.id),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', companyId] });
    },
  });
}

export function useUpdateBroker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BrokerFormData> }) =>
      brokersService.updateBroker(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['brokers', 'detail', result.id] });
    },
  });
}

export function useUpdateBrokerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      brokersService.updateBrokerStatus(id, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['brokers', 'detail', result.id] });
    },
  });
}

// Assignments
export function useBrokerAssignments(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'assignments'],
    queryFn: () => brokersService.getBrokerAssignments(brokerId!),
    enabled: !!brokerId,
  });
}

export function useAssignDriverToBroker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, brokerId }: { driverId: string; brokerId: string }) =>
      brokersService.assignDriverToBroker(driverId, brokerId, profile!.company_id!, 'admin', user!.id),
    onSuccess: (_, { brokerId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', brokerId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useApproveAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (assignmentId: string) => brokersService.approveAssignment(assignmentId, user!.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useDenyAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      brokersService.denyAssignment(assignmentId, user!.id, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useRemoveDriverFromBroker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      brokersService.removeDriverFromBroker(assignmentId, user!.id, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

// Rates
export function useBrokerRates(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'rates'],
    queryFn: () => brokersService.getBrokerRates(brokerId!),
    enabled: !!brokerId,
  });
}

export function useCurrentBrokerRates(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'rates', 'current'],
    queryFn: () => brokersService.getCurrentBrokerRates(brokerId!),
    enabled: !!brokerId,
  });
}

export function useUpdateBrokerRates() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ brokerId, data }: { brokerId: string; data: UpdateRatesFormData }) =>
      brokersService.updateBrokerRates(brokerId, profile!.company_id!, data, user!.id),
    onSuccess: (_, { brokerId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', brokerId, 'rates'] });
    },
  });
}
