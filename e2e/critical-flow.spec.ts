import { test, expect } from '@playwright/test';

test.describe('critical user flows', () => {
  test('owner can reach dashboard and access key modules', async ({ page }) => {
    await page.goto('/api/seed');
    await page.goto('/login');
    await page.getByLabel('Username').fill('owner');
    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: /masuk/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /ringkasan operasional/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /inventaris/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /pet hotel/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: /inventaris/i }).click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByRole('heading', { name: /inventory & pharmacy/i })).toBeVisible();

    await page.getByRole('link', { name: /pet hotel/i }).click();
    await expect(page).toHaveURL(/\/hotel$/);
    await expect(page.getByRole('heading', { name: /hotel dashboard/i })).toBeVisible();

    await page.getByRole('link', { name: /laporan/i }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: /laporan enterprise/i })).toBeVisible();
  });

  test('all internal roles can reach their role-specific dashboard', async ({ page }) => {
    const cases = [
      { username: 'owner', expectedHeading: /ringkasan operasional/i, expectedPath: /\/dashboard$/ },
      { username: 'admin', expectedHeading: /ringkasan operasional/i, expectedPath: /\/dashboard$/ },
      { username: 'doctor', expectedHeading: /dashboard klinis/i, expectedPath: /\/dashboard$/ },
      { username: 'cashier', expectedHeading: /dashboard pos/i, expectedPath: /\/dashboard$/ },
      { username: 'staff', expectedHeading: /dashboard operasional/i, expectedPath: /\/dashboard$/ },
    ];

    for (const testCase of cases) {
      await page.goto('/api/seed');
      await page.goto('/login');
      await page.getByLabel('Username').fill(testCase.username);
      await page.getByLabel('PIN').fill('123456');
      await page.getByRole('button', { name: /masuk/i }).click();

      await expect(page).toHaveURL(testCase.expectedPath, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: testCase.expectedHeading })).toBeVisible({ timeout: 10000 });
    }
  });

  test('customer can open the portal after login', async ({ page }) => {
    await page.goto('/api/seed');
    await page.goto('/login');
    await page.getByLabel('Username').fill('customer');
    await page.getByLabel('PIN').fill('123456');
    await page.getByRole('button', { name: /masuk/i }).click();

    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByRole('main').getByText(/portal pelanggan/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /profil pelanggan/i })).toBeVisible();

    await page.getByLabel('Nama').fill('Customer Updated');
    await page.getByLabel('Telepon').fill('081234567890');
    await page.getByLabel('Email').fill('customer.updated@example.com');
    await page.getByLabel('Alamat').fill('Bandung, Indonesia');
    await page.getByRole('button', { name: /simpan profil/i }).click();

    await expect(page.getByText(/profil berhasil diperbarui/i)).toBeVisible();
  });
});
