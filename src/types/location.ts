import type { Broker } from '@/types/broker';
import type { CredentialStatus, CredentialType } from '@/types/credential';

export type LocationStatus = 'active' | 'inactive' | 'archived';

export interface Location {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  status: LocationStatus;
  created_at: string;
  updated_at: string;
}

export type LocationCredentialStatus = {
  status: 'valid' | 'expiring' | 'expired' | 'missing' | 'grace_period' | 'pending';
  missing: number;
  total: number;
};

export interface LocationWithStats extends Location {
  driver_count: number;
  vehicle_count: number;
  credentialStatus?: LocationCredentialStatus;
}

export interface LocationCredential {
  id: string;
  location_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  document_urls: string[] | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  grace_period_ends: string | null;
  submission_version: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
  location?: Location;
}

export interface LocationBrokerAssignment {
  id: string;
  location_id: string;
  broker_id: string;
  company_id: string;
  is_active: boolean;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  broker?: Broker;
  location?: Location;
}

export interface CreateLocationData {
  name: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export interface UpdateLocationData extends Partial<CreateLocationData> {
  status?: LocationStatus;
}
