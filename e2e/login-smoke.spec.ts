import { test, expect } from '@playwright/test';

test('guest can open the login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /masuk ke sistem/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
});
