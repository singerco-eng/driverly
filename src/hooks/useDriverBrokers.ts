import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as brokerService from '@/services/brokers';

export const driverBrokerKeys = {
  all: ['driver-brokers'] as const,
  list: (driverId: string) => [...driverBrokerKeys.all, 'list', driverId] as const,
  assignments: (driverId: string) => [...driverBrokerKeys.all, 'assignments', driverId] as const,
};

export function useDriverBrokers(driverId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: driverBrokerKeys.list(driverId ?? ''),
    queryFn: () => brokerService.getDriverBrokers(driverId!, companyId!),
    enabled: !!driverId && !!companyId,
  });
}

export function useDriverAssignments(driverId: string | undefined) {
  return useQuery({
    queryKey: driverBrokerKeys.assignments(driverId ?? ''),
    queryFn: () => brokerService.getDriverAssignments(driverId!),
    enabled: !!driverId,
  });
}

export function useRequestBrokerAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, brokerId }: { driverId: string; brokerId: string }) =>
      brokerService.requestBrokerAssignment(driverId, brokerId, profile!.company_id!),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: driverBrokerKeys.list(driverId) });
      toast({
        title: 'Request submitted',
        description: 'Your request has been sent to your admin.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAutoJoinBroker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, brokerId }: { driverId: string; brokerId: string }) =>
      brokerService.autoJoinBroker(driverId, brokerId, profile!.company_id!),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: driverBrokerKeys.list(driverId) });
      toast({
        title: 'Successfully joined',
        description: 'Complete any additional credentials to start accepting trips.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Join failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelBrokerRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignmentId }: { assignmentId: string; driverId: string }) =>
      brokerService.cancelBrokerRequest(assignmentId),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: driverBrokerKeys.list(driverId) });
      toast({
        title: 'Request canceled',
        description: 'Your request has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancel failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

