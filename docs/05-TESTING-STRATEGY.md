# Driverly Platform - Testing Strategy

> **Last Updated:** 2026-01-16  
> **Status:** Draft - Pending Review

---

## Philosophy

### Spec-Driven Test-First Development

Tests are written **from feature specifications**, not from implementation code. This prevents circular validation where agents write tests that simply confirm their own code works.

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Feature Spec  │────▶│  Write Tests   │────▶│  Write Code    │
│  (Human + AI)  │     │  (Agent A)     │     │  (Agent B)     │
└────────────────┘     └────────────────┘     └────────────────┘
                              │                       │
                              │   Human reviews       │   Tests must pass
                              │   tests before        │   before merge
                              │   implementation      │
                              ▼                       ▼
                       ┌────────────────┐     ┌────────────────┐
                       │  Tests define  │     │  Code fulfills │
                       │  requirements  │     │  requirements  │
                       └────────────────┘     └────────────────┘
```

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Tests from specs** | Tests derive from feature specs, not code |
| **Behavior over implementation** | Test what the system does, not how |
| **Contract validation** | Schema/types are the contract, tests verify compliance |
| **Separation of concerns** | Test writing and implementation in separate contexts |
| **Tests as documentation** | Tests demonstrate intended behavior |

---

## Agentic Testing Workflow

### The Two-Phase Pattern

**Phase 1: Test Writing**
```
INPUT:
- Feature spec (e.g., AD-001-driver-applications.md)
- Database schema reference
- Test pattern examples

AGENT TASK:
"Write tests for feature AD-001 based on the spec's acceptance criteria.
Do NOT write implementation code. Only write test files."

OUTPUT:
- Test files that will initially FAIL (no implementation yet)
- Tests cover all acceptance criteria from spec
```

**Phase 2: Implementation**
```
INPUT:
- Feature spec
- Test files from Phase 1 (read-only)
- Architecture guidelines

AGENT TASK:
"Implement feature AD-001 to make all tests pass.
Do NOT modify test files. Only write implementation code."

OUTPUT:
- Implementation code
- All tests passing
```

### Context Loading for Test Writing

When prompting an agent to write tests, load:

```
1. 00-INDEX.md (always)
2. 05-TESTING-STRATEGY.md (this document)
3. The specific feature spec (e.g., AD-001)
4. 02-DATABASE-SCHEMA.md (for contract tests)
5. Example test files (for patterns)
```

### Context Loading for Implementation

When prompting an agent to implement, load:

```
1. 00-INDEX.md (always)
2. The specific feature spec
3. The test files (read-only reference)
4. 01-ARCHITECTURE.md
5. 04-FRONTEND-GUIDELINES.md (if UI work)
```

---

## Test Types

### 1. Contract Tests (Database/API)

**Purpose:** Verify data matches schema contracts.  
**When:** After schema is defined, before feature implementation.  
**Source:** Generated from database types.

```typescript
// tests/contracts/driver.contract.test.ts
import { Database } from '@/types/database';

type Driver = Database['public']['Tables']['drivers']['Row'];
type DriverInsert = Database['public']['Tables']['drivers']['Insert'];

describe('Driver Contract', () => {
  describe('Schema Compliance', () => {
    it('driver row matches expected shape', () => {
      const driver: Driver = {
        id: 'uuid',
        user_id: 'uuid',
        company_id: 'uuid',
        employment_type: 'w2',
        date_of_birth: '1990-01-01',
        ssn_last_four: '1234',
        license_number: 'D1234567',
        license_state: 'CA',
        license_expiration: '2025-12-31',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '555-1234',
        emergency_contact_relation: 'Spouse',
        application_status: 'pending',
        application_date: '2026-01-16T00:00:00Z',
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
        status: 'inactive',
        admin_notes: null,
        created_at: '2026-01-16T00:00:00Z',
        updated_at: '2026-01-16T00:00:00Z',
      };
      
      // TypeScript compilation IS the test
      expect(driver).toBeDefined();
    });
    
    it('employment_type only allows valid values', () => {
      const validTypes = ['w2', '1099'];
      
      validTypes.forEach(type => {
        const driver: DriverInsert = {
          user_id: 'uuid',
          company_id: 'uuid',
          employment_type: type as 'w2' | '1099',
        };
        expect(driver.employment_type).toBe(type);
      });
    });
    
    it('application_status only allows valid values', () => {
      const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'withdrawn'];
      
      validStatuses.forEach(status => {
        // Type system should catch invalid statuses
        expect(validStatuses).toContain(status);
      });
    });
  });
});
```

### 2. Integration Tests (Behavior)

**Purpose:** Test feature behavior through API/hooks.  
**When:** Written from spec BEFORE implementation.  
**Source:** Feature spec acceptance criteria.

```typescript
// tests/integration/drivers/driver-application.test.ts
/**
 * Feature: AD-001 Driver Applications
 * Spec: docs/features/admin/AD-001-driver-applications.md
 */

