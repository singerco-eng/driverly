export type OnboardingItemKey =
  | 'profile_complete'
  | 'vehicle_added'
  | 'vehicle_complete'
  | 'global_credentials'
  | 'availability_set'
  | 'payment_info'
  | 'broker_requested'
  | 'broker_credentials'
  | 'profile_photo';

export type OnboardingCategory =
  | 'setup'
  | 'credentials'
  | 'schedule'
  | 'payment'
  | 'brokers';

export interface OnboardingItem {
  key: OnboardingItemKey;
  label: string;
  description: string;
  required: boolean;
  category: OnboardingCategory;
  forEmploymentType?: 'w2' | '1099';
  route: string;
}

export interface OnboardingItemStatus extends OnboardingItem {
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  missingInfo?: string[];
}

export interface OnboardingStatus {
  items: OnboardingItemStatus[];
  progress: number;
  isComplete: boolean;
  canActivate: boolean;
  blockers: string[];
}

export interface DriverAvailability {
  id: string;
  driver_id: string;
  company_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverPaymentInfo {
  id: string;
  driver_id: string;
  company_id: string;
  payment_method: 'direct_deposit' | 'check' | 'paycard';
  bank_name: string | null;
  account_type: 'checking' | 'savings' | null;
  routing_number_last4: string | null;
  account_number_last4: string | null;
  check_address_line1: string | null;
  check_address_line2: string | null;
  check_city: string | null;
  check_state: string | null;
  check_zip: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInfoFormData {
  payment_method: 'direct_deposit' | 'check' | 'paycard';
  bank_name?: string;
  account_type?: 'checking' | 'savings';
  routing_number?: string;
  account_number?: string;
  check_address_line1?: string;
  check_address_line2?: string;
  check_city?: string;
  check_state?: string;
  check_zip?: string;
}
