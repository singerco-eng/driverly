export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  default_enabled: boolean;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyFeatureOverride {
  id: string;
  company_id: string;
  flag_id: string;
  enabled: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagWithOverride extends FeatureFlag {
  override?: CompanyFeatureOverride;
  effective_value: boolean;
}

export interface FeatureFlagWithStats extends FeatureFlag {
  override_count: number;
}

export type FeatureFlagKey =
  | 'billing_enabled'
  | 'billing_self_service'
  | 'billing_enforcement'
  | 'driver_management'
  | 'vehicle_management'
  | 'credential_management'
  | 'broker_management'
  | 'trip_management'
  | 'driver_payments'
  | 'advanced_reports'
  | 'api_access'
  | 'white_label';

export type FeatureFlagCategory =
  | 'billing'
  | 'core'
  | 'operations'
  | 'finance'
  | 'analytics'
  | 'integrations'
  | 'enterprise'
  | 'general';
