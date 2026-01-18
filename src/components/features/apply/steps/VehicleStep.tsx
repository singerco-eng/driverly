import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ApplicationFormData } from '@/types/application';

interface VehicleStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<ApplicationFormData>) => void;
  onFieldBlur?: () => void;
}

export function VehicleStep({ data, errors, onChange, onFieldBlur }: VehicleStepProps) {
  const [skipVehicle, setSkipVehicle] = useState(!data.vehicle);
  const vehicle = data.vehicle || {
    type: 'sedan',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    licensePlate: '',
    color: '',
  };

  useEffect(() => {
    if (skipVehicle) {
      onChange({ vehicle: undefined });
    } else if (!data.vehicle) {
      onChange({ vehicle });
    }
  }, [data.vehicle, onChange, skipVehicle, vehicle]);

  const updateVehicle = (field: keyof typeof vehicle, value: string | number) => {
    onChange({ vehicle: { ...vehicle, [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="skipVehicle"
          checked={skipVehicle}
          onCheckedChange={(checked) => setSkipVehicle(checked === true)}
        />
        <Label htmlFor="skipVehicle">Skip vehicle for now</Label>
      </div>
      {skipVehicle ? (
        <p className="text-sm text-muted-foreground">
          You can add your vehicle details later if needed.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select
              value={vehicle.type}
              onValueChange={(value) => updateVehicle('type', value)}
            >
              <SelectTrigger id="vehicleType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
                <SelectItem value="stretcher">Stretcher</SelectItem>
              </SelectContent>
            </Select>
            {errors['vehicle.type'] && (
              <p className="text-sm text-destructive">{errors['vehicle.type']}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={vehicle.make}
                onChange={(e) => updateVehicle('make', e.target.value)}
                onBlur={onFieldBlur}
              />
              {errors['vehicle.make'] && (
                <p className="text-sm text-destructive">{errors['vehicle.make']}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={vehicle.model}
                onChange={(e) => updateVehicle('model', e.target.value)}
                onBlur={onFieldBlur}
              />
              {errors['vehicle.model'] && (
                <p className="text-sm text-destructive">{errors['vehicle.model']}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={vehicle.year}
                onChange={(e) => updateVehicle('year', Number(e.target.value))}
                onBlur={onFieldBlur}
              />
              {errors['vehicle.year'] && (
                <p className="text-sm text-destructive">{errors['vehicle.year']}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                value={vehicle.licensePlate}
                onChange={(e) => updateVehicle('licensePlate', e.target.value)}
                onBlur={onFieldBlur}
              />
              {errors['vehicle.licensePlate'] && (
                <p className="text-sm text-destructive">{errors['vehicle.licensePlate']}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={vehicle.color || ''}
                onChange={(e) => updateVehicle('color', e.target.value)}
                onBlur={onFieldBlur}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
