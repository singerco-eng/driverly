import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

interface CredentialReviewCardProps {
  credential: CredentialForReview;
  onView: (credential: CredentialForReview) => void;
  onApprove: (credential: CredentialForReview) => void;
  onReject: (credential: CredentialForReview) => void;
  onVerify: (credential: CredentialForReview) => void;
}

type DisplayStatus = ReviewStatus | 'not_submitted';

const statusStyles: Record<DisplayStatus, { label: string; className: string }> = {
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
  not_submitted: {
    label: 'Not Submitted',
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function getDocumentLabel(credential: CredentialForReview) {
  const paths = credential.documentUrls ?? (credential.documentUrl ? [credential.documentUrl] : []);
  if (paths.length === 0) return 'No document';
  const name = paths[0].split('/').pop() || paths[0];
  return paths.length > 1 ? `${name} +${paths.length - 1}` : name;
}

function getSubjectLine(credential: CredentialForReview) {
  if (credential.driver?.user?.full_name) {
    return `${credential.driver.user.full_name} · ${credential.driver.employment_type.toUpperCase()}`;
  }

  if (credential.vehicle) {
    const vehicleName = `${credential.vehicle.make} ${credential.vehicle.model} ${credential.vehicle.year}`;
    const ownerName = credential.vehicle.owner?.user?.full_name
      ? ` · ${credential.vehicle.owner.user.full_name}`
      : '';
    return `${vehicleName}${ownerName}`;
  }

  return '—';
}

export function CredentialReviewCard({
  credential,
  onView,
  onApprove,
  onReject,
  onVerify,
}: CredentialReviewCardProps) {
  const status = statusStyles[credential.displayStatus as DisplayStatus] || statusStyles.not_submitted;
  const isAdminOnly = isAdminOnlyCredential(credential.credentialType);
  const showApproveReject = credential.displayStatus === 'pending_review' && !isAdminOnly;
  const showVerify = credential.displayStatus === 'awaiting_verification';

  return (
    <Card className="hover:shadow-soft transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <CardTitle className="text-base mt-2">{credential.credentialType.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{getSubjectLine(credential)}</p>
          </div>
          {credential.credentialType.broker?.name && (
            <Badge variant="secondary" className="text-xs">
              {credential.credentialType.broker.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Submitted: {formatDate(credential.submittedAt)}</span>
          <span>Document: {getDocumentLabel(credential)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(credential)}>
            View
          </Button>
          {showApproveReject && (
            <>
              <Button variant="outline" size="sm" onClick={() => onReject(credential)}>
                Reject
              </Button>
              <Button size="sm" onClick={() => onApprove(credential)}>
                Approve
              </Button>
            </>
          )}
          {showVerify && (
            <Button size="sm" onClick={() => onVerify(credential)}>
              Verify
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
