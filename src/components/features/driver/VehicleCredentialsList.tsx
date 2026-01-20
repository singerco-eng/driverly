import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from 'lucide-react';
import { useDriverAssignments } from '@/hooks/useVehicleAssignments';
import { useVehicleCredentialProgress, useVehicleCredentials } from '@/hooks/useCredentials';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import type { VehicleAssignment } from '@/types/vehicleAssignment';
import { CredentialList } from './CredentialList';

interface VehicleCredentialsListProps {
  driverId: string;
  onSubmit?: (credential: CredentialWithDisplayStatus) => void;
  onView?: (credential: CredentialWithDisplayStatus) => void;
}

interface VehicleCredentialSectionProps {
  assignment: VehicleAssignment;
  onSubmit?: (credential: CredentialWithDisplayStatus) => void;
  onView?: (credential: CredentialWithDisplayStatus) => void;
}

function VehicleCredentialSection({ assignment, onSubmit, onView }: VehicleCredentialSectionProps) {
  const vehicle = assignment.vehicle;
  const { data: credentials, isLoading } = useVehicleCredentials(vehicle?.id);
  const { data: progress } = useVehicleCredentialProgress(vehicle?.id);

  if (!vehicle) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Car className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </CardTitle>
                {assignment.is_primary && (
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Plate: {vehicle.license_plate}
              </p>
            </div>
          </div>
          {progress && (
            <div className="min-w-[180px] space-y-1">
              <p className="text-xs text-muted-foreground">
                {progress.complete} of {progress.total} required
              </p>
              <Progress value={progress.percentage} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {credentials && (
          <CredentialList
            credentials={credentials}
            onSubmit={(item) => onSubmit?.(item)}
            onView={(item) => onView?.(item)}
            emptyMessage="No credentials configured for this vehicle."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function VehicleCredentialsList({ driverId, onSubmit, onView }: VehicleCredentialsListProps) {
  const { data: assignments, isLoading } = useDriverAssignments(driverId);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

  const vehicles = useMemo(() => assignments || [], [assignments]);

  const filteredAssignments = useMemo(() => {
    if (selectedVehicleId === 'all') return vehicles;
    return vehicles.filter((assignment) => assignment.vehicle_id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <Card className="p-12 text-center">
        <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Vehicles Assigned</h3>
        <p className="text-muted-foreground">
          Vehicle credentials will appear here once you have vehicles assigned.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {vehicles.length > 1 && (
        <div className="w-full md:w-80">
          <Label htmlFor="vehicle-filter" className="text-sm font-medium mb-2 block">
            Filter by Vehicle
          </Label>
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <SelectTrigger id="vehicle-filter" className="border-border/50 focus:border-primary/50 focus:ring-primary/20 bg-background/50">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles ({vehicles.length})</SelectItem>
              {vehicles.map((assignment) => (
                <SelectItem key={assignment.vehicle_id} value={assignment.vehicle_id}>
                  {assignment.vehicle?.year} {assignment.vehicle?.make} {assignment.vehicle?.model}
                  {assignment.is_primary && ' (Primary)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4">
        {filteredAssignments.map((assignment) => (
          <VehicleCredentialSection
            key={assignment.id}
            assignment={assignment}
            onSubmit={onSubmit}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}
