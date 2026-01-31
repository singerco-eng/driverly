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
import { Building2, Zap } from 'lucide-react';
import type { Broker } from '@/types/broker';
import { getSourceTypeLabel } from '@/types/broker';

interface JoinBrokerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
  credentialCount?: number;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function JoinBrokerModal({
  open,
  onOpenChange,
  broker,
  credentialCount,
  onConfirm,
  isSubmitting,
}: JoinBrokerModalProps) {
  if (!broker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Join Trip Source</DialogTitle>
          <DialogDescription>
            You&apos;re joining:
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

        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4" />
            <span className="font-medium">This trip source allows instant signup</span>
          </div>
          <p>After joining:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>You&apos;ll be immediately assigned to this trip source</li>
            <li>
              Complete{' '}
              <Badge variant="outline">
                {credentialCount ?? 'additional'} credential{credentialCount === 1 ? '' : 's'}
              </Badge>{' '}
              to start accepting trips
            </li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Joining...' : 'Join Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

