import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import type { DriverVehicle, RetireVehicleData } from '@/types/driverVehicle';
import { useRetireVehicle } from '@/hooks/useDriverVehicles';

interface RetireVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: DriverVehicle;
  driverId: string;
}

export default function RetireVehicleModal({
  open,
  onOpenChange,
  vehicle,
  driverId,
}: RetireVehicleModalProps) {
  const retireVehicle = useRetireVehicle();
  const [reason, setReason] = useState<RetireVehicleData['reason']>('sold');

  const handleSubmit = async () => {
    await retireVehicle.mutateAsync({ vehicleId: vehicle.id, driverId, data: { reason } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Retire Vehicle</DialogTitle>
          <DialogDescription>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This action is permanent and cannot be undone.
            </div>
            <ul className="mt-2 list-disc pl-5 text-xs text-destructive/90">
              <li>Vehicle will be removed from your active list</li>
              <li>Vehicle credentials will be archived</li>
              <li>Historical records will be preserved</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as RetireVehicleData['reason'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="totaled">Totaled/Damaged</SelectItem>
                <SelectItem value="no_longer_using">No longer using</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={retireVehicle.isPending}>
            {retireVehicle.isPending ? 'Retiring...' : 'Retire Vehicle'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
