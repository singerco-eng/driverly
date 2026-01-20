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

// Status configuration - using DS semantic colors
const statusConfig: Record<CredentialDisplayStatus, { label: string; icon: React.ElementType }> = {
  approved: {
    label: 'Complete',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
  },
  pending_review: {
    label: 'Pending',
    icon: Clock,
  },
  not_submitted: {
    label: 'To Do',
    icon: Circle,
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
  },
  expiring: {
    label: 'Expiring',
    icon: AlertTriangle,
  },
  awaiting: {
    label: 'In Review',
    icon: PauseCircle,
  },
};

interface CredentialCardProps {
  credential: CredentialWithDisplayStatus;
  onSubmit: () => void;
  onView: () => void;
}

export function CredentialCard({ credential, onSubmit, onView }: CredentialCardProps) {
  const { credentialType, displayStatus, credential: instance } = credential;
  const status = statusConfig[displayStatus];
  const StatusIcon = status?.icon ?? Circle;

  const needsAction = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(displayStatus);

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
          <Badge variant={credentialStatusVariant[displayStatus]} className="gap-1">
            <StatusIcon className="w-3 h-3" />
            {status?.label ?? displayStatus}
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
