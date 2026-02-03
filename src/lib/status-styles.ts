/**
 * Status styles - re-exports variant-only maps from status-configs.ts
 * 
 * For new code, prefer importing the full config from @/lib/status-configs
 * which includes both variant and label.
 * 
 * These exports are kept for backwards compatibility.
 */
import type { BadgeProps } from '@/components/ui/badge';
import {
  credentialStatusConfig,
  vehicleStatusConfig,
  applicationStatusConfig,
  driverStatusConfig,
  type CredentialStatusConfig,
  type VehicleStatusConfig,
  type ApplicationStatusConfig,
  type DriverStatusConfig,
} from '@/lib/status-configs';
import type { CredentialDisplayStatus } from '@/types/credential';
import type { VehicleStatus } from '@/types/vehicle';
import type { ApplicationStatus, DriverStatus } from '@/types/driver';

// Helper to extract just variants from a config
function extractVariants<K extends string, V extends { variant: BadgeProps['variant'] }>(
  config: Record<K, V>
): Record<K, BadgeProps['variant']> {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, (value as V).variant])
  ) as Record<K, BadgeProps['variant']>;
}

// Re-export variant-only maps derived from the canonical configs
export const credentialStatusVariant: Record<CredentialDisplayStatus, BadgeProps['variant']> =
  extractVariants<CredentialDisplayStatus, CredentialStatusConfig[CredentialDisplayStatus]>(credentialStatusConfig);

export const vehicleStatusVariant: Record<VehicleStatus, BadgeProps['variant']> =
  extractVariants<VehicleStatus, VehicleStatusConfig[VehicleStatus]>(vehicleStatusConfig);

export const applicationStatusVariant: Record<ApplicationStatus, BadgeProps['variant']> =
  extractVariants<ApplicationStatus, ApplicationStatusConfig[ApplicationStatus]>(applicationStatusConfig);

export const driverStatusVariant: Record<DriverStatus, BadgeProps['variant']> =
  extractVariants<DriverStatus, DriverStatusConfig[DriverStatus]>(driverStatusConfig);
