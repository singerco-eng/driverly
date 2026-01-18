export type VehicleType = 'sedan' | 'van' | 'wheelchair_van' | 'stretcher_van';
export type VehicleOwnership = 'company' | 'driver';
export type VehicleStatus = 'active' | 'inactive' | 'retired';

export interface Vehicle {
  id: string;
  company_id: string;

  // Basic Info
  make: string;
  model: string;
  year: number;
  color: string;

  // Identification
  license_plate: string;
  license_state: string;
  vin: string | null;

  // Classification
  vehicle_type: VehicleType;
  ownership: VehicleOwnership;

  // Capacity
  seat_capacity: number;
  wheelchair_capacity: number;
  stretcher_capacity: number;

  // Fleet Management
  fleet_number: string | null;
  mileage: number | null;
  mileage_updated_at: string | null;

  // Photos
  exterior_photo_url: string | null;
  interior_photo_url: string | null;
  wheelchair_lift_photo_url: string | null;

  // Status
  status: VehicleStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;

  // Owner
  owner_driver_id: string | null;

  // Completeness
  is_complete: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VehicleWithOwner extends Vehicle {
  owner?: {
    id: string;
    user: {
      full_name: string;
    };
  } | null;
}

export interface VehicleWithAssignments extends VehicleWithOwner {
  assignments?: {
    id: string;
    is_primary: boolean;
    assignment_type: string;
    driver: {
      id: string;
      user: {
        full_name: string;
      };
    };
  }[];
}

export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus | 'all';
  vehicleType?: VehicleType | 'all';
  ownership?: VehicleOwnership | 'all';
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  license_state: string;
  vin?: string;
  vehicle_type: VehicleType;
  ownership: VehicleOwnership;
  owner_driver_id?: string;
  seat_capacity?: number;
  wheelchair_capacity?: number;
  stretcher_capacity?: number;
  fleet_number?: string;
  mileage?: number;
  exterior_photo_url?: string;
  interior_photo_url?: string;
  wheelchair_lift_photo_url?: string;
}
