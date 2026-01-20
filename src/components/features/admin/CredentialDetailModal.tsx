import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import { DocumentViewer } from '@/components/features/admin/DocumentViewer';
import { getCredentialHistory } from '@/services/credentials';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

interface CredentialDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialForReview | null;
  onApprove: (credential: CredentialForReview) => void;
  onReject: (credential: CredentialForReview) => void;
  onVerify: (credential: CredentialForReview) => void;
}

const statusStyles: Record<ReviewStatus, { label: string; className: string }> = {
  pending_review: {
    label: 'Pending Review',
    className: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  },
  awaiting_verification: {
    label: 'Awaiting Verification',
    className: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  },
  expiring: {
    label: 'Expiring',
    className: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/20 text-green-600 border-green-500/30',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
};

export function CredentialDetailModal({
  open,
  onOpenChange,
  credential,
  onApprove,
  onReject,
  onVerify,
}: CredentialDetailModalProps) {
  const documentPaths = useMemo(() => {
    if (!credential) return [];
    return credential.documentUrls ?? (credential.documentUrl ? [credential.documentUrl] : []);
  }, [credential]);

  const isAdminOnly = credential ? isAdminOnlyCredential(credential.credentialType) : false;
  const showApproveReject = credential?.displayStatus === 'pending_review' && !isAdminOnly;
  const showVerify = credential?.displayStatus === 'awaiting_verification';

  const { data: history } = useQuery({
    queryKey: ['credential-review', 'history', credential?.id],
    queryFn: () =>
      getCredentialHistory(credential!.id, credential!.credentialTable as 'driver_credentials' | 'vehicle_credentials'),
    enabled: !!credential?.id,
  });

  if (!credential) return null;

  const status = statusStyles[credential.displayStatus];
  const subjectTitle = credential.driver?.user?.full_name
    ? `${credential.driver.user.full_name} (${credential.driver.employment_type.toUpperCase()})`
    : credential.vehicle
      ? `${credential.vehicle.make} ${credential.vehicle.model} ${credential.vehicle.year}`
      : 'Credential';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {credential.credentialType.name}
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>{subjectTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {credential.rejectionReason && (
            <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rejection reason: {credential.rejectionReason}
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Submission Details</h4>
              <p className="text-sm text-muted-foreground">
                Submitted: {credential.submittedAt ? new Date(credential.submittedAt).toLocaleString() : '—'}
              </p>
              {credential.enteredDate && (
                <p className="text-sm text-muted-foreground">
                  Entered date: {new Date(credential.enteredDate).toLocaleDateString()}
                </p>
              )}
              {credential.notes && (
                <p className="text-sm text-muted-foreground">Notes: {credential.notes}</p>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Review Details</h4>
              <p className="text-sm text-muted-foreground">
                Reviewed: {credential.reviewedAt ? new Date(credential.reviewedAt).toLocaleString() : '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires: {credential.expiresAt ? new Date(credential.expiresAt).toLocaleDateString() : '—'}
              </p>
              {credential.daysUntilExpiration !== null && (
                <p className="text-sm text-muted-foreground">
                  Days until expiration: {credential.daysUntilExpiration}
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Documents</h4>
            <DocumentViewer paths={documentPaths} />
            {credential.signatureData && (
              <Card className="p-4 space-y-2">
                <h5 className="text-sm font-semibold">Signature</h5>
                {credential.signatureData.type === 'typed' ? (
                  <p className="text-sm font-semibold">{credential.signatureData.value}</p>
                ) : (
                  <img
                    src={credential.signatureData.value}
                    alt="Signature"
                    className="h-24 w-auto border rounded"
                  />
                )}
              </Card>
            )}
            {credential.formData && (
              <Card className="p-4 space-y-2">
                <h5 className="text-sm font-semibold">Form Data</h5>
                <ul className="space-y-1 text-sm">
                  {Object.entries(credential.formData).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium">{key}:</span>{' '}
                      <span className="text-muted-foreground">{String(value)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Submission History</h4>
            {history && history.length > 0 ? (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <Card key={item.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{item.status.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : '—'}
                      </span>
                    </div>
                    {item.review_notes && (
                      <p className="text-xs text-muted-foreground mt-1">{item.review_notes}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No submission history yet.</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {showApproveReject && (
              <>
                <Button variant="outline" onClick={() => onReject(credential)}>
                  Reject
                </Button>
                <Button onClick={() => onApprove(credential)}>Approve</Button>
              </>
            )}
            {showVerify && <Button onClick={() => onVerify(credential)}>Verify</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
