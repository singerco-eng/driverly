import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { driverStatusConfig } from '@/lib/status-configs';
import type { SourceContext } from './types';

interface DriverListItemProps {
  driver: any;
  context: SourceContext;
  isMultiSelect?: boolean;
}

export function DriverListItem({ driver, context, isMultiSelect }: DriverListItemProps) {
  const activeCount = driver.active_assignments?.length || 0;
  const isEligible =
    context.type === 'broker'
      ? driver.status === 'active' &&
        (context.broker.accepted_employment_types.length === 0 ||
          context.broker.accepted_employment_types.includes(driver.employment_type))
      : true;

  const statusConfig = driverStatusConfig[driver.status as keyof typeof driverStatusConfig];

  const content = (
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{driver.user?.full_name}</span>
        {driver.status !== 'active' && statusConfig && (
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        )}
        {context.type === 'broker' && (
          <Badge
            variant={isEligible ? 'default' : 'outline'}
            className={
              isEligible
                ? 'bg-green-500/20 text-green-600 border-green-500/30 text-xs'
                : 'text-muted-foreground text-xs'
            }
          >
            {isEligible ? 'Eligible' : 'Not Eligible'}
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="uppercase">{driver.employment_type}</span>
        <span> · </span>
        {driver.user?.email}
        {driver.onboarding_completed_at && (
          <span className="text-primary"> · Onboarded</span>
        )}
      </p>
      {!isMultiSelect && (
        <p className="text-sm text-muted-foreground">
          {activeCount === 0
            ? 'No vehicle assigned'
            : `${activeCount} active vehicle${activeCount === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );

  if (isMultiSelect) {
    return content;
  }

  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={driver.id} className="mt-1" />
      {content}
    </label>
  );
}
