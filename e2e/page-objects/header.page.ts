import { type Page, type Locator } from '@playwright/test';

export class HeaderPage {
  readonly page: Page;
  readonly header: Locator;
  readonly userMenuTrigger: Locator;
  readonly signOutButton: Locator;
  readonly breadcrumb: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.userMenuTrigger = page.locator('header button:has(span.relative)');
    this.signOutButton = page.getByRole('menuitem', { name: /sign out/i });
    this.breadcrumb = page.locator('header nav, header ol');
  }

  /** Open user dropdown and sign out */
  async signOut() {
    // DropdownMenuTrigger renders as a <button> containing the user email text
    const trigger = this.page.locator('header button').filter({ hasText: /@/ });
    await trigger.click();
    await this.signOutButton.waitFor({ timeout: 5_000 });
    await this.signOutButton.click();
    await this.page.waitForURL('**/login', { timeout: 10_000 });
  }
}
