import type { BadgeProps } from '@/components/ui/badge';
import type { CredentialDisplayStatus } from '@/types/credential';
import type { VehicleStatus } from '@/types/vehicle';
import type { ApplicationStatus } from '@/types/driver';

export const vehicleStatusVariant: Record<VehicleStatus, BadgeProps['variant']> = {
  active: 'default',
  inactive: 'secondary',
  retired: 'outline',
};

export const driverStatusVariant = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
  archived: 'outline',
} as const satisfies Record<string, BadgeProps['variant']>;

export const applicationStatusVariant: Record<ApplicationStatus, BadgeProps['variant']> = {
  draft: 'outline',
  pending: 'secondary',
  under_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  withdrawn: 'outline',
};

export const credentialStatusVariant: Record<CredentialDisplayStatus, BadgeProps['variant']> = {
  approved: 'default',
  rejected: 'destructive',
  pending_review: 'secondary',
  not_submitted: 'outline',
  expired: 'destructive',
  expiring: 'outline', // "Expiring Soon" uses outline per design system
  awaiting: 'secondary',
};
