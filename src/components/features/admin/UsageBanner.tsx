import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { OperatorUsage } from '@/types/billing';

interface UsageBannerProps {
  usage: OperatorUsage | undefined;
}

export function UsageBanner({ usage }: UsageBannerProps) {
  const navigate = useNavigate();

  if (!usage) return null;

  if (usage.is_over_limit) {
    const overBy = usage.operator_count - (usage.operator_limit ?? 0);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Over plan limit:</strong> You have {overBy} more operator
            {overBy !== 1 ? 's' : ''} than your plan allows. Remove operators or
            upgrade to add new ones.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/billing')}
            className="ml-4 shrink-0"
          >
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (usage.is_at_warning_threshold && usage.operator_limit) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            <strong>Approaching limit:</strong> You're using {usage.operator_count} of{' '}
            {usage.operator_limit} operators ({usage.operator_percentage}%).
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/billing')}
            className="ml-4 shrink-0"
          >
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
