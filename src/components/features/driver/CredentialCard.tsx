import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { credentialStatusConfig } from '@/lib/status-configs';
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

const credentialStatusIcons: Record<CredentialDisplayStatus, React.ElementType> = {
  approved: CheckCircle,
  rejected: XCircle,
  pending_review: Clock,
  not_submitted: Circle,
  expired: XCircle,
  expiring: AlertTriangle,
  awaiting: PauseCircle,
  awaiting_verification: PauseCircle,
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
  const statusConfig = credentialStatusConfig[displayStatus] || credentialStatusConfig.not_submitted;
  const StatusIcon = credentialStatusIcons[displayStatus] ?? Circle;

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
          <Badge variant={statusConfig.variant} className="gap-1">
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          {credential.gracePeriodDueDate && (
            <div>Due by {credential.gracePeriodDueDate.toLocaleDateString()}</div>
          )}
          {instance?.expires_at && (
            <div>Expires {new Date(instance.expires_at).toLocaleDateString()}</div>
          )}
          {displayStatus === 'rejected' && instance?.rejection_reason && (
            <span className="text-destructive">{instance.rejection_reason}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
