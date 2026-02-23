import { type Page, type Locator } from '@playwright/test';

export class ChatPagePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly dashboardSelector: Locator;
  readonly textarea: Locator;
  readonly sendButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /ai chat|chat/i }).first();
    this.dashboardSelector = page.getByRole('combobox').first();
    this.textarea = page.locator('textarea[placeholder*="Ask"]');
    this.sendButton = page.locator('form button[type="submit"]');
    this.emptyState = page.getByText('How can I help?');
  }

  async goto() {
    await this.page.goto('/chat');
    await this.page.waitForLoadState('networkidle');
  }
}
