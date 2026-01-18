import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VehicleWithAssignments } from '@/types/vehicle';

interface VehicleDetailsTabProps {
  vehicle: VehicleWithAssignments;
}

export function VehicleDetailsTab({ vehicle }: VehicleDetailsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Make</p>
            <p className="font-medium">{vehicle.make}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Model</p>
            <p className="font-medium">{vehicle.model}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Year</p>
            <p className="font-medium">{vehicle.year}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Color</p>
            <p className="font-medium">{vehicle.color}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{vehicle.vehicle_type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fleet #</p>
            <p className="font-medium">{vehicle.fleet_number || '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">License Plate</p>
            <p className="font-medium">{vehicle.license_plate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">State</p>
            <p className="font-medium">{vehicle.license_state}</p>
          </div>
          <div>
            <p className="text-muted-foreground">VIN</p>
            <p className="font-medium">{vehicle.vin || '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