import { createTestClient } from '@/tests/utils/supabase';
import { createTestCompany, createTestDriver } from '@/tests/factories';

describe('Feature: AD-001 Driver Applications', () => {
  let adminClient: SupabaseClient;
  let company: Company;
  
  beforeAll(async () => {
    company = await createTestCompany();
    adminClient = await createTestClient({ role: 'admin', companyId: company.id });
  });
  
  afterAll(async () => {
    await cleanupTestData(company.id);
  });

  /**
   * Acceptance Criteria from Spec:
   * "Admin can view list of pending driver applications"
   */
  describe('AC: Admin can view pending applications', () => {
    it('returns only pending applications for admin company', async () => {
      // Arrange
      const pendingDriver = await createTestDriver({
        companyId: company.id,
        applicationStatus: 'pending',
      });
      const approvedDriver = await createTestDriver({
        companyId: company.id,
        applicationStatus: 'approved',
      });
      const otherCompanyDriver = await createTestDriver({
        companyId: 'other-company-id',
        applicationStatus: 'pending',
      });
      
      // Act
      const { data: applications } = await adminClient
        .from('drivers')
        .select('*')
        .eq('application_status', 'pending');
      
      // Assert
      expect(applications).toHaveLength(1);
      expect(applications[0].id).toBe(pendingDriver.id);
    });
  });

  /**
   * Acceptance Criteria from Spec:
   * "Admin can approve a driver application"
   */
  describe('AC: Admin can approve application', () => {
    it('sets application_status to approved with timestamp', async () => {
      // Arrange
      const driver = await createTestDriver({
        companyId: company.id,
        applicationStatus: 'pending',
      });
      
      // Act
      const { data: updated } = await adminClient
        .from('drivers')
        .update({
          application_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminClient.auth.user().id,
        })
        .eq('id', driver.id)
        .select()
        .single();
      
      // Assert
      expect(updated.application_status).toBe('approved');
      expect(updated.approved_at).toBeDefined();
      expect(updated.approved_by).toBeDefined();
    });
    
    it('cannot approve driver from different company', async () => {
      // Arrange
      const otherDriver = await createTestDriver({
        companyId: 'other-company-id',
        applicationStatus: 'pending',
      });
      
      // Act
      const { data, error } = await adminClient
        .from('drivers')
        .update({ application_status: 'approved' })
        .eq('id', otherDriver.id)
        .select();
      
      // Assert - RLS should block this
      expect(data).toHaveLength(0);
    });
  });

  /**
   * Acceptance Criteria from Spec:
   * "Admin can reject a driver application with reason"
   */
  describe('AC: Admin can reject application', () => {
    it('sets rejection_reason when rejecting', async () => {
      // Arrange
      const driver = await createTestDriver({
        companyId: company.id,
        applicationStatus: 'pending',
      });
      const reason = 'Incomplete documentation';
      
      // Act
      const { data: updated } = await adminClient
        .from('drivers')
        .update({
          application_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', driver.id)
        .select()
        .single();
      
      // Assert
      expect(updated.application_status).toBe('rejected');
      expect(updated.rejection_reason).toBe(reason);
    });
  });
});
```

### 3. RLS Policy Tests

**Purpose:** Verify row-level security works correctly.  
**When:** After schema, before features.  
**Source:** Permission matrix from 03-AUTHENTICATION.md.

```typescript
// tests/security/rls/drivers.rls.test.ts
/**
 * RLS Policy Tests for drivers table
 * Reference: 02-DATABASE-SCHEMA.md, 03-AUTHENTICATION.md
 */

describe('drivers RLS Policies', () => {
  let superAdminClient: SupabaseClient;
  let adminClient: SupabaseClient;
  let coordinatorClient: SupabaseClient;
  let driverClient: SupabaseClient;
  let otherCompanyAdminClient: SupabaseClient;
  
  let company: Company;
  let driver: Driver;

  beforeAll(async () => {
    // Setup test data and clients with different roles
    company = await createTestCompany();
    driver = await createTestDriver({ companyId: company.id });
    
    superAdminClient = await createTestClient({ role: 'super_admin' });
    adminClient = await createTestClient({ role: 'admin', companyId: company.id });
    coordinatorClient = await createTestClient({ role: 'coordinator', companyId: company.id });
    driverClient = await createTestClient({ role: 'driver', companyId: company.id, driverId: driver.id });
    otherCompanyAdminClient = await createTestClient({ role: 'admin', companyId: 'other-company' });
  });

  describe('SELECT policies', () => {
    it('super_admin can read all drivers', async () => {
      const { data } = await superAdminClient.from('drivers').select('*');
      expect(data.length).toBeGreaterThan(0);
    });
    
    it('admin can read own company drivers', async () => {
      const { data } = await adminClient.from('drivers').select('*');
      expect(data.every(d => d.company_id === company.id)).toBe(true);
    });
    
    it('admin cannot read other company drivers', async () => {
      const { data } = await otherCompanyAdminClient
        .from('drivers')
        .select('*')
        .eq('company_id', company.id);
      expect(data).toHaveLength(0);
    });
    
    it('coordinator can read own company drivers', async () => {
      const { data } = await coordinatorClient.from('drivers').select('*');
      expect(data.every(d => d.company_id === company.id)).toBe(true);
    });
    
    it('driver can only read own profile', async () => {
      const { data } = await driverClient.from('drivers').select('*');
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(driver.id);
    });
  });

  describe('UPDATE policies', () => {
    it('admin can update company drivers', async () => {
      const { error } = await adminClient
        .from('drivers')
        .update({ admin_notes: 'Test note' })
        .eq('id', driver.id);
      expect(error).toBeNull();
    });
    
    it('driver can update own limited fields', async () => {
      const { error } = await driverClient
        .from('drivers')
        .update({ emergency_contact_name: 'New Contact' })
        .eq('id', driver.id);
      expect(error).toBeNull();
    });
    
    it('driver cannot update application_status', async () => {
      const { data } = await driverClient
        .from('drivers')
        .update({ application_status: 'approved' })
        .eq('id', driver.id)
        .select();
      
      // Should either error or not update
      const { data: current } = await driverClient
        .from('drivers')
        .select('application_status')
        .eq('id', driver.id)
        .single();
      
      expect(current.application_status).not.toBe('approved');
    });
  });

  describe('INSERT policies', () => {
    it('admin can create drivers', async () => {
      const { error } = await adminClient.from('drivers').insert({
        user_id: 'new-user-id',
        company_id: company.id,
        employment_type: 'w2',
      });
      // Note: May fail on FK constraint, but RLS should allow
      expect(error?.code).not.toBe('42501'); // permission denied
    });
  });

  describe('DELETE policies', () => {
    it('admin can delete company drivers', async () => {
      const tempDriver = await createTestDriver({ companyId: company.id });
      const { error } = await adminClient
        .from('drivers')
        .delete()
        .eq('id', tempDriver.id);
      expect(error).toBeNull();
    });
    
    it('driver cannot delete own profile', async () => {
      const { error } = await driverClient
        .from('drivers')
        .delete()
        .eq('id', driver.id);
      expect(error).not.toBeNull();
    });
  });
});
```

### 4. Hook/Query Tests

**Purpose:** Test React Query hooks in isolation.  
**When:** Written from spec BEFORE implementation.  
**Source:** Feature spec + API patterns.

```typescript
// tests/hooks/useDrivers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrivers, useDriver, useUpdateDriver } from '@/hooks/queries/useDrivers';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

describe('useDrivers hooks', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useDrivers', () => {
    it('fetches drivers list', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: [{ id: '1', full_name: 'Test Driver' }],
          error: null,
        }),
      });

      const { result } = renderHook(() => useDrivers(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('filters by application status', async () => {
      const { result } = renderHook(
        () => useDrivers({ applicationStatus: 'pending' }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Verify filter was applied
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('drivers');
    });
  });

  describe('useUpdateDriver', () => {
    it('invalidates queries on success', async () => {
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      
      const { result } = renderHook(() => useUpdateDriver(), { wrapper });
      
      await result.current.mutateAsync({
        id: '1',
        data: { status: 'active' },
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['drivers'],
      });
    });
  });
});
```

### 5. Component Tests (Behavior)

**Purpose:** Test component behavior, not implementation.  
**When:** Written from spec BEFORE implementation.  
**Source:** Feature spec UI requirements.

```typescript
// tests/components/admin/DriverApplicationCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DriverApplicationCard } from '@/components/admin/DriverApplicationCard';

