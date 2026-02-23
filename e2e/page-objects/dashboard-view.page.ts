import { type Page, type Locator } from '@playwright/test';

export class DashboardViewPage {
  readonly page: Page;
  readonly backButton: Locator;
  readonly title: Locator;
  readonly editButton: Locator;
  readonly viewModeButton: Locator;
  readonly addWidgetButton: Locator;
  readonly shareButton: Locator;
  readonly chatTrigger: Locator;

  // Title editing
  readonly titleInput: Locator;
  readonly saveTitleButton: Locator;
  readonly cancelTitleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.getByRole('link', { name: /back/i });
    this.title = page.locator('h1.text-2xl');
    this.editButton = page.getByRole('button', { name: /^Edit$/ });
    this.viewModeButton = page.getByRole('button', { name: /view mode/i });
    this.addWidgetButton = page.getByRole('button', { name: /add widget/i });
    this.shareButton = page.locator('button[title*="hare"]');
    this.chatTrigger = page.getByRole('button', { name: /ask ai/i });

    this.titleInput = page.locator('input.text-xl');
    this.saveTitleButton = page.locator('input.text-xl ~ button').first();
    this.cancelTitleButton = page.locator('input.text-xl ~ button').last();
  }

  /** Navigate to a specific dashboard */
  async goto(dashboardId: string) {
    await this.page.goto(`/dashboards/${dashboardId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /** Enter edit mode */
  async enterEditMode() {
    await this.editButton.click();
    await this.viewModeButton.waitFor();
  }

  /** Exit edit mode */
  async exitEditMode() {
    await this.viewModeButton.click();
    await this.editButton.waitFor();
  }

  /** Click the title to edit, type new name, press Enter */
  async editTitle(newTitle: string) {
    await this.title.click();
    await this.titleInput.waitFor();
    await this.titleInput.fill(newTitle);
    await this.titleInput.press('Enter');
  }

  /** Click title to edit, then press Escape to cancel */
  async editTitleAndCancel() {
    await this.title.click();
    await this.titleInput.waitFor();
    await this.titleInput.press('Escape');
  }

  /** Get all widget containers in the grid */
  widgets() {
    return this.page.locator('.react-grid-item');
  }

  /** Get the empty state element */
  emptyState() {
    return this.page.getByText('No widgets yet');
  }
}
