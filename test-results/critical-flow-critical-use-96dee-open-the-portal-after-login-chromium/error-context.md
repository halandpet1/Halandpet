# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-flow.spec.ts >> critical user flows >> customer can open the portal after login
- Location: e2e/critical-flow.spec.ts:51:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/profil pelanggan/i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/profil pelanggan/i).first()

```

```yaml
- alert
- complementary:
  - paragraph: HaLand PetCare
  - heading "Integrated Clinic" [level=1]
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
    - link "Portal Pelanggan":
      - /url: /portal
    - link "My Pets":
      - /url: /pets
    - link "Appointment":
      - /url: /appointment
    - link "Hotel":
      - /url: /hotel
    - link "Medical History":
      - /url: /medical-history
    - link "Invoice":
      - /url: /invoice
    - link "Profile":
      - /url: /profile
- banner:
  - paragraph: Portal
  - heading "Panel utama" [level=2]
  - button "Notifikasi"
  - text: A
  - paragraph: CUSTOMER
  - paragraph: Customer Portal
- main:
  - navigation "Breadcrumb": Portal
  - heading "Portal pelanggan" [level=1]
  - paragraph: Akses portal pelanggan tidak tersedia
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('critical user flows', () => {
  4  |   test('owner can reach dashboard and access key modules', async ({ page }) => {
  5  |     await page.goto('/api/seed');
  6  |     await page.goto('/login');
  7  |     await page.getByLabel('Username').fill('owner');
  8  |     await page.getByLabel('PIN').fill('123456');
  9  |     await page.getByRole('button', { name: /masuk/i }).click();
  10 | 
  11 |     await expect(page).toHaveURL(/\/dashboard$/);
  12 |     await expect(page.getByRole('heading', { name: /ringkasan operasional/i })).toBeVisible({ timeout: 10000 });
  13 |     await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });
  14 |     await expect(page.getByRole('link', { name: /inventaris/i })).toBeVisible({ timeout: 10000 });
  15 |     await expect(page.getByRole('link', { name: /pet hotel/i })).toBeVisible({ timeout: 10000 });
  16 | 
  17 |     await page.getByRole('link', { name: /inventaris/i }).click();
  18 |     await expect(page).toHaveURL(/\/inventory$/);
  19 |     await expect(page.getByRole('heading', { name: /inventory & pharmacy/i })).toBeVisible();
  20 | 
  21 |     await page.getByRole('link', { name: /pet hotel/i }).click();
  22 |     await expect(page).toHaveURL(/\/hotel$/);
  23 |     await expect(page.getByRole('heading', { name: /hotel dashboard/i })).toBeVisible();
  24 | 
  25 |     await page.getByRole('link', { name: /laporan/i }).click();
  26 |     await expect(page).toHaveURL(/\/reports$/);
  27 |     await expect(page.getByRole('heading', { name: /laporan enterprise/i })).toBeVisible();
  28 |   });
  29 | 
  30 |   test('all internal roles can reach their role-specific dashboard', async ({ page }) => {
  31 |     const cases = [
  32 |       { username: 'owner', expectedHeading: /ringkasan operasional/i, expectedPath: /\/dashboard$/ },
  33 |       { username: 'admin', expectedHeading: /ringkasan operasional/i, expectedPath: /\/dashboard$/ },
  34 |       { username: 'doctor', expectedHeading: /dashboard klinis/i, expectedPath: /\/dashboard$/ },
  35 |       { username: 'cashier', expectedHeading: /dashboard pos/i, expectedPath: /\/dashboard$/ },
  36 |       { username: 'staff', expectedHeading: /dashboard operasional/i, expectedPath: /\/dashboard$/ },
  37 |     ];
  38 | 
  39 |     for (const testCase of cases) {
  40 |       await page.goto('/api/seed');
  41 |       await page.goto('/login');
  42 |       await page.getByLabel('Username').fill(testCase.username);
  43 |       await page.getByLabel('PIN').fill('123456');
  44 |       await page.getByRole('button', { name: /masuk/i }).click();
  45 | 
  46 |       await expect(page).toHaveURL(testCase.expectedPath, { timeout: 10000 });
  47 |       await expect(page.getByRole('heading', { name: testCase.expectedHeading })).toBeVisible({ timeout: 10000 });
  48 |     }
  49 |   });
  50 | 
  51 |   test('customer can open the portal after login', async ({ page }) => {
  52 |     await page.goto('/api/seed');
  53 |     await page.goto('/login');
  54 |     await page.getByLabel('Username').fill('customer');
  55 |     await page.getByLabel('PIN').fill('123456');
  56 |     await page.getByRole('button', { name: /masuk/i }).click();
  57 | 
  58 |     await expect(page).toHaveURL(/\/portal$/);
  59 |     await expect(page.getByRole('main').getByRole('heading', { name: /portal pelanggan/i })).toBeVisible();
> 60 |     await expect(page.getByText(/profil pelanggan/i).first()).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  61 | 
  62 |     await page.getByLabel('Nama').fill('Customer Updated');
  63 |     await page.getByLabel('Telepon').fill('081234567890');
  64 |     await page.getByLabel('Email').fill('customer.updated@example.com');
  65 |     await page.getByLabel('Alamat').fill('Bandung, Indonesia');
  66 |     await page.getByRole('button', { name: /simpan profil/i }).click();
  67 | 
  68 |     await expect(page.getByText(/profil berhasil diperbarui/i)).toBeVisible();
  69 |   });
  70 | });
  71 | 
```