/**
 * Feature: AD-001 Driver Applications
 * Component: DriverApplicationCard
 * 
 * UI Requirements from spec:
 * - Shows driver name, application date, employment type
 * - Approve button triggers approval flow
 * - Reject button opens rejection reason modal
 */

describe('DriverApplicationCard', () => {
  const mockDriver = {
    id: '1',
    user: { full_name: 'John Smith', email: 'john@test.com' },
    employment_type: '1099',
    application_status: 'pending',
    application_date: '2026-01-15T00:00:00Z',
  };

  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays driver information', () => {
    render(
      <DriverApplicationCard
        driver={mockDriver}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('1099')).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it('calls onApprove when approve button clicked', async () => {
    render(
      <DriverApplicationCard
        driver={mockDriver}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalledWith(mockDriver.id);
    });
  });

  it('opens rejection modal when reject clicked', async () => {
    render(
      <DriverApplicationCard
        driver={mockDriver}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));

    // Modal should appear
    expect(screen.getByText(/rejection reason/i)).toBeInTheDocument();
  });

  it('requires reason before confirming rejection', async () => {
    render(
      <DriverApplicationCard
        driver={mockDriver}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /reject/i }));
    
    // Confirm button should be disabled without reason
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    expect(confirmButton).toBeDisabled();

    // Enter reason
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'Incomplete documents' },
    });

    // Now should be enabled
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith(mockDriver.id, 'Incomplete documents');
    });
  });
});
```

### 6. E2E Tests (Playwright)

**Purpose:** Test complete user flows.  
**When:** After implementation, by different agent/session.  
**Source:** Feature spec user stories.

```typescript
// tests/e2e/admin/driver-applications.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin, createTestDriverApplication } from '../helpers';

