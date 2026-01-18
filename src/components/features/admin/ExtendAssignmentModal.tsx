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
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { useExtendAssignment } from '@/hooks/useVehicleAssignments';

interface ExtendAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  currentEndDate: string;
  vehicleName: string;
}

export function ExtendAssignmentModal({
  open,
  onOpenChange,
  assignmentId,
  currentEndDate,
  vehicleName,
}: ExtendAssignmentModalProps) {
  const { toast } = useToast();
  const extendAssignment = useExtendAssignment();
  const [newEndDate, setNewEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setNewEndDate(undefined);
      setReason('');
    }
  }, [open]);

  const currentEnd = useMemo(() => new Date(currentEndDate), [currentEndDate]);
  const isValidDate = newEndDate && newEndDate.getTime() > currentEnd.getTime();

  const handleSubmit = async () => {
    if (!isValidDate || !newEndDate) return;
    try {
      await extendAssignment.mutateAsync({
        assignmentId,
        data: {
          new_ends_at: newEndDate.toISOString(),
          reason: reason.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to extend assignment';
      toast({
        title: 'Extension failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Extend Borrowed Assignment</DialogTitle>
          <DialogDescription>
            {vehicleName} is scheduled to end on {currentEnd.toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">New End Date</label>
            <DatePicker date={newEndDate} onDateChange={setNewEndDate} />
            {!isValidDate && newEndDate && (
              <p className="text-xs text-destructive mt-1">New end date must be after current end date.</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for extension..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidDate || extendAssignment.isPending}>
            {extendAssignment.isPending ? 'Extending...' : 'Extend Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
