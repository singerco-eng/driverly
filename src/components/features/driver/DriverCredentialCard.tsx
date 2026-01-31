import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronRight,
  ListChecks,
  Building2,
  Car,
  User,
} from 'lucide-react';
import type { CredentialWithDisplayStatus, CredentialDisplayStatus } from '@/types/credential';
import { credentialStatusVariant } from '@/lib/status-styles';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

interface DriverCredentialCardProps {
  credential: CredentialWithDisplayStatus;
  onView: (credential: CredentialWithDisplayStatus) => void;
}

/** Status config - labels and icons only, variants from status-styles.ts */
const statusConfig: Record<CredentialDisplayStatus, {
  label: string;
  icon: React.ElementType;
}> = {
  approved: {
    label: 'Complete',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    icon: AlertCircle,
  },
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
  },
  not_submitted: {
    label: 'Not Started',
    icon: FileText,
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
  },
  expiring: {
    label: 'Expiring Soon',
    icon: Clock,
  },
  awaiting: {
    label: 'In Review',
    icon: Clock,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

function formatVehicleLabel(
  vehicle?: { year?: number | null; make?: string | null; model?: string | null } | null,
) {
  if (!vehicle) return null;
  const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return label || null;
}

export function DriverCredentialCard({
  credential,
  onView,
}: DriverCredentialCardProps) {
  const status = statusConfig[credential.displayStatus] || statusConfig.not_submitted;
  const StatusIcon = status.icon;
  const badgeVariant = credentialStatusVariant[credential.displayStatus] || 'outline';
  const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;
  const completedSteps = credential.credential?.progress?.completedSteps?.length || 0;
  const progressPercent = stepCount > 0 ? Math.round((completedSteps / stepCount) * 100) : 0;
  
  const needsAction = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(credential.displayStatus);
  const isAdminOnly = isAdminOnlyCredential(credential.credentialType);
  const isComplete = credential.displayStatus === 'approved';
  const isPending = ['pending_review', 'awaiting'].includes(credential.displayStatus);
  const isInProgress = credential.displayStatus === 'not_submitted' && completedSteps > 0;
  
  const CategoryIcon = credential.credentialType.category === 'vehicle' ? Car : User;
  const vehicleLabel =
    credential.credentialType.category === 'vehicle'
      ? formatVehicleLabel(credential.credential?.vehicle)
      : null;

  return (
    <Card 
      className="h-full flex flex-col hover:shadow-soft transition-all cursor-pointer group"
      onClick={() => onView(credential)}
    >
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={badgeVariant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        {/* Centered icon and credential name */}
        <div className="flex flex-col items-center text-center">
          {/* Category Icon */}
          <div className={`
            h-12 w-12 rounded-lg flex items-center justify-center mb-2
            ${isComplete ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
          `}>
            <FileText className="h-6 w-6" />
          </div>

          {/* Credential Name */}
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {credential.credentialType.name}
          </h3>

          {/* Category and Broker info */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
            <CategoryIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{credential.credentialType.category}</span>
            {credential.credentialType.broker?.name && (
              <>
                <span className="text-border">·</span>
                <Building2 className="h-3.5 w-3.5" />
                <span>{credential.credentialType.broker.name}</span>
              </>
            )}
          </div>

          {/* Vehicle label if applicable */}
          {vehicleLabel && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <Car className="h-3.5 w-3.5" />
              <span>{vehicleLabel}</span>
            </div>
          )}
        </div>

        {/* Progress Bar (for in-progress credentials) */}
        {stepCount > 0 && !isComplete && !isPending && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {completedSteps} of {stepCount} steps
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Submitted Date */}
          {credential.credential?.submitted_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Submitted {formatDate(credential.credential.submitted_at)}</span>
            </div>
          )}

          {/* Expiration */}
          {credential.credential?.expires_at && (
            <div className={`flex items-center gap-2 ${
              credential.daysUntilExpiration !== null && credential.daysUntilExpiration <= 30 
                ? 'text-destructive' 
                : 'text-muted-foreground'
            }`}>
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {credential.daysUntilExpiration !== null && credential.daysUntilExpiration <= 0
                  ? 'Expired'
                  : credential.daysUntilExpiration !== null && credential.daysUntilExpiration <= 30
                    ? `Expires in ${credential.daysUntilExpiration} days`
                    : `Expires ${formatDate(credential.credential.expires_at)}`}
              </span>
            </div>
          )}

          {/* No expiration */}
          {!credential.credential?.expires_at && credential.credentialType.expiration_type === 'never' && isComplete && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Never expires</span>
            </div>
          )}

          {/* Admin-only notice */}
          {isAdminOnly && needsAction && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Admin will complete this</span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Button */}
        <Button 
          variant="outline"
          size="sm" 
          className="w-full mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            onView(credential);
          }}
        >
          {needsAction && !isAdminOnly ? (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {isInProgress ? 'Continue' : 'Start'}
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-2" />
              View Details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