/**
 * Feature: AD-001 Driver Applications
 * E2E Tests for complete user flows
 */

test.describe('Admin: Driver Applications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can view pending applications', async ({ page }) => {
    // Setup: Create pending application
    const driver = await createTestDriverApplication({ status: 'pending' });

    // Navigate to applications
    await page.goto('/admin/drivers/applications');

    // Should see the application
    await expect(page.locator(`[data-driver-id="${driver.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-driver-id="${driver.id}"]`))
      .toContainText(driver.fullName);
  });

  test('admin can approve a driver application', async ({ page }) => {
    // Setup
    const driver = await createTestDriverApplication({ status: 'pending' });

    // Navigate
    await page.goto('/admin/drivers/applications');

    // Click approve
    await page.click(`[data-driver-id="${driver.id}"] [data-action="approve"]`);

    // Confirm in modal
    await page.click('[data-testid="confirm-approve"]');

    // Verify success
    await expect(page.locator('[data-testid="toast"]'))
      .toContainText('Application approved');

    // Driver should no longer be in pending list
    await expect(page.locator(`[data-driver-id="${driver.id}"]`))
      .not.toBeVisible();
  });

  test('admin can reject with reason', async ({ page }) => {
    // Setup
    const driver = await createTestDriverApplication({ status: 'pending' });

    // Navigate
    await page.goto('/admin/drivers/applications');

    // Click reject
    await page.click(`[data-driver-id="${driver.id}"] [data-action="reject"]`);

    // Enter reason
    await page.fill('[name="rejectionReason"]', 'Failed background check');

    // Confirm
    await page.click('[data-testid="confirm-reject"]');

    // Verify
    await expect(page.locator('[data-testid="toast"]'))
      .toContainText('Application rejected');
  });

  test('admin cannot see other company applications', async ({ page }) => {
    // Setup: Application for different company
    const otherCompanyDriver = await createTestDriverApplication({
      status: 'pending',
      companyId: 'other-company-id',
    });

    // Navigate
    await page.goto('/admin/drivers/applications');

    // Should NOT see the other company's application
    await expect(page.locator(`[data-driver-id="${otherCompanyDriver.id}"]`))
      .not.toBeVisible();
  });
});
```

---

## Test Infrastructure

### Test Factories

Create reusable factories for test data:

```typescript
// tests/factories/index.ts
import { faker } from '@faker-js/faker';
import { supabaseAdmin } from './supabase-admin';

