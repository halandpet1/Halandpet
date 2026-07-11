# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: role-coverage.spec.ts >> core role coverage >> owner can reach admin and reports pages
- Location: e2e/role-coverage.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/manajemen pengguna/i)
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/manajemen pengguna/i)

```

```yaml
- complementary:
  - paragraph: HaLand PetCare
  - heading "Integrated Clinic" [level=1]
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
    - link "Portal Pelanggan":
      - /url: /portal
    - link "Pelanggan":
      - /url: /customers
    - link "Klinis":
      - /url: /clinical
    - link "Inventaris":
      - /url: /inventory
    - link "POS":
      - /url: /pos
    - link "Pet Hotel":
      - /url: /hotel
    - link "Laporan":
      - /url: /reports
    - link "Settings":
      - /url: /settings
    - link "Monitoring":
      - /url: /monitoring
    - link "Administrasi":
      - /url: /admin
- banner:
  - paragraph: Operasional
  - heading "Panel utama" [level=2]
  - button "Notifikasi"
  - text: A
  - paragraph: Admin
  - paragraph: Operations
- main: Database belum dikonfigurasi.
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedApp, loginAs } from './helpers/auth';
  3  | 
  4  | test.describe('core role coverage', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await seedApp(page);
  7  |   });
  8  | 
  9  |   test('owner can reach admin and reports pages', async ({ page }) => {
  10 |     await loginAs(page, 'owner', '123456');
  11 |     await page.goto('/admin');
> 12 |     await expect(page.getByText(/manajemen pengguna/i)).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  13 |     await page.goto('/reports');
  14 |     await expect(page.getByText(/laporan/i)).toBeVisible();
  15 |   });
  16 | 
  17 |   test('staff can reach inventory and hotel screens', async ({ page }) => {
  18 |     await loginAs(page, 'owner', '123456');
  19 |     await page.goto('/inventory');
  20 |     await expect(page.getByText(/inventaris/i)).toBeVisible();
  21 |     await page.goto('/hotel');
  22 |     await expect(page.getByText(/hotel dashboard/i)).toBeVisible();
  23 |   });
  24 | });
  25 | 
```