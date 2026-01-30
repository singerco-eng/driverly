import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useBillingPlans, useCreateCheckoutSession } from '@/hooks/useBilling';
import type { BillingPlan } from '@/types/billing';

interface UpgradeModalProps {
  companyId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerLabel?: string;
}

export function UpgradeModal({
  companyId,
  open,
  onOpenChange,
  showTrigger = true,
  triggerLabel = 'View Plans',
}: UpgradeModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: plans } = useBillingPlans();
  const checkout = useCreateCheckoutSession();

  const isControlled = typeof open === 'boolean';
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const paidPlans = useMemo(
    () => (plans ?? []).filter((p) => p.slug !== 'free' && !p.is_contact_sales),
    [plans]
  );

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleSelect = (plan: BillingPlan) => {
    const priceId = isAnnual
      ? plan.stripe_price_id_annual
      : plan.stripe_price_id_monthly;

    if (priceId) {
      checkout.mutate({
        companyId,
        priceId,
        interval: isAnnual ? 'annual' : 'monthly',
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button>{triggerLabel}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-4">
          <Label className={cn(!isAnnual && 'font-semibold')}>Monthly</Label>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <Label className={cn(isAnnual && 'font-semibold')}>
            Annual <span className="text-green-600">(Save 17%)</span>
          </Label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {paidPlans.map((plan) => {
            const price = isAnnual ? plan.price_annual_cents : plan.price_monthly_cents;
            const monthlyEquivalent = isAnnual
              ? Math.round(plan.price_annual_cents / 12)
              : plan.price_monthly_cents;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  plan.slug === 'growth' && 'border-primary ring-2 ring-primary'
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {plan.slug === 'growth' && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Popular
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">
                      {formatPrice(monthlyEquivalent)}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(price)} billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {plan.operator_limit ?? 'Unlimited'} operators
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      All core features
                    </li>
                  </ul>

                  <Button
                    className="w-full"
                    onClick={() => handleSelect(plan)}
                    disabled={checkout.isPending}
                  >
                    {checkout.isPending ? 'Redirecting...' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
