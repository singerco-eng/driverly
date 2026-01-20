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
import { useVerifyCredential } from '@/hooks/useCredentialReview';
import type { CredentialForReview } from '@/types/credentialReview';

interface VerifyCredentialModalProps {
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

export function VerifyCredentialModal({
  open,
  onOpenChange,
  credential,
}: VerifyCredentialModalProps) {
  const verifyCredential = useVerifyCredential();
  const [verificationNotes, setVerificationNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const defaultExpiration = useMemo(() => getDefaultExpiration(credential), [credential]);

  useEffect(() => {
    if (open) {
      setVerificationNotes('');
      setExpiresAt(defaultExpiration);
      setInternalNotes('');
    }
  }, [open, defaultExpiration]);

  const handleSubmit = async () => {
    if (!credential || !verificationNotes.trim()) return;
    await verifyCredential.mutateAsync({
      credentialId: credential.id,
      credentialTable: credential.credentialTable,
      data: {
        verificationNotes: verificationNotes.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        internalNotes: internalNotes || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Verify Credential</DialogTitle>
          <DialogDescription>
            Mark {credential?.credentialType.name || 'this credential'} as verified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verificationNotes">Verification Notes *</Label>
            <Textarea
              id="verificationNotes"
              value={verificationNotes}
              onChange={(event) => setVerificationNotes(event.target.value)}
              rows={3}
              placeholder="Document how this was verified..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
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
            disabled={verifyCredential.isPending || !verificationNotes.trim() || !credential}
          >
            {verifyCredential.isPending ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
