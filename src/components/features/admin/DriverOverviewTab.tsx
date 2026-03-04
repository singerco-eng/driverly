import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DriverNotesSection } from '@/components/features/admin/DriverNotesSection';
import { useAssignDriverToLocation, useLocations } from '@/hooks/useLocations';
import { applicationStatusVariant } from '@/lib/status-styles';
import type { DriverWithDetails } from '@/types/driver';

interface DriverOverviewTabProps {
  driver: DriverWithDetails;
  canEdit?: boolean;
}

export function DriverOverviewTab({ driver, canEdit = true }: DriverOverviewTabProps) {
  const { data: locations } = useLocations(driver.company_id);
  const assignToLocation = useAssignDriverToLocation();
  const activeLocations = (locations ?? []).filter((location) => location.status === 'active');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={driver.location_id || 'unassigned'}
              onValueChange={(value) => {
                assignToLocation.mutate({
                  driverId: driver.id,
                  locationId: value === 'unassigned' ? null : value,
                });
              }}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {activeLocations.length === 0 ? (
                  <SelectItem value="no-locations" disabled>
                    No active locations
                  </SelectItem>
                ) : (
                  activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.code ? `(${location.code})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              {driver.location?.name
                ? `Assigned to ${driver.location.name}`
                : 'Not assigned to any location'}
            </p>
          </CardContent>
        </Card>
      </div>

      <DriverNotesSection driverId={driver.id} canEdit={canEdit} />
    </div>
  );
}
