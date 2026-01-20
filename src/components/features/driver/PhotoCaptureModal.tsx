import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import {
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
  useSubmitDocument,
  useUploadCredentialDocument,
} from '@/hooks/useCredentials';

interface PhotoCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialWithDisplayStatus;
  driverId: string;
  onSuccess: () => void;
}

export function PhotoCaptureModal({
  open,
  onOpenChange,
  credential,
  driverId,
  onSuccess,
}: PhotoCaptureModalProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');

  const uploadDocument = useUploadCredentialDocument();
  const submitDocument = useSubmitDocument();
  const ensureDriverCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const isVehicle = credential.credentialType.category === 'vehicle';

  const resolveCredentialId = async (): Promise<string> => {
    if (credential.credential.id) return credential.credential.id;
    if (isVehicle) {
      const vehicleId = credential.credential.vehicle_id;
      if (!vehicleId) throw new Error('Missing vehicle id for credential.');
      return ensureVehicleCredential.mutateAsync({
        vehicleId,
        credentialTypeId: credential.credentialType.id,
        companyId: credential.credentialType.company_id,
      });
    }
    return ensureDriverCredential.mutateAsync({
      driverId,
      credentialTypeId: credential.credentialType.id,
      companyId: credential.credentialType.company_id,
    });
  };

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArray = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileArray]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (files.length === 0) return;

    const credentialId = await resolveCredentialId();
    const uploaded = await Promise.all(
      files.map((file) => uploadDocument.mutateAsync({ file, userId: user.id, credentialId })),
    );

    await submitDocument.mutateAsync({
      credentialId,
      credentialTable: isVehicle ? 'vehicle_credentials' : 'driver_credentials',
      documentUrls: uploaded,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    setFiles([]);
    setNotes('');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture {credential.credentialType.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {credential.credentialType.description && (
            <p className="text-sm text-muted-foreground">{credential.credentialType.description}</p>
          )}

          <div className="space-y-2">
            <Label>Camera</Label>
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload images</Label>
            <Input type="file" accept="image/*" multiple onChange={(event) => handleFilesSelected(event.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((url, index) => (
                <img key={url} src={url} alt={`Preview ${index + 1}`} className="h-32 w-full rounded-md object-cover border" />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitDocument.isPending || uploadDocument.isPending || files.length === 0}
          >
            {submitDocument.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
