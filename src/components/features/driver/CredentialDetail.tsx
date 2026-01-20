import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import { getDocumentUrl } from '@/services/credentials';
import { SubmissionHistoryModal } from './SubmissionHistoryModal';

interface CredentialDetailProps {
  credential: CredentialWithDisplayStatus;
  onClose: () => void;
  onSubmit: () => void;
}

const statusLabels: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending_review: 'Pending Review',
  not_submitted: 'Not Submitted',
  expired: 'Expired',
  expiring: 'Expiring',
  awaiting: 'Awaiting Admin',
};

export function CredentialDetail({ credential, onClose, onSubmit }: CredentialDetailProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const { credentialType, displayStatus, credential: instance } = credential;

  const documentUrls =
    instance.document_urls ||
    (instance.document_url ? [instance.document_url] : []) ||
    [];

  const handleOpenDocument = async (path: string) => {
    setLoadingDoc(path);
    try {
      const url = await getDocumentUrl(path);
      window.open(url, '_blank');
    } finally {
      setLoadingDoc(null);
    }
  };

  const showSubmit =
    credential.canSubmit &&
    ['not_submitted', 'rejected', 'expired', 'expiring'].includes(displayStatus);

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {credentialType.name}
              <Badge variant="outline">{statusLabels[displayStatus] ?? displayStatus}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {displayStatus === 'rejected' && instance.rejection_reason && (
              <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Rejection reason: {instance.rejection_reason}
              </Card>
            )}

            {credentialType.description && (
              <Card className="p-4 text-sm text-muted-foreground">
                {credentialType.description}
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 space-y-2">
                <h4 className="text-sm font-semibold">Current Submission</h4>
                {instance.submitted_at ? (
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(instance.submitted_at).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No submission yet.</p>
                )}
                {documentUrls.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Documents</span>
                    <div className="flex flex-wrap gap-2">
                      {documentUrls.map((path, index) => (
                        <Button
                          key={`${path}-${index}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDocument(path)}
                          disabled={loadingDoc === path}
                        >
                          {loadingDoc === path ? 'Opening...' : `View Document ${index + 1}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {instance.signature_data && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Signature</span>
                    {instance.signature_data.type === 'typed' ? (
                      <p className="text-sm font-semibold">{instance.signature_data.value}</p>
                    ) : (
                      <img
                        src={instance.signature_data.value}
                        alt="Signature"
                        className="h-24 w-auto border rounded"
                      />
                    )}
                  </div>
                )}
                {instance.form_data && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Form Data</span>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(instance.form_data).map(([key, value]) => (
                        <li key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="text-muted-foreground">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {instance.entered_date && (
                  <p className="text-sm text-muted-foreground">
                    Entered date: {new Date(instance.entered_date).toLocaleDateString()}
                  </p>
                )}
                {instance.driver_expiration_date && (
                  <p className="text-sm text-muted-foreground">
                    Driver-specified expiration:{' '}
                    {new Date(instance.driver_expiration_date).toLocaleDateString()}
                  </p>
                )}
              </Card>

              <Card className="p-4 space-y-2">
                <h4 className="text-sm font-semibold">Status Details</h4>
                <p className="text-sm text-muted-foreground">
                  Status: {statusLabels[displayStatus] ?? displayStatus}
                </p>
                {instance.reviewed_at && (
                  <p className="text-sm text-muted-foreground">
                    Reviewed {new Date(instance.reviewed_at).toLocaleString()}
                  </p>
                )}
                {instance.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Expires {new Date(instance.expires_at).toLocaleDateString()}
                  </p>
                )}
                {credential.daysUntilExpiration !== null && (
                  <p className="text-sm text-muted-foreground">
                    Days until expiration: {credential.daysUntilExpiration}
                  </p>
                )}
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                View Submission History
              </Button>
              {showSubmit && (
                <Button onClick={onSubmit}>
                  {displayStatus === 'not_submitted'
                    ? 'Submit'
                    : displayStatus === 'rejected'
                      ? 'Resubmit'
                      : 'Renew'}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {instance.id && (
        <SubmissionHistoryModal
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          credentialId={instance.id}
          credentialTable={
            credentialType.category === 'vehicle' ? 'vehicle_credentials' : 'driver_credentials'
          }
          credentialName={credentialType.name}
        />
      )}
    </>
  );
}
