import { Page } from '@playwright/test';

export async function seedApp(page: Page) {
  await page.goto('/api/seed');
  await page.waitForLoadState('networkidle');
}

export async function loginAs(page: Page, username: string, pin: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('PIN').fill(pin);
  await page.getByRole('button', { name: /masuk/i }).click();
  await page.waitForURL(/\/(portal|dashboard)(\/)?$/);
}
