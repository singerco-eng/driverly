import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubscriptionWithPlan } from '@/types/billing';

interface CurrentPlanCardProps {
  subscription: SubscriptionWithPlan | null | undefined;
  isLoading: boolean;
  onManage: () => void;
  isManaging: boolean;
}

export function CurrentPlanCard({
  subscription,
  isLoading,
  onManage,
  isManaging,
}: CurrentPlanCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  const plan = subscription?.plan;
  const isFree = plan?.slug === 'free';
  const price =
    subscription?.billing_interval === 'annual'
      ? plan?.price_annual_cents
      : plan?.price_monthly_cents;

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Current Plan</CardTitle>
        {!isFree && (
          <Button variant="outline" size="sm" onClick={onManage} disabled={isManaging}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Manage
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">{plan?.name}</span>
          {subscription?.cancel_at_period_end && (
            <Badge variant="destructive">Canceling</Badge>
          )}
        </div>

        {!isFree && price !== undefined && (
          <p className="text-muted-foreground">
            {formatPrice(price)}/{subscription?.billing_interval === 'annual' ? 'year' : 'month'}
          </p>
        )}

        {subscription?.current_period_end && !isFree && (
          <p className="text-sm text-muted-foreground">
            {subscription.cancel_at_period_end ? 'Ends' : 'Renews'} on{' '}
            {format(new Date(subscription.current_period_end), 'MMMM d, yyyy')}
          </p>
        )}

        {isFree && (
          <p className="text-sm text-muted-foreground">
            Limited to {plan?.operator_limit} operators
          </p>
        )}
      </CardContent>
    </Card>
  );
}
