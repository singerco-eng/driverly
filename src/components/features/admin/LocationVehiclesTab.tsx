import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Car, Plus, X } from 'lucide-react';
import { useAssignVehicleToLocation, useLocationVehicles } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { vehicleStatusConfig } from '@/lib/status-configs';

interface LocationVehiclesTabProps {
  locationId: string;
  canEdit?: boolean;
  onAssign?: () => void;
}

export function LocationVehiclesTab({
  locationId,
  canEdit = true,
  onAssign,
}: LocationVehiclesTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: vehicles, isLoading } = useLocationVehicles(locationId);
  const assignVehicle = useAssignVehicleToLocation();

  const handleRemove = async (vehicleId: string) => {
    try {
      await assignVehicle.mutateAsync({ vehicleId, locationId: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove vehicle';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Assigned Vehicles</h3>
          <p className="text-sm text-muted-foreground">
            {vehicles?.length || 0} vehicles assigned to this location
          </p>
        </div>
        <Button onClick={onAssign} disabled={!canEdit || !onAssign}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Vehicle
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (vehicles?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center">
          <Car className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No vehicles assigned</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {vehicles?.map((vehicle) => (
            <Card key={vehicle.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.license_plate || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={vehicleStatusConfig[vehicle.status].variant}>
                    {vehicleStatusConfig[vehicle.status].label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => void handleRemove(vehicle.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
