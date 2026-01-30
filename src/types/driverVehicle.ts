import type { Vehicle, VehicleType } from './vehicle';

export interface DriverVehicle extends Vehicle {
  assignment?: {
    id: string;
    is_primary: boolean;
    assignment_type: 'owned' | 'assigned' | 'borrowed';
    starts_at: string;
    ends_at: string | null;
  } | null;
}

export interface DriverVehicleWithStatus extends DriverVehicle {
  credentialStatus: 'valid' | 'expiring' | 'expired' | 'missing';
  credentialSummary: string;
  eligibleBrokers: string[];
  ineligibleBrokers: { name: string; reason: string }[];
  isUncredentialed?: boolean;
  missingCredentials?: { name: string; credentialTypeId: string }[];
}

export interface VehicleCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  percentage: number;
}

export interface AddVehicleWizardData {
  // Step 1: Basic Info
  make: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: VehicleType;

  // Step 2: Identification
  license_plate: string;
  license_state: string;
  vin: string;

  // Step 3: Capacity
  seat_capacity: number;
  wheelchair_capacity: number;
  stretcher_capacity: number;

  // Step 4: Photos
  exterior_photo_url: string | null;
  interior_photo_url: string | null;
  wheelchair_lift_photo_url: string | null;
}

export type WizardStep = 'basic' | 'identification' | 'capacity' | 'photos';

export interface SetInactiveData {
  reason: 'maintenance' | 'repairs' | 'personal_use' | 'other';
  details?: string;
}

export interface RetireVehicleData {
  reason: 'sold' | 'totaled' | 'no_longer_using' | 'other';
}
