import { test, expect } from '../fixtures';

test.describe('Super Admin - Company Features Tab', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('superAdmin');
    await page.goto('/super-admin/companies');

    await page.getByRole('row').nth(1).click();

    await page.waitForURL(/\/super-admin\/companies\/.+/);

    await page.getByRole('tab', { name: 'Features' }).click();
  });

  test('displays feature flags for company', async ({ page }) => {
    await expect(page.getByText('Feature Access')).toBeVisible();

    await expect(
      page.getByRole('columnheader', { name: 'Feature' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Global' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Override' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Effective' })
    ).toBeVisible();

    await expect(page.getByText('Billing System')).toBeVisible();
    await expect(page.getByText('Driver Management')).toBeVisible();
  });

  test('shows Global column with default values', async ({ page }) => {
    const driverManagementRow = page
      .getByRole('row')
      .filter({ hasText: 'Driver Management' });
    await expect(driverManagementRow.getByText('On').first()).toBeVisible();

    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    await expect(billingRow.getByText('Off').first()).toBeVisible();
  });

  test('create override via modal', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    await billingRow.getByRole('button', { name: 'Override' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Override: Billing System')).toBeVisible();

    const toggle = page.getByRole('dialog').getByRole('switch');
    await expect(toggle).toBeChecked();

    await page
      .getByPlaceholder('Why is this override being set?')
      .fill('Testing override creation');

    await page.getByRole('button', { name: 'Save Override' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText('Override enabled')).toBeVisible();

    await expect(
      billingRow.locator('[data-slot="badge"]').filter({ hasText: 'On' })
    ).toBeVisible();
  });

  test('effective value reflects override', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });

    const effectiveCell = billingRow.getByRole('cell').nth(3);

    await expect(effectiveCell.locator('svg').first()).toBeVisible();
  });

  test('reset override reverts to global default', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });

    const resetButton = billingRow.getByRole('button', { name: 'Reset' });

    if (await resetButton.isVisible()) {
      await resetButton.click();

      await expect(page.getByText('Override removed')).toBeVisible();

      await expect(
        billingRow.getByRole('button', { name: 'Override' })
      ).toBeVisible();
    }
  });

  test('edit existing override', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });
    const overrideButton = billingRow.getByRole('button', { name: 'Override' });

    if (await overrideButton.isVisible()) {
      await overrideButton.click();
      await page.getByRole('button', { name: 'Save Override' }).click();
      await page.waitForTimeout(500);
    }

    const overrideBadge = billingRow
      .locator('[data-slot="badge"]')
      .filter({ hasText: /On|Off/ })
      .nth(1);
    await overrideBadge.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('dialog').getByRole('switch').click();

    await page
      .getByPlaceholder('Why is this override being set?')
      .fill('Updated override');

    await page.getByRole('button', { name: 'Save Override' }).click();

    await expect(page.getByText(/Override (enabled|disabled)/)).toBeVisible();
  });

  test('cancel modal does not save changes', async ({ page }) => {
    const billingRow = page.getByRole('row').filter({ hasText: 'Billing System' });

    const resetButton = billingRow.getByRole('button', { name: 'Reset' });
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);
    }

    await billingRow.getByRole('button', { name: 'Override' }).click();

    await page
      .getByPlaceholder('Why is this override being set?')
      .fill('Should not be saved');

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(billingRow.getByText('—')).toBeVisible();
  });
});
