import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCredentialHistory } from '@/hooks/useCredentials';
import { getDocumentUrl } from '@/services/credentials';

interface SubmissionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  credentialName: string;
}

const statusStyles: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
};

export function SubmissionHistoryModal({
  open,
  onOpenChange,
  credentialId,
  credentialTable,
  credentialName,
}: SubmissionHistoryModalProps) {
  const { data, isLoading } = useCredentialHistory(credentialId, credentialTable);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  const handleOpenDocument = async (path: string) => {
    setLoadingDoc(path);
    try {
      const url = await getDocumentUrl(path);
      window.open(url, '_blank');
    } finally {
      setLoadingDoc(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submission History - {credentialName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
          {!isLoading && (!data || data.length === 0) && (
            <Card className="p-4 text-sm text-muted-foreground">
              No submission history yet.
            </Card>
          )}
          {data?.map((entry) => {
            const documentUrls = (entry.submission_data?.document_urls ||
              (entry.submission_data?.document_url ? [entry.submission_data.document_url] : [])) as
              | string[]
              | undefined;

            return (
              <Card key={entry.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusStyles[entry.status] || ''}>
                    {entry.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(entry.submitted_at).toLocaleString()}
                  </span>
                  {entry.reviewed_at && (
                    <span className="text-xs text-muted-foreground">
                      Reviewed {new Date(entry.reviewed_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {entry.rejection_reason && (
                  <p className="text-sm text-red-600">Rejection: {entry.rejection_reason}</p>
                )}
                {documentUrls && documentUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {documentUrls.map((path, idx) => (
                      <Button
                        key={`${entry.id}-${idx}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDocument(path)}
                        disabled={loadingDoc === path}
                      >
                        {loadingDoc === path ? 'Opening...' : `View Document ${idx + 1}`}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
