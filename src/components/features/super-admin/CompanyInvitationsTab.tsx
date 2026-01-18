import { useState } from 'react';
import {
  useCompanyInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Mail, MoreHorizontal, RefreshCw, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InvitationStatus, InvitationWithInviter } from '@/types/invitation';
import InviteAdminModal from './InviteAdminModal';

interface CompanyInvitationsTabProps {
  companyId: string;
  companyName: string;
}

const statusConfig: Record<
  InvitationStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
> = {
  pending: { variant: 'default', label: 'Pending' },
  accepted: { variant: 'secondary', label: 'Accepted' },
  expired: { variant: 'outline', label: 'Expired' },
  revoked: { variant: 'destructive', label: 'Revoked' },
};

export default function CompanyInvitationsTab({ companyId, companyName }: CompanyInvitationsTabProps) {
  const { data: invitations, isLoading } = useCompanyInvitations(companyId);
  const resendInvitation = useResendInvitation();
  const revokeInvitation = useRevokeInvitation();
  const { toast } = useToast();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resend' | 'revoke';
    invitation: InvitationWithInviter;
  } | null>(null);

  async function handleResend(invitation: InvitationWithInviter) {
    try {
      await resendInvitation.mutateAsync(invitation.id);
      toast({
        title: 'Invitation resent',
        description: `A new invitation has been sent to ${invitation.email}`,
      });
      setConfirmAction(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  }

  async function handleRevoke(invitation: InvitationWithInviter) {
    try {
      await revokeInvitation.mutateAsync(invitation.id);
      toast({
        title: 'Invitation revoked',
        description: `The invitation for ${invitation.email} has been revoked`,
      });
      setConfirmAction(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke invitation',
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Invitations</CardTitle>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Admin
          </Button>
        </CardHeader>
        <CardContent>
          {invitations?.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No invitations yet</h3>
              <p className="text-muted-foreground mb-4">Invite an admin to manage this company</p>
              <Button onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Admin
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations?.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.full_name}</TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[invitation.status].variant}>
                        {statusConfig[invitation.status].label}
                      </Badge>
                      {invitation.resent_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (resent {invitation.resent_count}x)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invitation.status === 'pending'
                        ? new Date(invitation.expires_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {(invitation.status === 'pending' || invitation.status === 'expired') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'resend', invitation })}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            {invitation.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'revoke', invitation })}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Revoke
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteAdminModal
        companyId={companyId}
        companyName={companyName}
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmAction?.type === 'resend'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Resend the invitation to {confirmAction?.invitation.email}? This will send a new email
              and extend the expiration to 7 days from now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleResend(confirmAction.invitation)}
              disabled={resendInvitation.isPending}
            >
              {resendInvitation.isPending ? 'Sending...' : 'Resend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction?.type === 'revoke'} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke the invitation for {confirmAction?.invitation.email}? They will no longer be
              able to use the invitation link. You can send a new invitation later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleRevoke(confirmAction.invitation)}
              disabled={revokeInvitation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeInvitation.isPending ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
