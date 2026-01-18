import { useEffect, useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useEndAssignmentEarly } from '@/hooks/useVehicleAssignments';

interface EndAssignmentEarlyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  scheduledEndDate: string;
  vehicleName: string;
}

export function EndAssignmentEarlyModal({
  open,
  onOpenChange,
  assignmentId,
  scheduledEndDate,
  vehicleName,
}: EndAssignmentEarlyModalProps) {
  const { toast } = useToast();
  const endAssignmentEarly = useEndAssignmentEarly();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const scheduledEnd = useMemo(() => new Date(scheduledEndDate), [scheduledEndDate]);
  const canSubmit = reason.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await endAssignmentEarly.mutateAsync({ assignmentId, reason: reason.trim() });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to end assignment early';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>End Borrowed Assignment Early</DialogTitle>
          <DialogDescription>
            {vehicleName} is scheduled to end on {scheduledEnd.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Ending today will immediately make this vehicle available for reassignment.
          </div>
          <div>
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this assignment ending early?"
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || endAssignmentEarly.isPending}>
            {endAssignmentEarly.isPending ? 'Ending...' : 'End Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
