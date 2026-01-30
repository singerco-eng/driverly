import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllFlags,
  getAllFlagsWithStats,
  getFlagsForCompany,
  isFeatureEnabled,
  getEnabledFlags,
  setGlobalDefault,
  setCompanyOverride,
  removeCompanyOverride,
  clearFlagCache,
} from '../featureFlags';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// Test data
const mockFlags = [
  {
    id: 'flag-1',
    key: 'billing_enabled',
    name: 'Billing System',
    description: 'Enable billing features',
    category: 'billing',
    default_enabled: false,
    is_internal: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'flag-2',
    key: 'driver_management',
    name: 'Driver Management',
    description: 'Manage drivers',
    category: 'core',
    default_enabled: true,
    is_internal: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockOverrides = [
  {
    id: 'override-1',
    company_id: 'company-1',
    flag_id: 'flag-1',
    enabled: true,
    reason: 'Beta tester',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('featureFlags service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearFlagCache();
  });

  describe('getAllFlags', () => {
    it('returns all flags ordered by category and name', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockImplementationOnce(() => mockQuery)
          .mockResolvedValueOnce({ data: mockFlags, error: null }),
      };
      mockFrom.mockReturnValue(mockQuery);

      const result = await getAllFlags();

      expect(mockFrom).toHaveBeenCalledWith('feature_flags');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockFlags);
    });

    it('throws on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockImplementationOnce(() => mockQuery)
          .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } }),
      };
      mockFrom.mockReturnValue(mockQuery);

      await expect(getAllFlags()).rejects.toThrow();
    });
  });

  describe('getAllFlagsWithStats', () => {
    it('returns flags with override counts', async () => {
      const flagsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockImplementationOnce(() => flagsQuery)
          .mockResolvedValueOnce({ data: mockFlags, error: null }),
      };

      const overridesQuery = {
        select: vi.fn().mockResolvedValue({
          data: [{ flag_id: 'flag-1' }, { flag_id: 'flag-1' }],
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce(flagsQuery)
        .mockReturnValueOnce(overridesQuery);

      const result = await getAllFlagsWithStats();

      expect(result[0].override_count).toBe(2);
      expect(result[1].override_count).toBe(0);
    });
  });

  describe('getFlagsForCompany', () => {
    it('returns flags with effective values', async () => {
      const flagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockImplementationOnce(() => flagsQuery)
          .mockResolvedValueOnce({ data: mockFlags, error: null }),
      };

      const overridesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockOverrides, error: null }),
      };

      mockFrom
        .mockReturnValueOnce(flagsQuery)
        .mockReturnValueOnce(overridesQuery);

      const result = await getFlagsForCompany('company-1');

      expect(result[0].effective_value).toBe(true);
      expect(result[0].override).toBeDefined();
      expect(result[1].effective_value).toBe(true);
      expect(result[1].override).toBeUndefined();
    });

    it('excludes internal flags', async () => {
      const flagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };

      mockFrom.mockReturnValueOnce(flagsQuery);

      await getFlagsForCompany('company-1').catch(() => {});

      expect(flagsQuery.eq).toHaveBeenCalledWith('is_internal', false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true when override enables a disabled flag', async () => {
      const flagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'flag-1', default_enabled: false },
          error: null,
        }),
      };

      const overrideQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { enabled: true },
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce(flagQuery)
        .mockReturnValueOnce(overrideQuery);

      const result = await isFeatureEnabled('company-1', 'billing_enabled');

      expect(result).toBe(true);
    });

    it('returns false when override disables an enabled flag', async () => {
      const flagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'flag-2', default_enabled: true },
          error: null,
        }),
      };

      const overrideQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { enabled: false },
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce(flagQuery)
        .mockReturnValueOnce(overrideQuery);

      const result = await isFeatureEnabled('company-1', 'driver_management');

      expect(result).toBe(false);
    });

    it('returns default when no override exists', async () => {
      const flagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'flag-2', default_enabled: true },
          error: null,
        }),
      };

      const overrideQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce(flagQuery)
        .mockReturnValueOnce(overrideQuery);

      const result = await isFeatureEnabled('company-1', 'driver_management');

      expect(result).toBe(true);
    });

    it('returns false for non-existent flag', async () => {
      const flagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockFrom.mockReturnValueOnce(flagQuery);

      const result = await isFeatureEnabled('company-1', 'nonexistent');

      expect(result).toBe(false);
    });

    it('uses cache for repeated calls', async () => {
      const flagQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'flag-1', default_enabled: false },
          error: null,
        }),
      };

      const overrideQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { enabled: true },
          error: null,
        }),
      };

      mockFrom
        .mockReturnValueOnce(flagQuery)
        .mockReturnValueOnce(overrideQuery);

      await isFeatureEnabled('company-1', 'billing_enabled');
      await isFeatureEnabled('company-1', 'billing_enabled');

      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEnabledFlags', () => {
    it('returns effective values for provided keys', async () => {
      const flagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockImplementationOnce(() => flagsQuery)
          .mockResolvedValueOnce({ data: mockFlags, error: null }),
      };

      const overridesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockOverrides, error: null }),
      };

      mockFrom
        .mockReturnValueOnce(flagsQuery)
        .mockReturnValueOnce(overridesQuery);

      const result = await getEnabledFlags('company-1', [
        'billing_enabled',
        'driver_management',
      ]);

      expect(result).toEqual({
        billing_enabled: true,
        driver_management: true,
      });
    });
  });

  describe('setGlobalDefault', () => {
    it('updates flag and clears cache', async () => {
      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(updateQuery);

      await setGlobalDefault('flag-1', true);

      expect(updateQuery.update).toHaveBeenCalledWith({ default_enabled: true });
      expect(updateQuery.eq).toHaveBeenCalledWith('id', 'flag-1');
    });

    it('throws on error', async () => {
      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };

      mockFrom.mockReturnValue(updateQuery);

      await expect(setGlobalDefault('flag-1', true)).rejects.toThrow();
    });
  });

  describe('setCompanyOverride', () => {
    it('upserts override with reason', async () => {
      const upsertQuery = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(upsertQuery);

      await setCompanyOverride('company-1', 'flag-1', true, 'Beta tester');

      expect(upsertQuery.upsert).toHaveBeenCalledWith(
        {
          company_id: 'company-1',
          flag_id: 'flag-1',
          enabled: true,
          reason: 'Beta tester',
        },
        { onConflict: 'company_id,flag_id' }
      );
    });
  });

  describe('removeCompanyOverride', () => {
    it('deletes override', async () => {
      const deleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi
          .fn()
          .mockImplementationOnce(() => deleteQuery)
          .mockResolvedValueOnce({ error: null }),
      };
      mockFrom.mockReturnValue(deleteQuery);

      await removeCompanyOverride('company-1', 'flag-1');

      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenCalledWith('company_id', 'company-1');
      expect(deleteQuery.eq).toHaveBeenCalledWith('flag_id', 'flag-1');
    });
  });
});