export async function createTestCompany(overrides = {}) {
  const company = {
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    status: 'active',
    ...overrides,
  };

  const { data } = await supabaseAdmin
    .from('companies')
    .insert(company)
    .select()
    .single();

  return data;
}

export async function createTestDriver(overrides = {}) {
  // First create user if not provided
  const user = overrides.user || await createTestUser({
    role: 'driver',
    companyId: overrides.companyId,
  });

  const driver = {
    user_id: user.id,
    company_id: overrides.companyId,
    employment_type: '1099',
    application_status: 'pending',
    application_date: new Date().toISOString(),
    ...overrides,
  };

  const { data } = await supabaseAdmin
    .from('drivers')
    .insert(driver)
    .select('*, user:users(*)')
    .single();

  return data;
}

export async function createTestVehicle(overrides = {}) {
  const vehicle = {
    company_id: overrides.companyId,
    owner_type: 'company',
    vehicle_type: 'sedan',
    make: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    year: faker.number.int({ min: 2018, max: 2026 }),
    license_plate: faker.vehicle.vrm(),
    status: 'active',
    ...overrides,
  };

  const { data } = await supabaseAdmin
    .from('vehicles')
    .insert(vehicle)
    .select()
    .single();

  return data;
}
```

### Test Client Factory

Create authenticated test clients:

```typescript
// tests/utils/test-client.ts
import { createClient } from '@supabase/supabase-js';

interface TestClientOptions {
  role: 'super_admin' | 'admin' | 'coordinator' | 'driver';
  companyId?: string;
  driverId?: string;
}

export async function createTestClient(options: TestClientOptions) {
  // Create a user with specific claims for testing
  const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
    email: `test-${Date.now()}@test.com`,
    password: 'TestPassword123!',
    email_confirm: true,
    app_metadata: {
      role: options.role,
      company_id: options.companyId || null,
      driver_id: options.driverId || null,
    },
  });

  // Create client and sign in
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  await client.auth.signInWithPassword({
    email: authUser.user.email,
    password: 'TestPassword123!',
  });

  return client;
}
```

### Test Cleanup

```typescript
// tests/utils/cleanup.ts
export async function cleanupTestData(companyId: string) {
  // Delete in reverse dependency order
  await supabaseAdmin.from('vehicle_credentials').delete().eq('company_id', companyId);
  await supabaseAdmin.from('driver_credentials').delete().eq('company_id', companyId);
  await supabaseAdmin.from('driver_vehicle_assignments').delete().eq('company_id', companyId);
  await supabaseAdmin.from('vehicles').delete().eq('company_id', companyId);
  await supabaseAdmin.from('drivers').delete().eq('company_id', companyId);
  await supabaseAdmin.from('credential_types').delete().eq('company_id', companyId);
  await supabaseAdmin.from('brokers').delete().eq('company_id', companyId);
  await supabaseAdmin.from('users').delete().eq('company_id', companyId);
  await supabaseAdmin.from('companies').delete().eq('id', companyId);
}

