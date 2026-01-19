import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Check } from 'lucide-react';

interface GoInactiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

const REASONS = [
  { value: 'Taking a break', label: 'Taking a break' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'Vehicle maintenance', label: 'Vehicle maintenance' },
  { value: 'Personal', label: 'Personal reasons' },
  { value: 'Other', label: 'Other' },
];

export function GoInactiveModal({ open, onOpenChange, onConfirm }: GoInactiveModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Moon className="w-6 h-6 text-muted-foreground" />
          </div>
          <DialogTitle>Go Inactive</DialogTitle>
          <DialogDescription className="text-center">
            Let us know why you're going offline. You can go active again anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason}
            className="w-full sm:w-auto gap-1"
          >
            <Check className="w-4 h-4" />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
