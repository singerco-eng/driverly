import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useCompany } from '@/hooks/useCompanies';
import { useOnboardingStatus, useToggleDriverActive } from '@/hooks/useOnboarding';
import { GettingStartedChecklist } from '@/components/features/driver/GettingStartedChecklist';
import { DriverStatusToggle } from '@/components/features/driver/DriverStatusToggle';
import { WelcomeBox } from '@/components/features/driver/WelcomeBox';
import { Sparkles } from 'lucide-react';

export default function DriverDashboard() {
  const { user, profile } = useAuth();
  const { data: driver, isLoading } = useDriverByUserId(user?.id);
  const { data: company } = useCompany(profile?.company_id || '');
  const { data: onboardingStatus } = useOnboardingStatus(driver?.id);
  const toggleMutation = useToggleDriverActive();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="p-6 text-center text-muted-foreground">
          Loading dashboard...
        </Card>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6 text-center text-muted-foreground">
          We couldn't find your driver profile yet.
        </Card>
      </div>
    );
  }

  if (driver.application_status !== 'approved') {
    return <Navigate to="/driver/application-status" replace />;
  }

  const canActivate = onboardingStatus?.canActivate ?? false;
  const blockers = onboardingStatus?.blockers ?? [];
  const showChecklist = onboardingStatus && !onboardingStatus.isComplete;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">
          {greeting}, {driver.user?.full_name || 'Driver'}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {company?.name ? `Welcome to ${company.name}.` : 'Welcome back to your driver portal.'}
        </p>
      </div>

      {/* Status Toggle */}
      {onboardingStatus && (
        <DriverStatusToggle
          driverId={driver.id}
          currentStatus={driver.status}
          canActivate={canActivate}
          blockers={blockers}
        />
      )}

      {/* Welcome Box - dismissible with "don't show again" */}
      <WelcomeBox 
        driverName={driver.user?.full_name} 
        employmentType={driver.employment_type}
      />

      {/* Getting Started Checklist */}
      {showChecklist && onboardingStatus && (
        <GettingStartedChecklist onboardingStatus={onboardingStatus} />
      )}

      {/* Ready to Drive Card */}
      {!showChecklist && canActivate && driver.status !== 'active' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base">Ready to drive</CardTitle>
            </div>
            <CardDescription>You've completed all required steps.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Toggle your status to Active to start receiving trips.
            </p>
            <Button
              onClick={() => toggleMutation.mutate({ driverId: driver.id, active: true })}
              disabled={!canActivate || toggleMutation.isPending}
              variant="outline"
            >
              {toggleMutation.isPending ? 'Updating...' : 'Go Active'}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
