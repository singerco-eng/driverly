import { Badge } from '@/components/ui/badge';
import { RadioGroupItem } from '@/components/ui/radio-group';

interface VehicleListItemProps {
  vehicle: any;
}

export function VehicleListItem({ vehicle }: VehicleListItemProps) {
  const current = vehicle.current_assignment;
  const assignedTo = current?.driver?.user?.full_name;
  const isAssigned = !!assignedTo;

  return (
    <label className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer">
      <RadioGroupItem value={vehicle.id} className="mt-1" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
          <Badge variant="outline" className="capitalize text-xs">
            {vehicle.vehicle_type?.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Plate: {vehicle.license_plate || '—'}</p>
        {isAssigned && (
          <p className="text-xs text-amber-600">
            Assigned to {assignedTo}. Selecting will transfer this vehicle.
          </p>
        )}
      </div>
    </label>
  );
}
