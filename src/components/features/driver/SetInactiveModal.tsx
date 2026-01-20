import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DriverVehicle, SetInactiveData } from '@/types/driverVehicle';
import { useSetVehicleInactive } from '@/hooks/useDriverVehicles';

interface SetInactiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: DriverVehicle;
}

export default function SetInactiveModal({ open, onOpenChange, vehicle }: SetInactiveModalProps) {
  const setInactive = useSetVehicleInactive();
  const [reason, setReason] = useState<SetInactiveData['reason']>('maintenance');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    await setInactive.mutateAsync({
      vehicleId: vehicle.id,
      data: { reason, details: details || undefined },
    });
    onOpenChange(false);
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Vehicle Inactive</DialogTitle>
          <DialogDescription>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vehicle will not be available for trips while inactive.
          </p>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as SetInactiveData['reason'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="repairs">Repairs needed</SelectItem>
                <SelectItem value="personal_use">Personal use</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Details (optional)</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={setInactive.isPending}>
            {setInactive.isPending ? 'Saving...' : 'Set Inactive'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
