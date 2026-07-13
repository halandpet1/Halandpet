# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility-smoke.spec.ts >> accessibility and visual smoke tests >> dashboard navigation is keyboard accessible and visually stable after login
- Location: e2e/accessibility-smoke.spec.ts:25:7

# Error details

```
Error: A snapshot doesn't exist at /workspaces/Halandpet/e2e/accessibility-smoke.spec.ts-snapshots/dashboard-shell-chromium-linux.png, writing actual.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - generic [ref=e10]:
      - text: Compiling
      - generic [ref=e11]:
        - generic [ref=e12]: .
        - generic [ref=e13]: .
        - generic [ref=e14]: .
  - alert [ref=e15]
  - generic [ref=e16]:
    - complementary "Primary" [ref=e17]:
      - generic [ref=e19]:
        - paragraph [ref=e20]: HaLand PetCare
        - heading "Integrated Clinic" [level=1] [ref=e21]
      - navigation "Primary navigation" [ref=e22]:
        - link "Dashboard" [active] [ref=e23] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e24]:
            - img [ref=e25]
            - text: Dashboard
          - img [ref=e28]
        - link "Pelanggan" [ref=e30] [cursor=pointer]:
          - /url: /customers
          - generic [ref=e31]:
            - img [ref=e32]
            - text: Pelanggan
          - img [ref=e37]
        - link "Klinis" [ref=e39] [cursor=pointer]:
          - /url: /clinical
          - generic [ref=e40]:
            - img [ref=e41]
            - text: Klinis
          - img [ref=e45]
        - link "Inventaris" [ref=e47] [cursor=pointer]:
          - /url: /inventory
          - generic [ref=e48]:
            - img [ref=e49]
            - text: Inventaris
          - img [ref=e59]
        - link "POS" [ref=e61] [cursor=pointer]:
          - /url: /pos
          - generic [ref=e62]:
            - img [ref=e63]
            - text: POS
          - img [ref=e67]
        - link "Pet Hotel" [ref=e69] [cursor=pointer]:
          - /url: /hotel
          - generic [ref=e70]:
            - img [ref=e71]
            - text: Pet Hotel
          - img [ref=e74]
        - link "Laporan" [ref=e76] [cursor=pointer]:
          - /url: /reports
          - generic [ref=e77]:
            - img [ref=e78]
            - text: Laporan
          - img [ref=e80]
        - link "Settings" [ref=e82] [cursor=pointer]:
          - /url: /settings
          - generic [ref=e83]:
            - img [ref=e84]
            - text: Settings
          - img [ref=e87]
        - link "Monitoring" [ref=e89] [cursor=pointer]:
          - /url: /monitoring
          - generic [ref=e90]:
            - img [ref=e91]
            - text: Monitoring
          - img [ref=e93]
        - link "Administrasi" [ref=e95] [cursor=pointer]:
          - /url: /admin
          - generic [ref=e96]:
            - img [ref=e97]
            - text: Administrasi
          - img [ref=e100]
    - generic [ref=e102]:
      - banner [ref=e103]:
        - generic [ref=e104]:
          - generic [ref=e106]:
            - paragraph [ref=e107]: Operasional
            - heading "Panel utama" [level=2] [ref=e108]
          - generic [ref=e109]:
            - button "Notifikasi" [ref=e110]:
              - img [ref=e111]
              - text: Notifikasi
            - generic [ref=e114]:
              - generic [ref=e115]: A
              - generic [ref=e116]:
                - paragraph [ref=e117]: OWNER
                - paragraph [ref=e118]: Operations
      - main [ref=e119]:
        - navigation "Breadcrumb" [ref=e121]:
          - generic [ref=e123]: Dashboard
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | async function seedAndLogin(page: Page, username = 'owner') {
  4  |   await page.goto('/api/seed');
  5  |   await page.goto('/login');
  6  |   await page.getByLabel('Username').fill(username);
  7  |   await page.getByLabel('PIN').fill('123456');
  8  |   await page.getByRole('button', { name: /masuk/i }).click();
  9  |   await expect(page).toHaveURL(/\/dashboard$/);
  10 | }
  11 | 
  12 | test.describe('accessibility and visual smoke tests', () => {
  13 |   test('login flow exposes accessible form controls and matches a visual snapshot', async ({ page }) => {
  14 |     await page.setViewportSize({ width: 1440, height: 1200 });
  15 |     await page.goto('/login');
  16 | 
  17 |     await expect(page.getByRole('heading', { name: /masuk ke sistem/i })).toBeVisible();
  18 |     await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
  19 |     await expect(page.getByLabel('PIN')).toBeVisible();
  20 |     await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible();
  21 | 
  22 |     await expect(page.locator('main')).toHaveScreenshot('login-page.png');
  23 |   });
  24 | 
  25 |   test('dashboard navigation is keyboard accessible and visually stable after login', async ({ page }) => {
  26 |     await page.setViewportSize({ width: 1440, height: 1400 });
  27 |     await seedAndLogin(page, 'owner');
  28 | 
  29 |     const primaryNav = page.getByRole('navigation', { name: /primary navigation/i });
  30 |     await expect(primaryNav).toBeVisible();
  31 |     await expect(primaryNav.getByRole('link', { name: /dashboard/i })).toBeVisible();
  32 |     await expect(primaryNav.getByRole('link', { name: /inventaris/i })).toBeVisible();
  33 |     await expect(primaryNav.getByRole('link', { name: /pet hotel/i })).toBeVisible();
  34 | 
  35 |     const dashboardLink = primaryNav.getByRole('link', { name: /dashboard/i });
  36 |     await dashboardLink.focus();
  37 |     await expect(dashboardLink).toBeFocused();
  38 | 
> 39 |     await expect(page.locator('main')).toHaveScreenshot('dashboard-shell.png');
     |     ^ Error: A snapshot doesn't exist at /workspaces/Halandpet/e2e/accessibility-smoke.spec.ts-snapshots/dashboard-shell-chromium-linux.png, writing actual.
  40 |   });
  41 | });
  42 | 
```