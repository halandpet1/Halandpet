import { test, expect, type Page } from '@playwright/test';

async function seedAndLogin(page: Page, username = 'owner') {
  await page.goto('/api/seed');
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('PIN').fill('123456');
  await page.getByRole('button', { name: /masuk/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('accessibility and visual smoke tests', () => {
  test('login flow exposes accessible form controls and matches a visual snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /masuk ke sistem/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByLabel('PIN')).toBeVisible();
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();

    await expect(page.locator('main')).toHaveScreenshot('login-page.png');
  });

  test('dashboard navigation is keyboard accessible and visually stable after login', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await seedAndLogin(page, 'owner');

    const primaryNav = page.getByRole('navigation', { name: /primary navigation/i });
    await expect(primaryNav).toBeVisible();
    await expect(primaryNav.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(primaryNav.getByRole('link', { name: /inventaris/i })).toBeVisible();
    await expect(primaryNav.getByRole('link', { name: /pet hotel/i })).toBeVisible();

    const dashboardLink = primaryNav.getByRole('link', { name: /dashboard/i });
    await dashboardLink.focus();
    await expect(dashboardLink).toBeFocused();

    await expect(page.locator('main')).toHaveScreenshot('dashboard-shell.png');
  });
});
