import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async open() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: /masuk ke sistem/i })).toBeVisible();
  }

  async login(username: string, pin: string) {
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('PIN').fill(pin);
    await this.page.getByRole('button', { name: /masuk/i }).click();
  }

  async expectError(message: RegExp) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}
