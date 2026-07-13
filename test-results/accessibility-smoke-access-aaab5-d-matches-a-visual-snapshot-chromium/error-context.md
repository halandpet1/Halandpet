# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility-smoke.spec.ts >> accessibility and visual smoke tests >> login flow exposes accessible form controls and matches a visual snapshot
- Location: e2e/accessibility-smoke.spec.ts:13:7

# Error details

```
Error: expect(locator).toHaveScreenshot(expected) failed

Locator: locator('main')
  3625 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: login-page.png

Call log:
  - Expect "toHaveScreenshot(login-page.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - waiting for locator('main')
    - locator resolved to <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">…</main>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - 3625 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - waiting for locator('main')
    - locator resolved to <main class="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">…</main>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - captured a stable screenshot
  - 3625 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - paragraph [ref=e5]: HaLand PetCare
        - heading "Masuk ke sistem" [level=1] [ref=e6]
        - paragraph [ref=e7]: Gunakan username dan PIN internal Anda.
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: Username
          - textbox "Username" [ref=e11]:
            - /placeholder: admin_john
        - generic [ref=e12]:
          - generic [ref=e13]: PIN
          - textbox "PIN" [ref=e14]:
            - /placeholder: "123456"
        - button "Masuk" [ref=e15]
  - button "Open Next.js Dev Tools" [ref=e21] [cursor=pointer]:
    - img [ref=e22]
  - alert [ref=e25]
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
> 22 |     await expect(page.locator('main')).toHaveScreenshot('login-page.png');
     |                                        ^ Error: expect(locator).toHaveScreenshot(expected) failed
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
  39 |     await expect(page.locator('main')).toHaveScreenshot('dashboard-shell.png');
  40 |   });
  41 | });
  42 | 
```