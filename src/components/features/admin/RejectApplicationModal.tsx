import { useMemo, useState } from 'react';
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

const REJECTION_REASONS = [
  'Does not meet requirements',
  'Incomplete information',
  'Failed background check',
  'License issue',
  'Other',
];

interface RejectApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  onReject: (reason: string, details?: string) => void;
  isSubmitting?: boolean;
}

export function RejectApplicationModal({
  open,
  onOpenChange,
  applicantName,
  onReject,
  isSubmitting,
}: RejectApplicationModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const showDetails = useMemo(() => reason === 'Other', [reason]);

  const handleSubmit = () => {
    if (!reason) return;
    onReject(reason, details || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject application</DialogTitle>
          <DialogDescription>
            Select a reason for rejecting {applicantName}'s application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showDetails && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add details (optional)"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reason || isSubmitting}>
            {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
