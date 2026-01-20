import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRejectCredential } from '@/hooks/useCredentialReview';
import type { CredentialForReview } from '@/types/credentialReview';

interface RejectCredentialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialForReview | null;
}

export function RejectCredentialModal({
  open,
  onOpenChange,
  credential,
}: RejectCredentialModalProps) {
  const rejectCredential = useRejectCredential();
  const [rejectionReason, setRejectionReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (open) {
      setRejectionReason('');
      setInternalNotes('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!credential || !rejectionReason.trim()) return;
    await rejectCredential.mutateAsync({
      credentialId: credential.id,
      credentialTable: credential.credentialTable,
      data: {
        rejectionReason: rejectionReason.trim(),
        internalNotes: internalNotes || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reject Credential</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting {credential?.credentialType.name || 'this credential'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={4}
              placeholder="Explain what needs to be fixed..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes (staff only)</Label>
            <Textarea
              id="internalNotes"
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              rows={3}
              placeholder="Add internal notes for the team..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rejectCredential.isPending || !rejectionReason.trim() || !credential}
          >
            {rejectCredential.isPending ? 'Rejecting...' : 'Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
