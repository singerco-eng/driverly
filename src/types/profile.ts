export interface ProfileSection {
  key: 'personal' | 'contact' | 'address' | 'license' | 'emergency' | 'employment';
  label: string;
  isComplete: boolean;
  fields: ProfileFieldStatus[];
}

export interface ProfileFieldStatus {
  key: string;
  label: string;
  value: string | null;
  required: boolean;
  isFilled: boolean;
}

export interface ProfileCompletionStatus {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  sections: ProfileSection[];
}

export interface PersonalInfoFormData {
  full_name: string;
  date_of_birth: string;
  avatar_url: string | null;
}

export interface ContactInfoFormData {
  email: string;
  phone: string;
}

export interface AddressFormData {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface LicenseFormData {
  license_number: string;
  license_state: string;
  license_expiration: string;
  license_front_url: string | null;
  license_back_url: string | null;
}

export interface EmergencyContactFormData {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_trip_assignments: boolean;
  email_credential_reminders: boolean;
  email_payment_notifications: boolean;
  email_marketing: boolean;
  push_trip_assignments: boolean;
  push_credential_reminders: boolean;
  push_payment_notifications: boolean;
  sms_enabled: boolean;
}

export interface ProfileChangeRecord {
  id: string;
  driver_id: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ChangePasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