// Global cleanup after all tests
afterAll(async () => {
  // Clean up test users from auth
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const testUsers = users.users.filter(u => u.email?.includes('@test.com'));
  
  for (const user of testUsers) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
});
```

---

## Test Organization

### Directory Structure

```
tests/
├── contracts/                    # Schema contract tests
│   ├── driver.contract.test.ts
│   ├── vehicle.contract.test.ts
│   └── ...
│
├── security/                     # RLS policy tests
│   └── rls/
│       ├── drivers.rls.test.ts
│       ├── vehicles.rls.test.ts
│       └── ...
│
├── integration/                  # Feature behavior tests
│   ├── super-admin/
│   │   └── company-management.test.ts
│   ├── admin/
│   │   ├── driver-applications.test.ts
│   │   ├── credential-review.test.ts
│   │   └── ...
│   └── driver/
│       ├── onboarding.test.ts
│       └── ...
│
├── hooks/                        # React Query hook tests
│   ├── useDrivers.test.ts
│   ├── useVehicles.test.ts
│   └── ...
│
├── components/                   # Component behavior tests
│   ├── admin/
│   │   └── DriverApplicationCard.test.tsx
│   └── driver/
│       └── ...
│
├── e2e/                         # Playwright E2E tests
│   ├── admin/
│   │   ├── driver-applications.spec.ts
│   │   └── ...
│   ├── driver/
│   │   └── ...
│   └── helpers/
│       └── index.ts
│
├── factories/                   # Test data factories
│   └── index.ts
│
└── utils/                       # Test utilities
    ├── test-client.ts
    ├── cleanup.ts
    └── supabase-admin.ts
```

### Naming Conventions

| Test Type | File Pattern | Example |
|-----------|--------------|---------|
| Contract | `{entity}.contract.test.ts` | `driver.contract.test.ts` |
| RLS | `{table}.rls.test.ts` | `drivers.rls.test.ts` |
| Integration | `{feature-name}.test.ts` | `driver-applications.test.ts` |
| Hook | `use{Hook}.test.ts` | `useDrivers.test.ts` |
| Component | `{Component}.test.tsx` | `DriverApplicationCard.test.tsx` |
| E2E | `{feature-name}.spec.ts` | `driver-applications.spec.ts` |

---

## CI/CD Integration

### Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  contract-tests:
    name: Contract Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:contracts

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      supabase:
        # Local Supabase for testing
        image: supabase/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx supabase db push --local
      - run: npm run test:integration
      
  component-tests:
    name: Component Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:components

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [contract-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### Package Scripts

```json
{
  "scripts": {
    "test": "npm run test:contracts && npm run test:integration && npm run test:components",
    "test:contracts": "vitest run tests/contracts",
    "test:integration": "vitest run tests/integration tests/security",
    "test:components": "vitest run tests/components tests/hooks",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Coverage Requirements

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
```

---

## Agent Prompting for Tests

### Prompt Template: Write Tests

```markdown
## Context
Load these documents:
- 00-INDEX.md
- 05-TESTING-STRATEGY.md
- [Feature spec, e.g., AD-001-driver-applications.md]
- 02-DATABASE-SCHEMA.md

## Task
Write tests for feature [FEATURE-ID] based on the specification.

## Requirements
1. Create integration tests in `tests/integration/[layer]/[feature].test.ts`
2. Each acceptance criteria from the spec should have corresponding test(s)
3. Use the test factories from `tests/factories`
4. Follow the testing patterns in 05-TESTING-STRATEGY.md
5. Tests should FAIL initially (no implementation exists)

## Do NOT
- Write any implementation code
- Modify existing tests
- Skip acceptance criteria

## Output
- Test files only
- List which acceptance criteria each test covers
```

### Prompt Template: Implement to Pass Tests

```markdown
## Context
Load these documents:
- 00-INDEX.md
- [Feature spec]
- 01-ARCHITECTURE.md
- 04-FRONTEND-GUIDELINES.md

Also reference (read-only):
- Test files in `tests/integration/[layer]/[feature].test.ts`

## Task
Implement feature [FEATURE-ID] to make all tests pass.

## Requirements
1. Follow architecture patterns in 01-ARCHITECTURE.md
2. Follow frontend guidelines in 04-FRONTEND-GUIDELINES.md
3. All tests must pass
4. Do not modify test files

## Verification
Run `npm run test:integration -- [feature]` to verify tests pass.
```

---

## Checklist

### Per Feature

- [ ] Integration tests written from spec
- [ ] Tests reviewed before implementation
- [ ] Implementation makes tests pass
- [ ] E2E tests added for critical paths
- [ ] RLS tests cover permission matrix

### Project Setup

- [ ] Test infrastructure created (factories, utils)
- [ ] CI/CD pipeline configured
- [ ] Coverage reporting enabled
- [ ] Contract tests for core schema

---

## Change Log

| Date | Change | Reference |
|------|--------|-----------|
| 2026-01-16 | Initial testing strategy | - |
