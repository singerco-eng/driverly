import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';

interface CredentialReviewCardProps {
  credential: CredentialForReview;
  onView: (credential: CredentialForReview) => void;
}

type DisplayStatus = ReviewStatus | 'not_submitted';

/** Status config using native Badge variants per design system */
const statusConfig: Record<DisplayStatus, { 
  label: string; 
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  pending_review: {
    label: 'Pending Review',
    badgeVariant: 'secondary',
  },
  awaiting_verification: {
    label: 'Awaiting Verification',
    badgeVariant: 'secondary',
  },
  expiring: {
    label: 'Expiring Soon',
    badgeVariant: 'outline',
  },
  expired: {
    label: 'Expired',
    badgeVariant: 'destructive',
  },
  approved: {
    label: 'Approved',
    badgeVariant: 'default',
  },
  rejected: {
    label: 'Rejected',
    badgeVariant: 'destructive',
  },
  not_submitted: {
    label: 'Not Submitted',
    badgeVariant: 'outline',
  },
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

function getSubjectLine(credential: CredentialForReview) {
  if (credential.driver?.user?.full_name) {
    return credential.driver.user.full_name;
  }
  if (credential.vehicle) {
    return `${credential.vehicle.make} ${credential.vehicle.model} ${credential.vehicle.year}`;
  }
  return null;
}

export function CredentialReviewCard({
  credential,
  onView,
}: CredentialReviewCardProps) {
  const status = statusConfig[credential.displayStatus as DisplayStatus] || statusConfig.not_submitted;
  const subjectLine = getSubjectLine(credential);
  const submittedDate = formatDate(credential.submittedAt);
  const expiresDate = formatDate(credential.expiresAt);
  
  // Count steps from instruction_config
  const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;

  return (
    <Card 
      className="hover:shadow-soft transition-all cursor-pointer group"
      onClick={() => onView(credential)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{credential.credentialType.name}</p>
              {subjectLine && (
                <p className="text-xs text-muted-foreground truncate">{subjectLine}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {credential.credentialType.broker?.name && (
              <Badge variant="secondary" className="text-xs">
                {credential.credentialType.broker.name}
              </Badge>
            )}
            <Badge variant={status.badgeVariant}>
              {status.label}
            </Badge>
          </div>
        </div>
        
        {/* Metadata row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {submittedDate && (
            <span>Submitted {submittedDate}</span>
          )}
          {submittedDate && stepCount > 0 && (
            <span className="text-border">·</span>
          )}
          {stepCount > 0 && (
            <span>{stepCount} steps</span>
          )}
          {expiresDate && (
            <>
              <span className="text-border">·</span>
              <span className={credential.displayStatus === 'expiring' || credential.displayStatus === 'expired' ? 'text-destructive' : ''}>
                Expires {expiresDate}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
