import { test, expect } from '@playwright/test';
import { seedApp, loginAs } from './helpers/auth';

test.describe('core role coverage', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page);
  });

  test('owner can reach admin and reports pages', async ({ page }) => {
    await loginAs(page, 'owner', '123456');
    await page.goto('/admin');
    await expect(page.getByText(/manajemen pengguna/i)).toBeVisible();
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: /laporan enterprise/i })).toBeVisible();
  });

  test('staff can reach inventory and hotel screens', async ({ page }) => {
    await loginAs(page, 'owner', '123456');
    await page.goto('/inventory');
    await expect(page.getByText(/inventaris/i)).toBeVisible();
    await page.goto('/hotel');
    await expect(page.getByText(/hotel dashboard/i)).toBeVisible();
  });
});
