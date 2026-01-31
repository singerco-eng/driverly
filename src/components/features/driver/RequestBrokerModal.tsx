import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import type { Broker } from '@/types/broker';
import { getSourceTypeLabel } from '@/types/broker';

interface RequestBrokerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
  credentialCount?: number;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function RequestBrokerModal({
  open,
  onOpenChange,
  broker,
  credentialCount,
  onConfirm,
  isSubmitting,
}: RequestBrokerModalProps) {
  if (!broker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request to Join</DialogTitle>
          <DialogDescription>
            You're requesting to join:
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            {broker.logo_url ? (
              <img src={broker.logo_url} alt={broker.name} className="w-8 h-8 object-contain" />
            ) : (
              <Building2 className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-medium">{broker.name}</div>
            <div className="text-xs text-muted-foreground">
              {getSourceTypeLabel(broker.source_type)}
              {broker.service_states.length > 0 && ` · ${broker.service_states.join(', ')}`}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
          <p>What happens next:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Your request will be sent to your admin</li>
            <li>They will review and approve or deny your request</li>
            <li>
              Once approved, you&apos;ll need to complete{' '}
              <Badge variant="outline">
                {credentialCount ?? 'additional'} credential{credentialCount === 1 ? '' : 's'}
              </Badge>
            </li>
            <li>After credentials are approved, you can accept trips</li>
          </ol>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

