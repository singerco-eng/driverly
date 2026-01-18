import type { EmploymentType } from './driver';

export type VehicleType = 'sedan' | 'wheelchair_van' | 'stretcher';

export interface ApplicationAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface ApplicationPersonalInfo {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  address: ApplicationAddress;
}

export interface ApplicationLicense {
  number: string;
  state: string;
  expiration: string;
  frontUrl: string;
  backUrl: string;
}

export interface ApplicationVehicle {
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  color?: string;
}

export interface ApplicationAccount {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ApplicationFormData {
  account?: ApplicationAccount;
  personalInfo?: ApplicationPersonalInfo;
  employmentType?: EmploymentType;
  license?: ApplicationLicense;
  vehicle?: ApplicationVehicle;
  experienceNotes?: string;
  referralSource?: 'job_board' | 'friend' | 'social_media' | 'other';
  eulaAccepted?: boolean;
  eulaVersion?: string;
}

export interface ApplicationSubmission {
  companyId: string;
  personalInfo: ApplicationPersonalInfo;
  employmentType: EmploymentType;
  license: ApplicationLicense;
  vehicle?: ApplicationVehicle;
  experienceNotes?: string;
  referralSource?: string;
  eulaVersion: string;
}
