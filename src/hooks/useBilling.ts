import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as billingService from '@/services/billing';

export const billingKeys = {
  all: ['billing'] as const,
  plans: () => [...billingKeys.all, 'plans'] as const,
  subscription: (companyId: string) => [...billingKeys.all, 'subscription', companyId] as const,
  usage: (companyId: string) => [...billingKeys.all, 'usage', companyId] as const,
  allSubscriptions: () => [...billingKeys.all, 'subscriptions'] as const,
  stats: () => [...billingKeys.all, 'stats'] as const,
  events: () => [...billingKeys.all, 'events'] as const,
};

// ============ PLANS ============

export function useBillingPlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: billingService.getAllPlans,
    staleTime: 10 * 60 * 1000,
  });
}

// ============ SUBSCRIPTION ============

export function useSubscription(companyId?: string) {
  const { profile } = useAuth();
  const effectiveCompanyId = companyId ?? profile?.company_id;

  return useQuery({
    queryKey: billingKeys.subscription(effectiveCompanyId ?? ''),
    queryFn: () => billingService.getCompanySubscription(effectiveCompanyId!),
    enabled: !!effectiveCompanyId,
  });
}

export function useMySubscription() {
  const { profile } = useAuth();
  return useSubscription(profile?.company_id);
}

// ============ USAGE ============

export function useOperatorUsage(companyId?: string) {
  const { profile } = useAuth();
  const effectiveCompanyId = companyId ?? profile?.company_id;

  return useQuery({
    queryKey: billingKeys.usage(effectiveCompanyId ?? ''),
    queryFn: () => billingService.getOperatorUsage(effectiveCompanyId!),
    enabled: !!effectiveCompanyId,
    refetchInterval: 60000,
  });
}

export function useCanAddOperator() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: [...billingKeys.usage(companyId ?? ''), 'canAdd'],
    queryFn: () => billingService.checkCanAddOperator(companyId!),
    enabled: !!companyId,
  });
}

// ============ SUPER ADMIN ============

export function useAllSubscriptions() {
  return useQuery({
    queryKey: billingKeys.allSubscriptions(),
    queryFn: billingService.getAllSubscriptions,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: billingKeys.stats(),
    queryFn: billingService.getBillingStats,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useBillingEvents() {
  return useQuery({
    queryKey: billingKeys.events(),
    queryFn: () => billingService.getBillingEvents(),
  });
}

export function useSetNeverBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, neverBill }: { companyId: string; neverBill: boolean }) =>
      billingService.setNeverBill(companyId, neverBill),
    onSuccess: (_, { neverBill }) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast({ title: neverBill ? 'Marked as never-bill' : 'Billing enabled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetOperatorLimitOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ companyId, limit }: { companyId: string; limit: number | null }) =>
      billingService.setOperatorLimitOverride(companyId, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      toast({ title: 'Operator limit updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ STRIPE ============

export function useCreateCheckoutSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      companyId,
      priceId,
      interval,
    }: {
      companyId: string;
      priceId: string;
      interval: 'monthly' | 'annual';
    }) => billingService.createCheckoutSession(companyId, priceId, interval),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: 'Checkout failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreatePortalSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (companyId: string) => billingService.createPortalSession(companyId),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: 'Portal failed', description: error.message, variant: 'destructive' });
    },
  });
}
