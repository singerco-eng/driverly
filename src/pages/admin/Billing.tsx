import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMySubscription, useOperatorUsage, useCreatePortalSession } from '@/hooks/useBilling';
import { OperatorUsageBar } from '@/components/features/admin/OperatorUsageBar';
import { CurrentPlanCard } from '@/components/features/admin/CurrentPlanCard';
import { UpgradeModal } from '@/components/features/admin/UpgradeModal';
import { UsageBanner } from '@/components/features/admin/UsageBanner';

export default function Billing() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useAuth();

  const { data: subscription, isLoading: subLoading } = useMySubscription();
  const { data: usage, isLoading: usageLoading } = useOperatorUsage();
  const createPortal = useCreatePortalSession();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Subscription updated!', description: 'Your plan is now active.' });
    } else if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Checkout canceled', description: 'No changes were made.' });
    }
  }, [searchParams, toast]);

  const handleManagePlan = () => {
    if (profile?.company_id) {
      createPortal.mutate(profile.company_id);
    }
  };

  const isLoading = subLoading || usageLoading;
  const isPaid = subscription?.plan?.slug ? subscription.plan.slug !== 'free' : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Billing</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your subscription and view usage
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <UsageBanner usage={usage} />

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <CurrentPlanCard
                subscription={subscription}
                isLoading={isLoading}
                onManage={handleManagePlan}
                isManaging={createPortal.isPending}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Operator Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  {usage && <OperatorUsageBar usage={usage} showBreakdown />}
                </CardContent>
              </Card>
            </div>
          )}

          {!isPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrade Your Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Get more operators and unlock additional features.
                </p>
                <UpgradeModal companyId={profile?.company_id ?? ''} />
              </CardContent>
            </Card>
          )}

          {isPaid && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Subscription</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Update payment method, change plan, or view invoices.
                </p>
                <Button onClick={handleManagePlan} disabled={createPortal.isPending}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Billing Portal
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
