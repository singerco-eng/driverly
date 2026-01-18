import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUnassignVehicle } from '@/hooks/useVehicleAssignments';

interface UnassignVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  vehicleName: string;
  driverName: string;
  isOnlyVehicle: boolean;
  isPrimary?: boolean;
}

const unassignReasons = [
  'Vehicle needs maintenance',
  'Driver no longer needs',
  'Driver terminated',
  'Reassigning',
  'Other',
];

export function UnassignVehicleModal({
  open,
  onOpenChange,
  assignmentId,
  vehicleName,
  driverName,
  isOnlyVehicle,
  isPrimary,
}: UnassignVehicleModalProps) {
  const { toast } = useToast();
  const unassignVehicle = useUnassignVehicle();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setNotes('');
    }
  }, [open]);

  const canSubmit = reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await unassignVehicle.mutateAsync({
        assignmentId,
        data: {
          reason,
          notes: notes.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to unassign vehicle';
      toast({
        title: 'Unassign failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Unassign Vehicle</DialogTitle>
          <DialogDescription>
            Unassign {vehicleName} from {driverName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {unassignReasons.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="mt-2"
            />
          </div>

          {(isOnlyVehicle || isPrimary) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {isOnlyVehicle
                ? `${driverName} will have no vehicle after this unassignment.`
                : 'This is the primary vehicle. Another vehicle will be set as primary if available.'}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || unassignVehicle.isPending}>
            {unassignVehicle.isPending ? 'Unassigning...' : 'Unassign Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
