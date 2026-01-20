import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
}: CredentialDetailHeaderProps) {
  const isDriverCredential = credentialTable === 'driver_credentials';
  const defaultBackLabel = isDriverCredential ? 'Back to Driver' : 'Back to Vehicle';

  // Calculate days until expiration
  const daysUntilExpiration = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <div className="space-y-4">
      {/* Back link - text style like driver detail page */}
      {showBackButton && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel || defaultBackLabel}
        </button>
      )}

      {/* Header row - title + status + actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          {/* Title with status badge inline */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{credentialType.name}</h1>
            <Badge variant={getStatusBadgeVariant(status)}>
              {getStatusLabel(status)}
            </Badge>
          </div>

          {/* Subtitle: scope + date info, kept minimal */}
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

        {/* Actions in top-right like driver detail page */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
