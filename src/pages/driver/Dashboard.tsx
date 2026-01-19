import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useCompany } from '@/hooks/useCompanies';
import { useOnboardingStatus, useToggleDriverActive } from '@/hooks/useOnboarding';
import { GettingStartedChecklist } from '@/components/features/driver/GettingStartedChecklist';
import { DriverStatusToggle } from '@/components/features/driver/DriverStatusToggle';
import { FileCheck, Car, Calendar, Sparkles } from 'lucide-react';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';

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
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
          Loading dashboard...
        </Card>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          {greeting}, {driver.user?.full_name || 'Driver'}! 👋
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

      {/* Getting Started Checklist */}
      {showChecklist && onboardingStatus && (
        <GettingStartedChecklist onboardingStatus={onboardingStatus} />
      )}

      {/* Ready to Drive Card */}
      {!showChecklist && onboardingStatus?.isComplete && driver.status !== 'active' && (
        <Card className={cn(cardVariants({ variant: 'glow' }))}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>Ready to drive</CardTitle>
            </div>
            <CardDescription>You have completed all required steps.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                Complete
              </Badge>
              You can go active whenever you're ready.
            </div>
            <Button
              onClick={() => toggleMutation.mutate({ driverId: driver.id, active: true })}
              disabled={!canActivate || toggleMutation.isPending}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {toggleMutation.isPending ? 'Updating...' : 'Go Active'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cn(cardVariants({ variant: 'default' }))}>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Jump to the most common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link to="/driver/credentials">
                <FileCheck className="w-4 h-4" />
                Manage Credentials
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link to="/driver/vehicles">
                <Car className="w-4 h-4" />
                Manage Vehicles
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link to="/driver/availability">
                <Calendar className="w-4 h-4" />
                Edit Availability
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(cardVariants({ variant: 'default' }))}>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Trip activity will appear here soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No activity to show yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
