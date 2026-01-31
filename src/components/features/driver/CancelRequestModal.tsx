import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Broker } from '@/types/broker';

interface CancelRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function CancelRequestModal({
  open,
  onOpenChange,
  broker,
  onConfirm,
  isSubmitting,
}: CancelRequestModalProps) {
  if (!broker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your request to join{' '}
            <span className="font-medium">{broker.name}</span>?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          You can request to join again at any time.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Request
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Canceling...' : 'Cancel Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

