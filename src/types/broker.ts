export type BrokerStatus = 'active' | 'inactive';
export type AssignmentStatus = 'pending' | 'assigned' | 'removed';
export type RequestedBy = 'admin' | 'driver';
export type VehicleType = 'sedan' | 'suv' | 'minivan' | 'wheelchair_van' | 'stretcher_van';

export interface Broker {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  website: string | null;
  contract_number: string | null;
  notes: string | null;
  service_states: string[];
  accepted_vehicle_types: VehicleType[];
  accepted_employment_types: ('w2' | '1099')[];
  status: BrokerStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BrokerFormData {
  name: string;
  code: string;
  logo_url: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  website: string;
  contract_number: string;
  notes: string;
  service_states: string[];
  accepted_vehicle_types: VehicleType[];
  accepted_employment_types: ('w2' | '1099')[];
}

export interface BrokerWithStats extends Broker {
  assigned_count: number;
  eligible_count: number;
  pending_count: number;
  credential_count: number;
}

export interface DriverBrokerAssignment {
  id: string;
  driver_id: string;
  broker_id: string;
  company_id: string;
  status: AssignmentStatus;
  requested_by: RequestedBy;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  removed_by: string | null;
  removed_at: string | null;
  removal_reason: string | null;
  created_at: string;
  // Joined
  driver?: {
    id: string;
    user: {
      full_name: string;
      email: string;
    };
    employment_type: string;
    status: string;
    state: string;
  };
  broker?: Broker;
}

export interface BrokerRate {
  id: string;
  broker_id: string;
  company_id: string;
  vehicle_type: VehicleType;
  base_rate: number;
  per_mile_rate: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
}

export interface BrokerRateFormData {
  vehicle_type: VehicleType;
  base_rate: number;
  per_mile_rate: number;
}

export interface UpdateRatesFormData {
  effective_from: string;
  rates: BrokerRateFormData[];
}
