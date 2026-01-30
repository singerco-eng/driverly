# CODEX-032: FF-001 Automated Tests - Implementation Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

You are implementing the **automated test infrastructure** for Driverly, starting with tests for the Feature Flags system (FF-001). This establishes testing patterns for the entire project.

### What You're Building

1. **Vitest** - Unit and integration tests for services and hooks
2. **Playwright** - E2E tests for UI flows
3. **Test utilities** - Mocks, fixtures, and helpers

---

## Required Reading (In Order)

### 1. The Implementation Spec

```
docs/CODEX-032-FF-001-automated-tests.md   # Full implementation spec with all code
```

### 2. Code Being Tested

```
src/services/featureFlags.ts        # Service layer to unit test
src/hooks/useFeatureFlags.ts        # React hooks to test
src/pages/super-admin/FeatureFlags.tsx  # UI to E2E test
src/components/features/super-admin/CompanyFeaturesTab.tsx  # UI to E2E test
```

### 3. Project Config

```
package.json                        # Add test scripts
vite.config.ts                      # Reference for path aliases
tsconfig.json                       # TypeScript config
```

---

## Implementation Order

Execute tasks in this exact order:

### Phase 1: Infrastructure Setup

1. **Install dependencies** (Task 1.1)
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8 msw
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. **Create Vitest config** (Task 1.2)
   - Create `vitest.config.ts`

3. **Create test setup** (Tasks 1.3-1.5)
   - Create `src/test/setup.ts`
   - Create `src/test/utils.tsx`
   - Create `src/test/mocks/supabase.ts`

4. **Create Playwright config** (Task 2.2)
   - Create `playwright.config.ts`

5. **Create E2E fixtures** (Tasks 2.3-2.4)
   - Create `e2e/fixtures/auth.ts`
   - Create `e2e/fixtures/index.ts`

6. **Update package.json** (Task 7)
   - Add all test scripts

### Phase 2: Unit Tests

7. **Service tests** (Task 3)
   - Create `src/services/__tests__/featureFlags.test.ts`
   - Run: `npm test -- featureFlags.test.ts`

8. **Hook tests** (Task 4)
   - Create `src/hooks/__tests__/useFeatureFlags.test.tsx`
   - Run: `npm test -- useFeatureFlags.test.tsx`

### Phase 3: E2E Tests

9. **Feature Flags page tests** (Task 5)
   - Create `e2e/super-admin/feature-flags.spec.ts`

10. **Company Features tests** (Task 6)
    - Create `e2e/super-admin/company-features.spec.ts`

11. **Run E2E tests**
    - Ensure dev server is running or let Playwright start it
    - Run: `npm run test:e2e`

---

## Key Patterns

### Vitest Mocking Pattern

```typescript
// Mock a module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Import the mocked module
import { supabase } from '@/integrations/supabase/client';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// Setup mock return values
mockFrom.mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: [...], error: null }),
});
```

### React Hook Testing Pattern

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const { result } = renderHook(() => useMyHook(), { wrapper: createWrapper() });

await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

### Playwright E2E Pattern

```typescript
import { test, expect } from '../fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('superAdmin');
    await page.goto('/super-admin/feature-flags');
  });

  test('does something', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible();
    await page.getByRole('button', { name: 'Click me' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

---

## Test User Setup

Before running E2E tests, ensure these users exist in Supabase:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@test.com` | (set in auth.ts) |
| Admin | `admin@test.com` | (set in auth.ts) |
| Driver | `driver@test.com` | (set in auth.ts) |

Update `e2e/fixtures/auth.ts` with actual passwords.

---

## Verification Checklist

After each phase, verify:

### Phase 1: Infrastructure
- [ ] `npm test` runs without errors (may have no tests yet)
- [ ] `vitest.config.ts` loads correctly
- [ ] Playwright installed: `npx playwright --version`

### Phase 2: Unit Tests
- [ ] `npm run test:run` passes all tests
- [ ] `npm run test:coverage` shows coverage report
- [ ] Coverage > 80% for `src/services/featureFlags.ts`

### Phase 3: E2E Tests
- [ ] Dev server starts (manually or via Playwright)
- [ ] `npm run test:e2e` passes all tests
- [ ] `npm run test:e2e:report` opens HTML report

---

## Troubleshooting

### Common Issues

1. **"Cannot find module '@/...'"**
   - Check `vitest.config.ts` has correct path alias
   - Match the alias in `vite.config.ts`

2. **"ResizeObserver is not defined"**
   - Ensure `src/test/setup.ts` has the polyfill

3. **Playwright tests timeout on login**
   - Check test user credentials in `e2e/fixtures/auth.ts`
   - Ensure users exist in Supabase

4. **Tests fail on CI but pass locally**
   - Set `retries: 2` in `playwright.config.ts`
   - Add `await page.waitForTimeout(500)` for flaky interactions

---

## Files to Create (Summary)

| File | Description |
|------|-------------|
| `vitest.config.ts` | Vitest configuration |
| `playwright.config.ts` | Playwright configuration |
| `src/test/setup.ts` | Global test setup |
| `src/test/utils.tsx` | Custom render with providers |
| `src/test/mocks/supabase.ts` | Supabase mock helpers |
| `e2e/fixtures/auth.ts` | Auth fixture with login helper |
| `e2e/fixtures/index.ts` | Fixture exports |
| `src/services/__tests__/featureFlags.test.ts` | Service unit tests |
| `src/hooks/__tests__/useFeatureFlags.test.tsx` | Hook tests |
| `e2e/super-admin/feature-flags.spec.ts` | Feature Flags page E2E |
| `e2e/super-admin/company-features.spec.ts` | Company Features E2E |

---

## Start Here

1. Read the full spec: `docs/CODEX-032-FF-001-automated-tests.md`
2. Install dependencies (Phase 1, step 1)
3. Create config files
4. Write unit tests and verify they pass
5. Write E2E tests and verify they pass

Good luck!
