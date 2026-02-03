import type { BadgeProps } from '@/components/ui/badge';
import type { CredentialDisplayStatus } from '@/types/credential';
import type { ApplicationStatus } from '@/types/driver';
import type { VehicleStatus } from '@/types/vehicle';

export type BadgeVariant = BadgeProps['variant'];

export type CredentialStatusConfigEntry = {
  label: string;
  variant: BadgeVariant;
};

export type CredentialStatusConfig = Record<CredentialDisplayStatus, CredentialStatusConfigEntry>;

export const credentialStatusConfig: CredentialStatusConfig = {
  approved: {
    label: 'Complete',
    variant: 'default',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
  },
  pending_review: {
    label: 'Pending Review',
    variant: 'secondary',
  },
  not_submitted: {
    label: 'Not Submitted',
    variant: 'outline',
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
  },
  expiring: {
    label: 'Expiring Soon',
    variant: 'outline',
  },
  awaiting: {
    label: 'In Review',
    variant: 'secondary',
  },
  grace_period: {
    label: 'Due Soon',
    variant: 'secondary',
  },
  missing: {
    label: 'Missing',
    variant: 'destructive',
  },
};

export type VehicleStatusConfigEntry = {
  label: string;
  variant: BadgeVariant;
};

export type VehicleStatusConfig = Record<VehicleStatus, VehicleStatusConfigEntry>;

export const vehicleStatusConfig: VehicleStatusConfig = {
  active: {
    label: 'Active',
    variant: 'default',
  },
  inactive: {
    label: 'Inactive',
    variant: 'secondary',
  },
  retired: {
    label: 'Retired',
    variant: 'destructive',
  },
};

export type ApplicationStatusConfigEntry = {
  label: string;
  variant: BadgeVariant;
};

export type ApplicationStatusConfig = Record<ApplicationStatus, ApplicationStatusConfigEntry>;

export const applicationStatusConfig: ApplicationStatusConfig = {
  draft: {
    label: 'Draft',
    variant: 'outline',
  },
  pending: {
    label: 'Pending',
    variant: 'secondary',
  },
  under_review: {
    label: 'Under Review',
    variant: 'secondary',
  },
  approved: {
    label: 'Approved',
    variant: 'default',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
  },
  withdrawn: {
    label: 'Withdrawn',
    variant: 'outline',
  },
};
