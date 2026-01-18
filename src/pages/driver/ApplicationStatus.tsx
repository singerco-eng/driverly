import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ApplicationStatusCard } from '@/components/features/apply/ApplicationStatusCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useWithdrawApplication } from '@/hooks/useApplications';
import { useCompany } from '@/hooks/useCompanies';
import { Card } from '@/components/ui/card';

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
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-6 text-center text-muted-foreground">Loading status...</Card>
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
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <ApplicationStatusCard
        status={driver.application_status}
        description={description}
        extra={
          driver.application_status === 'rejected' ? (
            <div className="text-sm text-muted-foreground space-y-1">
              {driver.rejection_reason && <p>Reason: {driver.rejection_reason}</p>}
              {driver.can_reapply_at && (
                <p>
                  You can re-apply on{' '}
                  {new Date(driver.can_reapply_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : null
        }
      />

      {driver.application_status === 'approved' && (
        <Button onClick={() => navigate('/driver')}>Continue to Portal</Button>
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
  );
}
