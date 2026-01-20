import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '@/contexts/AuthContext';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import {
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
  useSubmitDocument,
  useUploadCredentialDocument,
} from '@/hooks/useCredentials';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialWithDisplayStatus;
  driverId: string;
  onSuccess: () => void;
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  credential,
  driverId,
  onSuccess,
}: DocumentUploadModalProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  const uploadDocument = useUploadCredentialDocument();
  const submitDocument = useSubmitDocument();
  const ensureDriverCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const isVehicle = credential.credentialType.category === 'vehicle';

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArray = Array.from(newFiles);
    setFiles((prev) => [...prev, ...fileArray]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handleSubmit = async () => {
    if (!user) return;
    if (files.length === 0) return;

    const credentialId = await resolveCredentialId();
    const uploaded = await Promise.all(
      files.map((file) =>
        uploadDocument.mutateAsync({ file, userId: user.id, credentialId }),
      ),
    );

    await submitDocument.mutateAsync({
      credentialId,
      credentialTable: isVehicle ? 'vehicle_credentials' : 'driver_credentials',
      documentUrls: uploaded,
      notes: notes.trim() ? notes.trim() : undefined,
      driverExpirationDate: expirationDate
        ? expirationDate.toISOString().split('T')[0]
        : undefined,
    });

    setFiles([]);
    setNotes('');
    setExpirationDate(undefined);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload {credential.credentialType.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {credential.credentialType.description && (
            <p className="text-sm text-muted-foreground">{credential.credentialType.description}</p>
          )}

          <div className="space-y-2">
            <Label>Upload documents</Label>
            <Input
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
            <p className="text-xs text-muted-foreground">Accepted: PDF, JPG, PNG (max 50MB).</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected files</Label>
              <ul className="space-y-1 text-sm">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between">
                    <span className="truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {credential.credentialType.expiration_type === 'driver_specified' && (
            <div className="space-y-2">
              <Label>Expiration date</Label>
              <DatePicker date={expirationDate} onDateChange={setExpirationDate} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add any details that help the reviewer."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitDocument.isPending || uploadDocument.isPending || files.length === 0
            }
          >
            {submitDocument.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
