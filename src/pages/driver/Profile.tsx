import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverProfile, useProfileCompletion } from '@/hooks/useProfile';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { DriverSummaryTab } from '@/components/features/shared/DriverSummaryTab';

export default function DriverProfile() {
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriverProfile(user?.id);
  const completion = driver ? useProfileCompletion(driver) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold">Driver Profile</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
              We couldn't find your driver profile yet.
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (driver.application_status !== 'approved') {
    return <Navigate to="/driver/application-status" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold">Driver Profile</h1>
              <p className="text-sm text-muted-foreground">
                Review and update your personal information and documents.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Profile completion banner - keep this */}
          {completion && !completion.isComplete && (
            <Card className={cn(cardVariants({ variant: 'stats' }))}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Profile Completion</CardTitle>
                  <Badge variant={completion.isComplete ? 'secondary' : 'outline'}>
                    {completion.percentage}% Complete
                  </Badge>
                </div>
                <CardDescription>
                  Complete all sections to unlock the best broker opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={completion.percentage} className="h-2" />
                {completion.missingFields.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Missing: {completion.missingFields.slice(0, 4).join(', ')}
                    {completion.missingFields.length > 4 && ` +${completion.missingFields.length - 4} more`}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">All required fields are complete.</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Use DriverSummaryTab for all content */}
          <DriverSummaryTab
            driver={driver}
            companyId={driver.company_id}
            canEdit={true}
          />

          <div className="flex justify-end">
            <Button asChild variant="ghost">
              <Link to="/driver/settings/account">Account Settings</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
