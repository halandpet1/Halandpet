# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-role-smoke.spec.ts >> role-based authentication smoke >> owner can login and access dashboard
- Location: e2e/auth-role-smoke.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/ringkasan operasional/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/ringkasan operasional/i)

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedApp, loginAs } from './helpers/auth';
  3  | 
  4  | test.describe('role-based authentication smoke', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await seedApp(page);
  7  |   });
  8  | 
  9  |   test('owner can login and access dashboard', async ({ page }) => {
  10 |     await loginAs(page, 'owner', '123456');
  11 |     await expect(page).toHaveURL(/\/dashboard/);
> 12 |     await expect(page.getByText(/ringkasan operasional/i)).toBeVisible();
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  13 |     await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  14 |   });
  15 | 
  16 |   test('customer is redirected to portal after login', async ({ page }) => {
  17 |     await page.goto('/api/seed');
  18 |     await page.goto('/login');
  19 |     await page.getByLabel('Username').fill('customer');
  20 |     await page.getByLabel('PIN').fill('123456');
  21 |     await page.getByRole('button', { name: /masuk/i }).click();
  22 |     await expect(page).toHaveURL(/\/portal/);
  23 |   });
  24 | });
  25 | 
```