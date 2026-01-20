import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApproveCredential } from '@/hooks/useCredentialReview';
import type { CredentialForReview } from '@/types/credentialReview';

interface ApproveCredentialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialForReview | null;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDefaultExpiration(credential: CredentialForReview | null) {
  if (!credential) return '';
  if (credential.expiresAt) return toDateInput(credential.expiresAt);

  const type = credential.credentialType;
  if (type.expiration_type === 'fixed_interval' && type.expiration_interval_days) {
    const date = new Date();
    date.setDate(date.getDate() + type.expiration_interval_days);
    return toDateInput(date.toISOString());
  }

  return '';
}

export function ApproveCredentialModal({
  open,
  onOpenChange,
  credential,
}: ApproveCredentialModalProps) {
  const approveCredential = useApproveCredential();
  const [expiresAt, setExpiresAt] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const defaultExpiration = useMemo(() => getDefaultExpiration(credential), [credential]);

  useEffect(() => {
    if (open) {
      setExpiresAt(defaultExpiration);
      setReviewNotes('');
      setInternalNotes('');
    }
  }, [open, defaultExpiration]);

  const handleSubmit = async () => {
    if (!credential) return;
    await approveCredential.mutateAsync({
      credentialId: credential.id,
      credentialTable: credential.credentialTable,
      data: {
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        reviewNotes: reviewNotes || undefined,
        internalNotes: internalNotes || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve Credential</DialogTitle>
          <DialogDescription>
            Approve {credential?.credentialType.name || 'credential'} and set expiration details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Review Notes (visible to driver)</Label>
            <Textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              rows={3}
              placeholder="Add any notes for the driver..."
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
          <Button onClick={handleSubmit} disabled={approveCredential.isPending || !credential}>
            {approveCredential.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
