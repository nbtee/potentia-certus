import { type Page, type Locator } from '@playwright/test';

export class ChatPanelPage {
  readonly page: Page;
  readonly trigger: Locator;
  readonly sheet: Locator;
  readonly sheetTitle: Locator;
  readonly emptyState: Locator;
  readonly textarea: Locator;
  readonly sendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trigger = page.getByRole('button', { name: /ask ai/i });
    this.sheet = page.locator('[role="dialog"]').filter({ hasText: 'AI Assistant' });
    this.sheetTitle = page.getByText('AI Assistant');
    this.emptyState = page.getByText('How can I help?');
    this.textarea = page.locator('textarea[placeholder*="Ask about"]');
    this.sendButton = page.locator('form button[type="submit"]');
  }

  /** Open the chat panel via the floating trigger */
  async open() {
    await this.trigger.click();
    await this.sheet.waitFor({ timeout: 5_000 });
  }

  /** Close the chat panel by clicking the sheet close or pressing Escape */
  async close() {
    await this.page.keyboard.press('Escape');
    await this.sheet.waitFor({ state: 'hidden', timeout: 5_000 });
  }

  /** Type a message and send */
  async sendMessage(message: string) {
    await this.textarea.fill(message);
    await this.sendButton.click();
  }
}
