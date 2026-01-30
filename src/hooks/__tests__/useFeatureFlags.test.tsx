import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useFeatureFlag,
  useFeatureFlags,
  useAllFeatureFlags,
} from '../useFeatureFlags';

// Mock the service
vi.mock('@/services/featureFlags', () => ({
  isFeatureEnabled: vi.fn(),
  getEnabledFlags: vi.fn(),
  getAllFlagsWithStats: vi.fn(),
  getFlagsForCompany: vi.fn(),
  getOverridesForFlag: vi.fn(),
  setGlobalDefault: vi.fn(),
  setCompanyOverride: vi.fn(),
  removeCompanyOverride: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      id: 'user-1',
      company_id: 'company-1',
      role: 'admin',
    },
  })),
}));

import * as featureFlagService from '@/services/featureFlags';
import { useAuth } from '@/contexts/AuthContext';

const mockIsFeatureEnabled = featureFlagService.isFeatureEnabled as ReturnType<
  typeof vi.fn
>;
const mockGetEnabledFlags = featureFlagService.getEnabledFlags as ReturnType<
  typeof vi.fn
>;
const mockGetAllFlagsWithStats =
  featureFlagService.getAllFlagsWithStats as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no company_id', async () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: null, role: 'admin' },
    });

    const { result } = renderHook(() => useFeatureFlag('billing_enabled'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it('returns true for super_admin regardless of flag value', async () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'super_admin' },
    });
    mockIsFeatureEnabled.mockResolvedValue(false);

    const { result } = renderHook(() => useFeatureFlag('billing_enabled'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
  });

  it('returns service result for admin', async () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'admin' },
    });
    mockIsFeatureEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useFeatureFlag('billing_enabled'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith(
      'company-1',
      'billing_enabled'
    );
  });

  it('returns false while loading', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'admin' },
    });
    mockIsFeatureEnabled.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useFeatureFlag('billing_enabled'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(false);
  });
});

describe('useFeatureFlags (batch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all true for super_admin', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'super_admin' },
    });
    mockGetEnabledFlags.mockResolvedValue({
      billing_enabled: true,
      driver_management: true,
    });

    const { result } = renderHook(
      () => useFeatureFlags(['billing_enabled', 'driver_management']),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual({
      billing_enabled: true,
      driver_management: true,
    });
  });

  it('returns service results for admin', async () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'admin' },
    });
    mockGetEnabledFlags.mockResolvedValue({
      billing_enabled: false,
      driver_management: true,
    });

    const { result } = renderHook(
      () => useFeatureFlags(['billing_enabled', 'driver_management']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        billing_enabled: false,
        driver_management: true,
      });
    });
  });
});

describe('useAllFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all flags with stats', async () => {
    const mockFlags = [
      { id: 'flag-1', key: 'billing_enabled', name: 'Billing', override_count: 2 },
    ];
    mockGetAllFlagsWithStats.mockResolvedValue(mockFlags);

    const { result } = renderHook(() => useAllFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockFlags);
    });
  });
});
