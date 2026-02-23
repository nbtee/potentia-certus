import { type Page, type Locator } from '@playwright/test';

export class DashboardListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly templatesHeading: Locator;
  readonly yourDashboardsHeading: Locator;
  readonly emptyState: Locator;

  // Create dialog
  readonly createDialogTitle: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  // Delete dialog
  readonly deleteDialogTitle: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'My Dashboards', level: 1 });
    this.createButton = page.getByRole('button', { name: /create dashboard/i });
    this.templatesHeading = page.getByRole('heading', { name: 'Templates' });
    this.yourDashboardsHeading = page.getByRole('heading', { name: 'Your Dashboards' });
    this.emptyState = page.getByText('No dashboards yet');

    this.createDialogTitle = page.getByRole('heading', { name: 'Create New Dashboard' });
    this.nameInput = page.locator('input#name');
    this.descriptionInput = page.locator('input#description');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.submitButton = page.getByRole('button', { name: /^Create$|^Creating/ });

    this.deleteDialogTitle = page.getByRole('heading', { name: 'Delete Dashboard' });
    this.deleteConfirmButton = page.getByRole('button', { name: /^Delete$|^Deleting/ });
  }

  async goto() {
    await this.page.goto('/dashboards');
    await this.page.waitForLoadState('networkidle');
  }

  /** Get all dashboard card links */
  dashboardCards() {
    return this.page.locator('a[href^="/dashboards/"]');
  }

  /** Click "Use Template" on the first template */
  async useFirstTemplate() {
    await this.page.getByRole('button', { name: /use template/i }).first().click();
  }

  /** Open create dialog, fill name, and submit */
  async createDashboard(name: string, description?: string) {
    await this.createButton.click();
    await this.createDialogTitle.waitFor();
    await this.nameInput.fill(name);
    if (description) {
      await this.descriptionInput.fill(description);
    }
    await this.submitButton.click();
    // Wait for redirect to the new dashboard
    await this.page.waitForURL('**/dashboards/**', { timeout: 10_000 });
  }

  /** Click the delete icon on a card, then confirm */
  async deleteDashboard(cardIndex: number) {
    const deleteButtons = this.page.locator('button[title="Delete dashboard"]');
    await deleteButtons.nth(cardIndex).click();
    await this.deleteDialogTitle.waitFor();
    await this.deleteConfirmButton.click();
    await this.deleteDialogTitle.waitFor({ state: 'hidden' });
  }
}
