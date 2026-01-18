import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SuspendDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

export function SuspendDriverModal({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: SuspendDriverModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Suspend Driver</ModalTitle>
          <ModalDescription>Provide a reason for suspension.</ModalDescription>
        </ModalHeader>

        <div className="space-y-2">
          <label className="text-sm text-white/80">Reason</label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Enter suspension reason..."
          />
        </div>

        <ModalFooter>
          <Button variant="modal-secondary" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isSubmitting}
            onClick={() => onConfirm(reason.trim())}
          >
            {isSubmitting ? 'Suspending...' : 'Suspend Driver'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
