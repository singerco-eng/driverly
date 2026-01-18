import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as invitationsService from '@/services/invitations';
import type { InviteAdminFormData } from '@/types/invitation';

export function useCompanyInvitations(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'invitations'],
    queryFn: () => invitationsService.getCompanyInvitations(companyId),
    enabled: !!companyId,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: InviteAdminFormData }) =>
      invitationsService.sendInvitation(companyId, data),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'invitations'] });
      queryClient.invalidateQueries({ queryKey: ['companies', companyId, 'admins'] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => invitationsService.resendInvitation(invitationId),
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({
        queryKey: ['companies', invitation.company_id, 'invitations'],
      });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => invitationsService.revokeInvitation(invitationId),
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({
        queryKey: ['companies', invitation.company_id, 'invitations'],
      });
    },
  });
}

export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsService.validateInvitationToken(token!),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      invitationsService.acceptInvitation(token, password),
  });
}
