import { type Page, type Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;
  readonly logo: Locator;
  readonly roleLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('img[alt="Potentia"]').first();
    // Role label is in the sidebar footer
    this.roleLabel = page.locator('.bg-gray-800\\/30 .text-gray-300');
  }

  /** Get a nav link by its visible text */
  navLink(name: string): Locator {
    return this.page.locator('nav').getByRole('link', { name, exact: true });
  }

  /** Check if a nav link has the active indicator (emerald gradient) */
  async isNavActive(name: string): Promise<boolean> {
    const link = this.navLink(name);
    const classes = await link.getAttribute('class');
    return classes?.includes('from-emerald-500') ?? false;
  }

  /** Navigate via sidebar link and wait for navigation */
  async navigateTo(name: string) {
    await this.navLink(name).click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Get all visible nav link names */
  async getVisibleNavNames(): Promise<string[]> {
    const links = this.page.locator('nav a');
    return links.allTextContents();
  }

  /** Get the displayed role text in sidebar footer */
  async getRoleText(): Promise<string> {
    return (await this.roleLabel.textContent()) ?? '';
  }
}
