import { test, expect } from '@playwright/test';
import { seedApp, loginAs } from './helpers/auth';

test.describe('role-based authentication smoke', () => {
  test.beforeEach(async ({ page }) => {
    await seedApp(page);
  });

  test('owner can login and access dashboard', async ({ page }) => {
    await loginAs(page, 'owner', '123456');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/ringkasan operasional/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible();
  });

  test('customer is redirected to portal after login', async ({ page }) => {
    await page.goto('/api/seed');
    await page.goto('/login');
    await page.getByLabel('Username').fill('customer');
    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: /masuk/i }).click();
    await expect(page).toHaveURL(/\/portal/);
  });
});
