import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApplicationStatusCard } from '@/components/features/apply/ApplicationStatusCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useWithdrawApplication } from '@/hooks/useApplications';
import { useCompany } from '@/hooks/useCompanies';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock } from 'lucide-react';

export default function ApplicationStatus() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: driver, isLoading } = useDriverByUserId(user?.id);
  const { data: company } = useCompany(profile?.company_id || '');
  const withdrawMutation = useWithdrawApplication();

  const description = useMemo(() => {
    if (!driver) return '';
    if (driver.application_status === 'approved') {
      return 'Your application has been approved. You can continue to the driver portal.';
    }
    if (driver.application_status === 'rejected') {
      return 'Your application was not approved at this time.';
    }
    if (driver.application_status === 'under_review') {
      return 'Your application is currently under review by our team.';
    }
    return 'Your application has been received and is pending review.';
  }, [driver]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Application Status</h1>
          <p className="text-sm text-muted-foreground">
            Track the progress of your driver application.
          </p>
        </div>
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6')}>
          <div className="flex items-center gap-3 justify-center text-muted-foreground">
            <Clock className="w-5 h-5 animate-pulse" />
            Loading status...
          </div>
        </Card>
      </div>
    );
  }

  if (!driver) {
    if (company?.slug) {
      return <Navigate to={`/apply/${company.slug}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  const canWithdraw =
    driver.application_status === 'pending' || driver.application_status === 'under_review';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Application Status</h1>
        <p className="text-sm text-muted-foreground">
          Track the progress of your driver application.
        </p>
      </div>

      <ApplicationStatusCard
        status={driver.application_status}
        description={description}
        extra={
          driver.application_status === 'rejected' ? (
            <div className="text-sm text-muted-foreground space-y-1 mt-3 p-3 bg-muted/30 rounded-lg">
              {driver.rejection_reason && <p>Reason: {driver.rejection_reason}</p>}
              {driver.can_reapply_at && (
                <p>
                  You can re-apply on{' '}
                  <span className="font-medium">
                    {new Date(driver.can_reapply_at).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        {driver.application_status === 'approved' && (
          <Button onClick={() => navigate('/driver')} className="gap-2">
            Continue to Portal
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        {canWithdraw && (
          <Button
            variant="outline"
            onClick={() => withdrawMutation.mutate(driver.id)}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
          </Button>
        )}
      </div>
    </div>
  );
}
