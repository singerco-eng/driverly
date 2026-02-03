import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { useCredentialHistory } from '@/hooks/useCredentials';
import { DocumentPreview } from '@/components/ui/document-preview';
import type { CredentialSubmissionHistory } from '@/types/credential';
import { Button } from '@/components/ui/button';

interface CredentialHistoryTabProps {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
}

/**
 * Displays submission history for a credential
 * Shows all past submissions with their review outcomes
 */
export function CredentialHistoryTab({
  credentialId,
  credentialTable,
}: CredentialHistoryTabProps) {
  const { data: history, isLoading } = useCredentialHistory(credentialId, credentialTable);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No submission history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your submissions and their review outcomes will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {history.length} submission{history.length !== 1 ? 's' : ''} in history
      </p>
      {history.map((entry, index) => (
        <HistoryEntry 
          key={entry.id} 
          entry={entry} 
          isLatest={index === 0}
        />
      ))}
    </div>
  );
}

interface HistoryEntryProps {
  entry: CredentialSubmissionHistory;
  isLatest: boolean;
}

function HistoryEntry({ entry, isLatest }: HistoryEntryProps) {
  const [expanded, setExpanded] = useState(false);

  const historyStatusMeta = {
    submitted: {
      icon: Clock,
      label: 'Pending Review',
      variant: 'secondary' as const,
      color: 'text-yellow-600',
    },
    pending_review: {
      icon: Clock,
      label: 'Pending Review',
      variant: 'secondary' as const,
      color: 'text-yellow-600',
    },
    approved: {
      icon: CheckCircle2,
      label: 'Approved',
      variant: 'default' as const,
      color: 'text-green-600',
    },
    rejected: {
      icon: XCircle,
      label: 'Rejected',
      variant: 'destructive' as const,
      color: 'text-red-600',
    },
    expired: {
      icon: AlertCircle,
      label: 'Expired',
      variant: 'outline' as const,
      color: 'text-orange-600',
    },
    superseded: {
      icon: AlertCircle,
      label: 'Superseded',
      variant: 'outline' as const,
      color: 'text-muted-foreground',
    },
  };

  const config =
    historyStatusMeta[entry.status as keyof typeof historyStatusMeta] || historyStatusMeta.submitted;
  const StatusIcon = config.icon;

  // Extract document URLs from submission data
  const documentUrls: string[] = [];
  if (entry.submission_data?.document_url) {
    documentUrls.push(entry.submission_data.document_url);
  }
  if (entry.submission_data?.document_urls?.length) {
    documentUrls.push(...entry.submission_data.document_urls);
  }

  const hasDocuments = documentUrls.length > 0;

  return (
    <Card className={isLatest ? 'border-primary/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${config.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                {isLatest && (
                  <Badge variant="outline" className="text-xs">Latest</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(entry.submitted_at).toLocaleDateString()} at{' '}
                {new Date(entry.submitted_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              {entry.reviewed_at && (
                <p className="text-sm text-muted-foreground">
                  Reviewed {new Date(entry.reviewed_at).toLocaleDateString()}
                </p>
              )}
              {entry.rejection_reason && (
                <p className="text-sm text-destructive mt-2">
                  <strong>Reason:</strong> {entry.rejection_reason}
                </p>
              )}
              {entry.review_notes && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Notes:</strong> {entry.review_notes}
                </p>
              )}
            </div>
          </div>

          {hasDocuments && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0"
            >
              {expanded ? (
                <>
                  Hide <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  View <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        {expanded && hasDocuments && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Submitted Documents</p>
            <DocumentPreview 
              paths={documentUrls} 
              layout="grid" 
              maxPreviewHeight={200} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
