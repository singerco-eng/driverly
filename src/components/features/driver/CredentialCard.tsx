import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { credentialStatusVariant } from '@/lib/status-styles';
import type { CredentialWithDisplayStatus, CredentialDisplayStatus } from '@/types/credential';
import { CredentialRequirementsDisplay } from '@/components/features/credentials/CredentialRequirementsDisplay';
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  PauseCircle,
  XCircle,
} from 'lucide-react';

const credentialStatusLabels: Record<CredentialDisplayStatus, string> = {
  approved: 'Complete',
  rejected: 'Rejected',
  pending_review: 'Pending',
  not_submitted: 'To Do',
  expired: 'Expired',
  expiring: 'Expiring',
  awaiting: 'In Review',
  grace_period: 'Due Soon',
  missing: 'Missing',
};

const credentialStatusIcons: Record<CredentialDisplayStatus, React.ElementType> = {
  approved: CheckCircle,
  rejected: XCircle,
  pending_review: Clock,
  not_submitted: Circle,
  expired: XCircle,
  expiring: AlertTriangle,
  awaiting: PauseCircle,
  grace_period: Clock,
  missing: AlertTriangle,
};

interface CredentialCardProps {
  credential: CredentialWithDisplayStatus;
  onSubmit: () => void;
  onView: () => void;
}

export function CredentialCard({ credential, onSubmit, onView }: CredentialCardProps) {
  const { credentialType, displayStatus, credential: instance } = credential;
  const StatusIcon = credentialStatusIcons[displayStatus] ?? Circle;
  const statusLabel =
    displayStatus === 'grace_period' && credential.gracePeriodDueDate
      ? `Due by ${credential.gracePeriodDueDate.toLocaleDateString()}`
      : credentialStatusLabels[displayStatus] ?? displayStatus;

  const needsAction = [
    'not_submitted',
    'rejected',
    'expired',
    'expiring',
    'grace_period',
    'missing',
  ].includes(displayStatus);

  const handleClick = () => {
    if (needsAction) {
      onSubmit();
    } else {
      onView();
    }
  };

  return (
    <Card
      className="h-full cursor-pointer hover:shadow-soft transition-all"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base">{credentialType.name}</CardTitle>
              <CredentialRequirementsDisplay
                credentialType={credentialType}
                showLabels={false}
                showStepCount={true}
                size="sm"
                className="mt-1"
              />
            </div>
          </div>
          <Badge
            variant={credentialStatusVariant[displayStatus]}
            className={
              displayStatus === 'grace_period'
                ? 'gap-1 bg-amber-50 text-amber-700 border-amber-200'
                : 'gap-1'
            }
          >
            <StatusIcon className="w-3 h-3" />
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {instance?.expires_at
            ? `Expires ${new Date(instance.expires_at).toLocaleDateString()}`
            : displayStatus === 'rejected' && instance?.rejection_reason
              ? <span className="text-destructive">{instance.rejection_reason}</span>
              : null}
        </div>
      </CardContent>
    </Card>
  );
}
