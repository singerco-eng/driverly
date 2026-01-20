import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
  useSubmitDate,
} from '@/hooks/useCredentials';

interface DateEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialWithDisplayStatus;
  driverId: string;
  onSuccess: () => void;
}

export function DateEntryModal({
  open,
  onOpenChange,
  credential,
  driverId,
  onSuccess,
}: DateEntryModalProps) {
  const { user } = useAuth();
  const [enteredDate, setEnteredDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const submitDate = useSubmitDate();
  const ensureDriverCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

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

  const handleSubmit = async () => {
    if (!user || !enteredDate) return;
    const credentialId = await resolveCredentialId();

    await submitDate.mutateAsync({
      credentialId,
      credentialTable: isVehicle ? 'vehicle_credentials' : 'driver_credentials',
      enteredDate: enteredDate.toISOString().split('T')[0],
      notes: notes.trim() ? notes.trim() : undefined,
    });

    setEnteredDate(undefined);
    setNotes('');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Enter {credential.credentialType.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {credential.credentialType.description && (
            <p className="text-sm text-muted-foreground">{credential.credentialType.description}</p>
          )}
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker date={enteredDate} onDateChange={setEnteredDate} />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!enteredDate || submitDate.isPending}>
            {submitDate.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
