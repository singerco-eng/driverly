import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { OperatorUsageBar } from '@/components/features/admin/OperatorUsageBar';
import {
  useOperatorUsage,
  useSetNeverBill,
  useSetOperatorLimitOverride,
  useSubscription,
} from '@/hooks/useBilling';
import { updateSubscription } from '@/services/billing';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

interface CompanyBillingTabProps {
  companyId: string;
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  past_due: 'destructive',
  canceled: 'secondary',
  trialing: 'outline',
  paused: 'secondary',
  never_bill: 'outline',
};

export function CompanyBillingTab({ companyId }: CompanyBillingTabProps) {
  const { toast } = useToast();
  const { data: subscription, isLoading } = useSubscription(companyId);
  const { data: usage } = useOperatorUsage(companyId);
  const setNeverBill = useSetNeverBill();
  const setOperatorLimitOverride = useSetOperatorLimitOverride();

  const [overrideInput, setOverrideInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (subscription) {
      setOverrideInput(
        subscription.operator_limit_override !== null
          ? String(subscription.operator_limit_override)
          : ''
      );
      setNotes(subscription.admin_notes ?? '');
    }
  }, [subscription]);

  const saveNotes = useMutation({
    mutationFn: async (value: string) => {
      if (!subscription) return;
      await updateSubscription(subscription.id, { admin_notes: value });
    },
    onSuccess: () => {
      toast({ title: 'Admin notes updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  const statusVariant = useMemo(
    () => statusVariantMap[subscription?.status ?? 'active'] ?? 'outline',
    [subscription?.status]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing Details</h3>
        <p className="text-sm text-muted-foreground">
          Manage plan overrides and billing status for this company.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold">{subscription?.plan?.name ?? '—'}</span>
              <Badge variant={statusVariant}>{subscription?.status ?? 'unknown'}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Interval: {subscription?.billing_interval ?? '—'}
            </div>
            {subscription?.current_period_end && (
              <div className="text-sm text-muted-foreground">
                Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operator Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {usage ? <OperatorUsageBar usage={usage} showBreakdown /> : '—'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Never Bill</div>
              <div className="text-sm text-muted-foreground">
                Bypass limits and billing for test accounts.
              </div>
            </div>
            <Switch
              checked={subscription?.never_bill ?? false}
              onCheckedChange={(checked) => {
                setNeverBill.mutate({ companyId, neverBill: checked });
              }}
              disabled={setNeverBill.isPending}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="text-sm font-medium">Operator Limit Override</label>
              <div className="text-sm text-muted-foreground mb-2">
                Leave blank to use plan default.
              </div>
              <Input
                type="number"
                placeholder="e.g. 75"
                value={overrideInput}
                onChange={(event) => setOverrideInput(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const value = overrideInput.trim();
                const parsed = value === '' ? null : Number(value);
                if (value !== '' && Number.isNaN(parsed)) {
                  toast({
                    title: 'Invalid number',
                    description: 'Enter a numeric operator limit or leave blank.',
                    variant: 'destructive',
                  });
                  return;
                }
                setOperatorLimitOverride.mutate({ companyId, limit: parsed });
              }}
              disabled={setOperatorLimitOverride.isPending}
            >
              Save Override
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add notes about billing arrangements or history."
          />
          <Button
            variant="outline"
            onClick={() => saveNotes.mutate(notes)}
            disabled={saveNotes.isPending}
          >
            Save Notes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
