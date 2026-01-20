import { useCredentialHistory } from '@/hooks/useCredentials';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Eye,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CredentialHistoryTimelineProps {
  credentialId: string | undefined;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
}

const statusIcons: Record<string, React.ElementType> = {
  pending_review: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  submitted: Upload,
  reviewed: Eye,
};

const statusColors: Record<string, string> = {
  pending_review: 'text-yellow-400 bg-yellow-500/20',
  approved: 'text-green-400 bg-green-500/20',
  rejected: 'text-red-400 bg-red-500/20',
  submitted: 'text-blue-400 bg-blue-500/20',
  reviewed: 'text-purple-400 bg-purple-500/20',
};

const statusLabels: Record<string, string> = {
  pending_review: 'Submitted for Review',
  approved: 'Approved',
  rejected: 'Rejected',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
};

export function CredentialHistoryTimeline({
  credentialId,
  credentialTable,
}: CredentialHistoryTimelineProps) {
  const { data: history, isLoading } = useCredentialHistory(credentialId, credentialTable);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!credentialId || !history?.length) {
    return (
      <div className="text-center py-8">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No submission history yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          History will appear here after your first submission
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-6">
        {history.map((entry, index) => {
          const Icon = statusIcons[entry.status] || Clock;
          const colorClass = statusColors[entry.status] || 'text-gray-400 bg-gray-500/20';
          const label = statusLabels[entry.status] || entry.status;

          return (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  colorClass
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.submitted_at || entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  {index === 0 && (
                    <Badge variant="outline" className="shrink-0">Latest</Badge>
                  )}
                </div>

                {/* Reviewed info */}
                {entry.reviewed_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Reviewed on {new Date(entry.reviewed_at).toLocaleString()}
                  </p>
                )}

                {/* Rejection reason */}
                {entry.status === 'rejected' && entry.rejection_reason && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">
                      <span className="font-medium">Reason:</span> {entry.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Review notes */}
                {entry.review_notes && (
                  <div className="mt-2 p-2 rounded bg-muted">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {entry.review_notes}
                    </p>
                  </div>
                )}

                {/* Expiration info */}
                {entry.expires_at && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Expires: {new Date(entry.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
