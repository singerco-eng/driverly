import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as applicationsService from '@/services/applications';
import type { ApplicationFilters } from '@/services/applications';
import type { ApplicationSubmission, ApplicationFormData } from '@/types/application';

export const applicationKeys = {
  all: ['applications'] as const,
  list: (filters?: ApplicationFilters) => ['applications', 'list', filters] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
  draft: (companyId?: string, userId?: string) =>
    ['applications', 'draft', companyId, userId] as const,
};

export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: applicationKeys.list(filters),
    queryFn: () => applicationsService.getApplications(filters),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationsService.getApplication(id),
    enabled: !!id,
  });
}

export function useApplicationDraft(companyId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: applicationKeys.draft(companyId, user?.id),
    queryFn: () => applicationsService.getApplicationDraft(companyId!, user!.id),
    enabled: !!companyId && !!user?.id,
  });
}

export function useUpsertApplicationDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      companyId: string;
      userId: string;
      formData: ApplicationFormData;
      currentStep: number;
    }) => applicationsService.upsertApplicationDraft(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({
        queryKey: applicationKeys.draft(payload.companyId, payload.userId),
      });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: ApplicationSubmission) => applicationsService.submitApplication(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      toast({ title: 'Application submitted', description: 'We will review your application soon.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateApplicationNotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ driverId, notes }: { driverId: string; notes: string }) =>
      applicationsService.updateApplicationNotes(driverId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(data.id) });
      toast({ title: 'Notes saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save notes', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveApplication() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (driverId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return applicationsService.approveApplication(driverId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      toast({ title: 'Application approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: applicationsService.rejectApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      toast({ title: 'Application rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (driverId: string) => applicationsService.withdrawApplication(driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      toast({ title: 'Application withdrawn' });
    },
    onError: (error: Error) => {
      toast({ title: 'Withdraw failed', description: error.message, variant: 'destructive' });
    },
  });
}
