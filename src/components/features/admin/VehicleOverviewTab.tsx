import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignVehicleToLocation, useLocations } from '@/hooks/useLocations';
import { useUpdateVehicleMileage } from '@/hooks/useVehicles';
import { vehicleStatusVariant } from '@/lib/status-styles';
import type { VehicleWithAssignments } from '@/types/vehicle';

interface VehicleOverviewTabProps {
  vehicle: VehicleWithAssignments;
  canEdit?: boolean;
}

export function VehicleOverviewTab({ vehicle, canEdit = true }: VehicleOverviewTabProps) {
  const updateMileage = useUpdateVehicleMileage();
  const { data: locations } = useLocations(vehicle.company_id);
  const assignToLocation = useAssignVehicleToLocation();
  const activeLocations = (locations ?? []).filter((location) => location.status === 'active');
  const [mileageValue, setMileageValue] = useState(
    vehicle.mileage !== null ? String(vehicle.mileage) : ''
  );

  const isCompanyVehicle = vehicle.ownership === 'company';
  const activeAssignments = useMemo(
    () => vehicle.assignments?.filter((assignment) => assignment) ?? [],
    [vehicle.assignments]
  );

  const handleUpdateMileage = async () => {
    const mileage = Number(mileageValue);
    if (Number.isNaN(mileage)) return;
    await updateMileage.mutateAsync({ vehicleId: vehicle.id, mileage });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={vehicleStatusVariant[vehicle.status]} className="capitalize">
              {vehicle.status}
            </Badge>
            {vehicle.status_reason && (
              <p className="mt-2 text-xs text-muted-foreground">{vehicle.status_reason}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium capitalize">{vehicle.ownership}</div>
            {vehicle.owner?.user?.full_name && (
              <p className="mt-2 text-xs text-muted-foreground">
                Owner: {vehicle.owner.user.full_name}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Capacity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{vehicle.seat_capacity} seats</p>
            <p>{vehicle.wheelchair_capacity} wheelchairs</p>
            <p>{vehicle.stretcher_capacity} stretchers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={vehicle.location_id || 'unassigned'}
              onValueChange={(value) => {
                assignToLocation.mutate({
                  vehicleId: vehicle.id,
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
              {vehicle.location?.name
                ? `Assigned to ${vehicle.location.name}`
                : 'Not assigned to any location'}
            </p>
          </CardContent>
        </Card>
      </div>

      {isCompanyVehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mileage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={mileageValue}
              onChange={(event) => setMileageValue(event.target.value)}
              placeholder="Enter mileage"
              className="md:max-w-[220px]"
              disabled={!canEdit}
            />
            <Button
              onClick={handleUpdateMileage}
              disabled={!canEdit || updateMileage.isPending || !mileageValue.trim()}
            >
              {updateMileage.isPending ? 'Updating...' : 'Update Mileage'}
            </Button>
            {vehicle.mileage_updated_at && (
              <span className="text-xs text-muted-foreground">
                Updated {new Date(vehicle.mileage_updated_at).toLocaleDateString()}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active assignments.</p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {assignment.driver?.user?.full_name ?? 'Unknown driver'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.assignment_type} ·{' '}
                      {assignment.is_primary ? 'Primary' : 'Secondary'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {assignment.assignment_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
