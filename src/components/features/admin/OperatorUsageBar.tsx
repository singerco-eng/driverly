import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { OperatorUsage } from '@/types/billing';

interface OperatorUsageBarProps {
  usage: OperatorUsage;
  showBreakdown?: boolean;
  className?: string;
}

export function OperatorUsageBar({
  usage,
  showBreakdown,
  className,
}: OperatorUsageBarProps) {
  const isUnlimited = usage.operator_limit === null;
  const percentage = isUnlimited ? 0 : usage.operator_percentage;

  const getProgressColor = () => {
    if (usage.is_over_limit) return 'bg-destructive';
    if (usage.is_at_warning_threshold) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {usage.operator_count}
          {!isUnlimited && ` / ${usage.operator_limit}`} operators
        </span>
        {!isUnlimited && (
          <span className="text-muted-foreground">{percentage}%</span>
        )}
        {isUnlimited && (
          <span className="text-muted-foreground">Unlimited</span>
        )}
      </div>

      {!isUnlimited && (
        <Progress
          value={Math.min(percentage, 100)}
          className="h-2"
          indicatorClassName={getProgressColor()}
        />
      )}

      {showBreakdown && (
        <p className="text-xs text-muted-foreground">
          {usage.driver_count} driver{usage.driver_count !== 1 ? 's' : ''} · {usage.vehicle_count}{' '}
          vehicle{usage.vehicle_count !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
