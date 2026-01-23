/**
 * React Query Key Factory
 * 
 * Centralized query keys for consistent cache management.
 * This prevents typos and makes cache invalidation predictable.
 * 
 * Usage:
 *   import { queryKeys } from '@/lib/query-keys';
 *   
 *   useQuery({ queryKey: queryKeys.drivers.list(filters), ... });
 *   queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
 */

export const queryKeys = {
  // ============================================
  // DRIVERS
  // ============================================
  drivers: {
    all: ['drivers'] as const,
    lists: () => [...queryKeys.drivers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.drivers.lists(), filters] as const,
    details: () => [...queryKeys.drivers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.drivers.details(), id] as const,
    credentials: (driverId: string) => 
      [...queryKeys.drivers.detail(driverId), 'credentials'] as const,
    credentialProgress: (driverId: string) => 
      ['driver-credential-progress', driverId] as const,
    vehicles: (driverId: string) => 
      [...queryKeys.drivers.detail(driverId), 'vehicles'] as const,
    brokerAssignments: (driverId: string) =>
      [...queryKeys.drivers.detail(driverId), 'broker-assignments'] as const,
  },

  // ============================================
  // VEHICLES
  // ============================================
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.vehicles.lists(), filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
    credentials: (vehicleId: string) => 
      [...queryKeys.vehicles.detail(vehicleId), 'credentials'] as const,
    credentialProgress: (vehicleId: string) => 
      ['vehicle-credential-progress', vehicleId] as const,
    assignments: (vehicleId: string) => 
      [...queryKeys.vehicles.detail(vehicleId), 'assignments'] as const,
  },

  // ============================================
  // CREDENTIALS
  // ============================================
  credentials: {
    all: ['credentials'] as const,
    types: () => [...queryKeys.credentials.all, 'types'] as const,
    typeList: (companyId?: string) => 
      [...queryKeys.credentials.types(), 'list', companyId] as const,
    typeDetail: (id: string) => 
      [...queryKeys.credentials.types(), 'detail', id] as const,
    review: () => [...queryKeys.credentials.all, 'review'] as const,
    reviewQueue: (filters?: Record<string, unknown>) => 
      [...queryKeys.credentials.review(), 'queue', filters] as const,
    reviewStats: () => 
      [...queryKeys.credentials.review(), 'stats'] as const,
    // Progress tracking for multi-step credentials
    progress: (credentialId: string, table: 'driver' | 'vehicle') =>
      ['credential-progress', table, credentialId] as const,
  },

  // ============================================
  // BROKERS
  // ============================================
  brokers: {
    all: ['brokers'] as const,
    lists: () => [...queryKeys.brokers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.brokers.lists(), filters] as const,
    details: () => [...queryKeys.brokers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.brokers.details(), id] as const,
    drivers: (brokerId: string) => 
      [...queryKeys.brokers.detail(brokerId), 'drivers'] as const,
    rates: (brokerId: string) =>
      [...queryKeys.brokers.detail(brokerId), 'rates'] as const,
    eligibleDrivers: (brokerId: string) =>
      [...queryKeys.brokers.detail(brokerId), 'eligible-drivers'] as const,
  },

  // ============================================
  // COMPANIES
  // ============================================
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.companies.lists(), filters] as const,
    details: () => [...queryKeys.companies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    bySlug: (slug: string) => 
      [...queryKeys.companies.all, 'slug', slug] as const,
    theme: (companyId: string) =>
      [...queryKeys.companies.detail(companyId), 'theme'] as const,
  },

  // ============================================
  // INVITATIONS
  // ============================================
  invitations: {
    all: ['invitations'] as const,
    lists: () => [...queryKeys.invitations.all, 'list'] as const,
    list: (companyId?: string) => 
      [...queryKeys.invitations.lists(), companyId] as const,
    byToken: (token: string) =>
      [...queryKeys.invitations.all, 'token', token] as const,
  },

  // ============================================
  // APPLICATIONS
  // ============================================
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.applications.lists(), filters] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
    pending: () => [...queryKeys.applications.all, 'pending'] as const,
  },

  // ============================================
  // USER / PROFILE
  // ============================================
  user: {
    current: ['user', 'current'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    notifications: (userId: string) => ['user', 'notifications', userId] as const,
  },

  // ============================================
  // ONBOARDING
  // ============================================
  onboarding: {
    progress: (driverId: string) => ['onboarding', 'progress', driverId] as const,
    items: (driverId: string) => ['onboarding', 'items', driverId] as const,
  },

  // ============================================
  // VEHICLE ASSIGNMENTS
  // ============================================
  vehicleAssignments: {
    all: ['vehicle-assignments'] as const,
    byDriver: (driverId: string) => 
      [...queryKeys.vehicleAssignments.all, 'driver', driverId] as const,
    byVehicle: (vehicleId: string) => 
      [...queryKeys.vehicleAssignments.all, 'vehicle', vehicleId] as const,
    history: (vehicleId: string) =>
      [...queryKeys.vehicleAssignments.byVehicle(vehicleId), 'history'] as const,
  },

  // ============================================
  // THEME
  // ============================================
  theme: {
    platform: ['theme', 'platform'] as const,
    company: (companyId: string) => ['theme', 'company', companyId] as const,
  },
} as const;

/**
 * Helper to get all keys under a domain for broad invalidation
 */
export function invalidateAllOf(
  domain: keyof typeof queryKeys
): readonly string[] {
  return queryKeys[domain].all;
}
