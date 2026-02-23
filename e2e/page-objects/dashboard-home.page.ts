import { type Page, type Locator } from '@playwright/test';

export class DashboardHomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly content: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading').first();
    this.content = page.locator('main');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }
}
