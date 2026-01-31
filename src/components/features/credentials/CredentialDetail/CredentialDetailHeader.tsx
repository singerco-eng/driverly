import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CredentialStatus, CredentialType } from '@/types/credential';

interface CredentialDetailHeaderProps {
  credentialType: CredentialType;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  status: CredentialStatus;
  expiresAt: string | null;
  submittedAt: string | null;
  onBack: () => void;
  showBackButton?: boolean;
  /** Actions to display in the header (e.g., Approve/Reject buttons) */
  actions?: React.ReactNode;
  /** Back link label - defaults based on credential type */
  backLabel?: string;
  /** Content to display on the right side of the header (e.g., tabs) */
  rightContent?: React.ReactNode;
}

/** Map status to native Badge variants per design system guidelines */
function getStatusBadgeVariant(status: CredentialStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default'; // Primary green for approved
    case 'rejected':
    case 'expired':
      return 'destructive';
    case 'pending_review':
    case 'not_submitted':
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: CredentialStatus): string {
  switch (status) {
    case 'not_submitted':
      return 'Not Submitted';
    case 'pending_review':
      return 'Pending Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

export function CredentialDetailHeader({
  credentialType,
  credentialTable,
  status,
  expiresAt,
  submittedAt,
  onBack,
  showBackButton = true,
  actions,
  backLabel,
  rightContent,
}: CredentialDetailHeaderProps) {
  const isDriverCredential = credentialTable === 'driver_credentials';

  // Calculate days until expiration
  const daysUntilExpiration = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <div className="border-b bg-background">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: back button + title info */}
          <div className="flex items-center gap-3 flex-1">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label={backLabel || 'Go back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              {/* Title with status badge inline */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{credentialType.name}</h1>
                <Badge variant={getStatusBadgeVariant(status)}>
                  {getStatusLabel(status)}
                </Badge>
              </div>
              {/* Subtitle: scope + date info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{isDriverCredential ? 'Driver' : 'Vehicle'} Credential</span>
                {submittedAt && (
                  <>
                    <span>·</span>
                    <span>Submitted {new Date(submittedAt).toLocaleDateString()}</span>
                  </>
                )}
                {expiresAt && (
                  <>
                    <span>·</span>
                    <span className={isExpired ? 'text-destructive' : isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : ''}>
                      {isExpired
                        ? `Expired ${Math.abs(daysUntilExpiration!)} days ago`
                        : `Expires ${new Date(expiresAt).toLocaleDateString()}`}
                    </span>
                  </>
                )}
              </div>
              {/* Broker info if applicable */}
              {credentialType.broker && (
                <p className="text-sm text-muted-foreground">
                  Required by: <span className="font-medium">{credentialType.broker.name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Center: tabs */}
          {rightContent && (
            <div className="flex items-center justify-center">
              {rightContent}
            </div>
          )}

          {/* Right side: actions */}
          <div className="flex items-center justify-end gap-3 flex-1">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
