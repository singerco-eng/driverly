import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DriverNotesSection } from '@/components/features/admin/DriverNotesSection';
import { applicationStatusVariant } from '@/lib/status-styles';
import type { DriverWithDetails } from '@/types/driver';

interface DriverOverviewTabProps {
  driver: DriverWithDetails;
  canEdit?: boolean;
}

export function DriverOverviewTab({ driver, canEdit = true }: DriverOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={applicationStatusVariant[driver.application_status]}>
              {driver.application_status.replace('_', ' ')}
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">
              Submitted {driver.application_date ? new Date(driver.application_date).toLocaleDateString() : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">License</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {driver.license_number || 'Not provided'}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Expires {driver.license_expiration ? new Date(driver.license_expiration).toLocaleDateString() : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {driver.last_active_at
                ? new Date(driver.last_active_at).toLocaleDateString()
                : 'No recent activity'}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Last active date</p>
          </CardContent>
        </Card>
      </div>

      <DriverNotesSection driverId={driver.id} canEdit={canEdit} />
    </div>
  );
}
