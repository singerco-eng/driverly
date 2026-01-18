export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logo_url: string | null;
  primary_color: string;
  status: CompanyStatus;
  ein: string | null;
  timezone: string;
  deactivation_reason: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFormData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  primary_color: string;
  ein: string;
  timezone: string;
}

export interface CompanyWithStats extends Company {
  admin_count?: number;
  driver_count?: number;
}

export interface CompanyDetail extends Company {
  admin_count: number;
  driver_count: number;
  vehicle_count: number;
}

export interface CompanyAdmin {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'coordinator';
  status: 'active' | 'pending';
  avatar_url: string | null;
  created_at: string;
  invited_at: string | null;
}