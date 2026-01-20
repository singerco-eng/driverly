import type { Vehicle, VehicleType } from '@/types/vehicle';

interface VehicleCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
}

const REQUIRED_FIELDS: { key: keyof Vehicle; label: string; vehicleTypes?: VehicleType[] }[] = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year' },
  { key: 'color', label: 'Color' },
  { key: 'license_plate', label: 'License Plate' },
  { key: 'license_state', label: 'License State' },
  { key: 'vin', label: 'VIN' },
  { key: 'exterior_photo_url', label: 'Exterior Photo' },
  { key: 'wheelchair_lift_photo_url', label: 'Wheelchair Lift Photo', vehicleTypes: ['wheelchair_van'] },
];

export function calculateVehicleCompletion(vehicle: Vehicle): VehicleCompletionResult {
  const applicableFields = REQUIRED_FIELDS.filter(
    (field) => !field.vehicleTypes || field.vehicleTypes.includes(vehicle.vehicle_type),
  );

  const missingFields: string[] = [];

  for (const field of applicableFields) {
    const value = vehicle[field.key];
    if (value === null || value === undefined || value === '') {
      missingFields.push(field.label);
    }
  }

  const percentage = Math.round(
    ((applicableFields.length - missingFields.length) / applicableFields.length) * 100,
  );

  return {
    isComplete: missingFields.length === 0,
    percentage,
    missingFields,
  };
}
