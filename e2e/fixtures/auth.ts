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
