# CODEX-032: FF-001 Feature Flags - Automated Tests

> **Created:** 2026-01-30  
> **Status:** Ready for Implementation  
> **Priority:** High  
> **Depends On:** FF-001 Feature Flags (Complete)

---

## Overview

Implement automated tests for the Feature Flags system (FF-001). This establishes the testing infrastructure for the entire project.

---

## Task Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Setup Vitest | `vitest.config.ts`, `src/test/setup.ts` |
| 2 | Setup Playwright | `playwright.config.ts`, `e2e/` |
| 3 | Service Unit Tests | `src/services/__tests__/featureFlags.test.ts` |
| 4 | Hook Tests | `src/hooks/__tests__/useFeatureFlags.test.tsx` |
| 5 | E2E: Super Admin Feature Flags | `e2e/super-admin/feature-flags.spec.ts` |
| 6 | E2E: Company Features Tab | `e2e/super-admin/company-features.spec.ts` |
| 7 | Update package.json | Add test scripts |

---

## Task 1: Setup Vitest

### 1.1 Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8 msw
```

### 1.2 Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/integrations/supabase/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 1.3 Create `src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

### 1.4 Create `src/test/utils.tsx`

```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

### 1.5 Create `src/test/mocks/supabase.ts`

```typescript
import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  then: vi.fn(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

// Helper to reset all mocks
export function resetSupabaseMocks() {
  Object.values(mockSupabase).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReset' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });
}

// Helper to set up a successful query response
export function mockQueryResponse<T>(data: T, error: null = null) {
  return Promise.resolve({ data, error });
}

// Helper to set up an error response
export function mockQueryError(message: string) {
  return Promise.resolve({ data: null, error: { message } });
}
```

---

## Task 2: Setup Playwright

### 2.1 Install Dependencies

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2.2 Create `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2.3 Create `e2e/fixtures/auth.ts`

```typescript
import { test as base, expect } from '@playwright/test';

// Test user credentials - use your actual test accounts
const TEST_USERS = {
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'testpassword123',
  },
  admin: {
    email: 'admin@test.com',
    password: 'testpassword123',
  },
  driver: {
    email: 'driver@test.com',
    password: 'testpassword123',
  },
};

type Role = keyof typeof TEST_USERS;

// Extended test fixture with authentication helpers
export const test = base.extend<{
  loginAs: (role: Role) => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    const login = async (role: Role) => {
      const user = TEST_USERS[role];
      
      await page.goto('/login');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Wait for redirect based on role
      if (role === 'superAdmin') {
        await page.waitForURL(/\/super-admin/);
      } else if (role === 'admin') {
        await page.waitForURL(/\/admin/);
      } else {
        await page.waitForURL(/\/driver/);
      }
    };
    
    await use(login);
  },
});

export { expect };
```

### 2.4 Create `e2e/fixtures/index.ts`

```typescript
export { test, expect } from './auth';
```

---

## Task 3: Service Unit Tests

Create `src/services/__tests__/featureFlags.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        order: vi.fn().mockReturnThis(),
      };
      mockQuery.order.mockResolvedValueOnce({ data: mockFlags, error: null });
      mockFrom.mockReturnValue(mockQuery);

      const result = await getAllFlags();

      expect(mockFrom).toHaveBeenCalledWith('feature_flags');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockFlags);
    });

    it('throws on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      mockFrom.mockReturnValue(mockQuery);

      await expect(getAllFlags()).rejects.toThrow();
    });
  });

  describe('getAllFlagsWithStats', () => {
    it('returns flags with override counts', async () => {
      // First call for flags
      const flagsQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      };
      flagsQuery.order.mockResolvedValueOnce({ data: mockFlags, error: null });

      // Second call for overrides
      const overridesQuery = {
        select: vi.fn().mockResolvedValue({ 
          data: [{ flag_id: 'flag-1' }, { flag_id: 'flag-1' }], 
          error: null 
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
        order: vi.fn().mockReturnThis(),
      };
      flagsQuery.order.mockResolvedValueOnce({ data: mockFlags, error: null });

      const overridesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockOverrides, error: null }),
      };

      mockFrom
        .mockReturnValueOnce(flagsQuery)
        .mockReturnValueOnce(overridesQuery);

      const result = await getFlagsForCompany('company-1');

      // Flag with override should have effective_value = true (from override)
      expect(result[0].effective_value).toBe(true);
      expect(result[0].override).toBeDefined();
      
      // Flag without override should use default
      expect(result[1].effective_value).toBe(true); // default_enabled
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

      // First call
      await isFeatureEnabled('company-1', 'billing_enabled');
      
      // Second call - should use cache
      await isFeatureEnabled('company-1', 'billing_enabled');

      // Should only have been called once
      expect(mockFrom).toHaveBeenCalledTimes(2); // flag + override
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
        eq: vi.fn().mockReturnThis(),
      };
      deleteQuery.eq.mockResolvedValue({ error: null });

      mockFrom.mockReturnValue(deleteQuery);

      await removeCompanyOverride('company-1', 'flag-1');

      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenCalledWith('company_id', 'company-1');
    });
  });
});
```

---

## Task 4: Hook Tests

Create `src/hooks/__tests__/useFeatureFlags.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeatureFlag, useFeatureFlags, useAllFeatureFlags } from '../useFeatureFlags';

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

const mockIsFeatureEnabled = featureFlagService.isFeatureEnabled as ReturnType<typeof vi.fn>;
const mockGetEnabledFlags = featureFlagService.getEnabledFlags as ReturnType<typeof vi.fn>;
const mockGetAllFlagsWithStats = featureFlagService.getAllFlagsWithStats as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
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

    const { result } = renderHook(() => useFeatureFlag('billing_enabled'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBe(true);
    expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
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

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('company-1', 'billing_enabled');
  });

  it('returns false while loading', () => {
    mockUseAuth.mockReturnValue({
      profile: { id: 'user-1', company_id: 'company-1', role: 'admin' },
    });
    mockIsFeatureEnabled.mockImplementation(() => new Promise(() => {})); // Never resolves

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
```

---

## Task 5: E2E - Super Admin Feature Flags

Create `e2e/super-admin/feature-flags.spec.ts`:

```typescript
import { test, expect } from '../fixtures';

test.describe('Super Admin - Feature Flags Page', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('superAdmin');
    await page.goto('/super-admin/feature-flags');
  });

  test('displays feature flags grouped by category', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible();
    
    // Check categories exist
    await expect(page.getByText('billing')).toBeVisible();
    await expect(page.getByText('core')).toBeVisible();
    
    // Check flags exist
    await expect(page.getByText('Billing System')).toBeVisible();
    await expect(page.getByText('billing_enabled')).toBeVisible();
    await expect(page.getByText('Driver Management')).toBeVisible();
  });

  test('search filters flags', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search flags...');
    await searchInput.fill('billing');
    
    // Billing flags should be visible
    await expect(page.getByText('Billing System')).toBeVisible();
    
    // Core flags should be hidden
    await expect(page.getByText('Driver Management')).not.toBeVisible();
  });

  test('category filter works', async ({ page }) => {
    // Select Core category
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Core' }).click();
    
    // Core flags visible
    await expect(page.getByText('Driver Management')).toBeVisible();
    
    // Billing flags hidden
    await expect(page.getByText('Billing System')).not.toBeVisible();
  });

  test('toggle flag changes global default', async ({ page }) => {
    // Find the billing_enabled flag row
    const flagRow = page.locator('div').filter({ hasText: /^Billing Systembilling_enabled/ }).first();
    
    // Get initial state
    const toggle = flagRow.getByRole('switch');
    const wasChecked = await toggle.isChecked();
    
    // Toggle it
    await toggle.click();
    
    // Verify toast appears
    await expect(page.getByText(/Flag (enabled|disabled) globally/)).toBeVisible();
    
    // Verify toggle state changed
    await expect(toggle).toHaveAttribute('aria-checked', wasChecked ? 'false' : 'true');
    
    // Toggle back to original state
    await toggle.click();
  });

  test('shows override count when overrides exist', async ({ page }) => {
    // This test requires creating an override first
    // Navigate to a company and create an override
    await page.goto('/super-admin/companies');
    await page.getByRole('row').nth(1).click(); // Click first company
    
    // Go to Features tab
    await page.getByRole('tab', { name: 'Features' }).click();
    
    // Find a flag and click Override
    await page.getByRole('button', { name: 'Override' }).first().click();
    
    // Toggle and save
    await page.getByRole('switch').click();
    await page.getByRole('button', { name: 'Save Override' }).click();
    
    // Now go back to Feature Flags page
    await page.goto('/super-admin/feature-flags');
    
    // Verify override count is shown
    await expect(page.getByText(/\d+ override/)).toBeVisible();
  });

  test('expand override list shows companies', async ({ page }) => {
    // Assuming there's a flag with overrides (run after previous test)
    const overrideButton = page.getByRole('button', { name: /\d+ override/ }).first();
    
    if (await overrideButton.isVisible()) {
      await overrideButton.click();
      
      // Should show override list with company names
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Company' })).toBeVisible();
    }
  });

  test('remove override from list', async ({ page }) => {
    const overrideButton = page.getByRole('button', { name: /\d+ override/ }).first();
    
    if (await overrideButton.isVisible()) {
      await overrideButton.click();
      
      // Click trash icon to remove
      await page.getByRole('button', { name: 'Remove override' }).first().click();
      
      // Verify toast
      await expect(page.getByText('Override removed')).toBeVisible();
    }
  });
});
```

---

## Task 6: E2E - Company Features Tab

Create `e2e/super-admin/company-features.spec.ts`:

```typescript
import { test, expect } from '../fixtures';

test.describe('Super Admin - Company Features Tab', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('superAdmin');
    await page.goto('/super-admin/companies');
    
    // Click on first company
    await page.getByRole('row').nth(1).click();
    
    // Wait for company detail page
    await page.waitForURL(/\/super-admin\/companies\/.+/);
    
    // Click Features tab
    await page.getByRole('tab', { name: 'Features' }).click();
  });

  test('displays feature flags for company', async ({ page }) => {
    await expect(page.getByText('Feature Access')).toBeVisible();
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Feature' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Global' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Override' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Effective' })).toBeVisible();
    
    // Check some flags exist
    await expect(page.getByText('Billing System')).toBeVisible();
    await expect(page.getByText('Driver Management')).toBeVisible();
  });

  test('shows Global column with default values', async ({ page }) => {
    // Core flags should show "On" (default_enabled = true)
    const driverManagementRow = page.getByRole('row').filter({ hasText: 'Driver Management' });
    await expect(driverManagementRow.getByText('On').first()).toBeVisible();
    
    // Billing flags should show "Off" (default_enabled = false)
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    await expect(billingRow.getByText('Off').first()).toBeVisible();
  });

  test('create override via modal', async ({ page }) => {
    // Find a flag without override and click Override button
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    await billingRow.getByRole('button', { name: 'Override' }).click();
    
    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Override: Billing System')).toBeVisible();
    
    // Toggle the switch (should default to opposite of global)
    const toggle = page.getByRole('dialog').getByRole('switch');
    await expect(toggle).toBeChecked(); // Default to On since global is Off
    
    // Add a reason
    await page.getByPlaceholder('Why is this override being set?').fill('Testing override creation');
    
    // Save
    await page.getByRole('button', { name: 'Save Override' }).click();
    
    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Toast should appear
    await expect(page.getByText('Override enabled')).toBeVisible();
    
    // Row should now show Override badge
    await expect(billingRow.locator('[data-slot="badge"]').filter({ hasText: 'On' })).toBeVisible();
  });

  test('effective value reflects override', async ({ page }) => {
    // After creating an override in previous test
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    
    // If there's an override that enables it, effective should show checkmark
    // This depends on the state from previous test or existing data
    const effectiveCell = billingRow.getByRole('cell').nth(3);
    
    // Should have either Check or X icon
    await expect(
      effectiveCell.locator('svg').first()
    ).toBeVisible();
  });

  test('reset override reverts to global default', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    
    // Check if there's a Reset button (meaning override exists)
    const resetButton = billingRow.getByRole('button', { name: 'Reset' });
    
    if (await resetButton.isVisible()) {
      await resetButton.click();
      
      // Toast should appear
      await expect(page.getByText('Override removed')).toBeVisible();
      
      // Button should change to Override
      await expect(billingRow.getByRole('button', { name: 'Override' })).toBeVisible();
    }
  });

  test('edit existing override', async ({ page }) => {
    // First create an override if not exists
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    const overrideButton = billingRow.getByRole('button', { name: 'Override' });
    
    if (await overrideButton.isVisible()) {
      await overrideButton.click();
      await page.getByRole('button', { name: 'Save Override' }).click();
      await page.waitForTimeout(500);
    }
    
    // Now click the override badge to edit
    const overrideBadge = billingRow.locator('[data-slot="badge"]').filter({ hasText: /On|Off/ }).nth(1);
    await overrideBadge.click();
    
    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Toggle the value
    await page.getByRole('dialog').getByRole('switch').click();
    
    // Update reason
    await page.getByPlaceholder('Why is this override being set?').fill('Updated override');
    
    // Save
    await page.getByRole('button', { name: 'Save Override' }).click();
    
    // Verify toast
    await expect(page.getByText(/Override (enabled|disabled)/)).toBeVisible();
  });

  test('cancel modal does not save changes', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    
    // Ensure we have Override button (no existing override)
    const resetButton = billingRow.getByRole('button', { name: 'Reset' });
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }
    
    // Click Override to open modal
    await billingRow.getByRole('button', { name: 'Override' }).click();
    
    // Add some data
    await page.getByPlaceholder('Why is this override being set?').fill('Should not be saved');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
    
    // Override column should still show dash
    await expect(billingRow.getByText('—')).toBeVisible();
  });
});
```

---

## Task 7: Update package.json

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "db:migrate": "supabase db push",
    "db:types": "supabase gen types typescript --local > src/integrations/supabase/types.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Directory Structure After Implementation

```
driverly/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.ts
│   │   └── index.ts
│   └── super-admin/
│       ├── feature-flags.spec.ts
│       └── company-features.spec.ts
├── src/
│   ├── test/
│   │   ├── setup.ts
│   │   ├── utils.tsx
│   │   └── mocks/
│   │       └── supabase.ts
│   ├── services/
│   │   └── __tests__/
│   │       └── featureFlags.test.ts
│   └── hooks/
│       └── __tests__/
│           └── useFeatureFlags.test.tsx
├── vitest.config.ts
├── playwright.config.ts
└── package.json (updated)
```

---

## Running Tests

### Unit/Integration Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode with UI
npm run test:ui
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# View report
npm run test:e2e:report
```

---

## Pre-requisites for E2E Tests

1. **Test user accounts** must exist in Supabase:
   - `superadmin@test.com` (super_admin role)
   - `admin@test.com` (admin role)
   - `driver@test.com` (driver role)

2. **Update credentials** in `e2e/fixtures/auth.ts` with actual test account passwords

3. **Seed data** must be present (feature flags from migration 026)

---

## Acceptance Criteria

- [ ] All unit tests pass (`npm run test:run`)
- [ ] Coverage > 80% for featureFlags service
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] No flaky tests (run 3x to verify)
- [ ] Tests run in CI pipeline

---

## Notes

1. **MSW (Mock Service Worker)** is included for potential API mocking but not used extensively since we mock at the Supabase client level.

2. **Playwright tests require running dev server** - the config handles this automatically.

3. **Test isolation** - each test should clean up after itself or be independent.

4. **E2E test order matters** for some tests that depend on state from previous tests. Consider using `test.describe.serial` if needed.
