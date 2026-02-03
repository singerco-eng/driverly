import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Eye, Calendar, Clock, ListChecks, Building2 } from 'lucide-react';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import { formatDate } from '@/lib/formatters';
import { credentialStatusConfig, type CredentialStatusConfigEntry } from '@/lib/status-configs';

interface CredentialReviewCardProps {
  credential: CredentialForReview;
  onView: (credential: CredentialForReview) => void;
}

type DisplayStatus = ReviewStatus | 'not_submitted';

const awaitingVerificationConfig: CredentialStatusConfigEntry = {
  label: 'Awaiting Verification',
  variant: 'secondary',
};

const getStatusConfig = (status: DisplayStatus) =>
  status === 'awaiting_verification'
    ? awaitingVerificationConfig
    : credentialStatusConfig[status] || credentialStatusConfig.not_submitted;

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
  const status = getStatusConfig(credential.displayStatus as DisplayStatus);
  const subjectLine = getSubjectLine(credential);
  const submittedDate = credential.submittedAt ? formatDate(credential.submittedAt) : null;
  const expiresDate = credential.expiresAt ? formatDate(credential.expiresAt) : null;
  const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;
  const isComplete = credential.displayStatus === 'approved';

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>

        {/* Centered icon and credential info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={() => onView(credential)}
        >
          {/* Credential Icon */}
          <div className={`
            h-12 w-12 rounded-lg flex items-center justify-center mb-2
            ${isComplete ? 'bg-primary-muted/15 text-primary-muted' : 'bg-muted text-muted-foreground'}
          `}>
            <FileText className="h-6 w-6" />
          </div>

          {/* Credential Name */}
          <h3 className="font-semibold">{credential.credentialType.name}</h3>

          {/* Subject Line */}
          {subjectLine && (
            <p className="text-sm text-muted-foreground">{subjectLine}</p>
          )}

          {/* Broker info */}
          {credential.credentialType.broker?.name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{credential.credentialType.broker.name}</span>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Submitted Date */}
          {submittedDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Submitted {submittedDate}</span>
            </div>
          )}

          {/* Steps */}
          {stepCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4 shrink-0" />
              <span>{stepCount} steps</span>
            </div>
          )}

          {/* Expiration */}
          {expiresDate && (
            <div className={`flex items-center gap-2 ${
              credential.displayStatus === 'expiring' || credential.displayStatus === 'expired' 
                ? 'text-destructive' 
                : 'text-muted-foreground'
            }`}>
              <Clock className="h-4 w-4 shrink-0" />
              <span>Expires {expiresDate}</span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto"
          onClick={() => onView(credential)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
