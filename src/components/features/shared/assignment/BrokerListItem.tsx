import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { getSourceTypeLabel } from '@/types/broker';

interface BrokerListItemProps {
  broker: any;
}

export function BrokerListItem({ broker }: BrokerListItemProps) {
  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={broker.id} className="mt-1" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{broker.name}</span>
          <Badge variant="outline" className="text-xs">
            {getSourceTypeLabel(broker.source_type)}
          </Badge>
          {broker.status !== 'active' && (
            <Badge variant="secondary" className="uppercase text-xs">
              {broker.status}
            </Badge>
          )}
        </div>
        {broker.code && <p className="text-sm text-muted-foreground">Code: {broker.code}</p>}
      </div>
    </label>
  );
}
