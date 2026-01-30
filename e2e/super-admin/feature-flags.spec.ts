import { test, expect } from '../fixtures';

test.describe('Super Admin - Feature Flags Page', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('superAdmin');
    await page.goto('/super-admin/feature-flags');
  });

  test('displays feature flags grouped by category', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Feature Flags' })
    ).toBeVisible();

    await expect(page.getByText('billing')).toBeVisible();
    await expect(page.getByText('core')).toBeVisible();

    await expect(page.getByText('Billing System')).toBeVisible();
    await expect(page.getByText('billing_enabled')).toBeVisible();
    await expect(page.getByText('Driver Management')).toBeVisible();
  });

  test('search filters flags', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search flags...');
    await searchInput.fill('billing');

    await expect(page.getByText('Billing System')).toBeVisible();
    await expect(page.getByText('Driver Management')).not.toBeVisible();
  });

  test('category filter works', async ({ page }) => {
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Core' }).click();

    await expect(page.getByText('Driver Management')).toBeVisible();
    await expect(page.getByText('Billing System')).not.toBeVisible();
  });

  test('toggle flag changes global default', async ({ page }) => {
    const flagRow = page
      .locator('div')
      .filter({ hasText: /^Billing Systembilling_enabled/ })
      .first();

    const toggle = flagRow.getByRole('switch');
    const wasChecked = await toggle.isChecked();

    await toggle.click();

    await expect(
      page.getByText(/Flag (enabled|disabled) globally/)
    ).toBeVisible();

    await expect(toggle).toHaveAttribute(
      'aria-checked',
      wasChecked ? 'false' : 'true'
    );

    await toggle.click();
  });

  test('shows override count when overrides exist', async ({ page }) => {
    await page.goto('/super-admin/companies');
    await page.getByRole('row').nth(1).click();

    await page.getByRole('tab', { name: 'Features' }).click();

    await page.getByRole('button', { name: 'Override' }).first().click();

    await page.getByRole('switch').click();
    await page.getByRole('button', { name: 'Save Override' }).click();

    await page.goto('/super-admin/feature-flags');

    await expect(page.getByText(/\d+ override/)).toBeVisible();
  });

  test('expand override list shows companies', async ({ page }) => {
    const overrideButton = page
      .getByRole('button', { name: /\d+ override/ })
      .first();

    if (await overrideButton.isVisible()) {
      await overrideButton.click();

      await expect(page.getByRole('table')).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: 'Company' })
      ).toBeVisible();
    }
  });

  test('remove override from list', async ({ page }) => {
    const overrideButton = page
      .getByRole('button', { name: /\d+ override/ })
      .first();

    if (await overrideButton.isVisible()) {
      await overrideButton.click();

      await page
        .getByRole('button', { name: 'Remove override' })
        .first()
        .click();

      await expect(page.getByText('Override removed')).toBeVisible();
    }
  });
});
