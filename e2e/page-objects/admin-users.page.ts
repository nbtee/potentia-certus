import { type Page, type Locator } from '@playwright/test';

export class AdminUsersPage {
  readonly page: Page;
  readonly inviteButton: Locator;
  readonly importCsvButton: Locator;

  // Invite/Edit dialog
  readonly dialogTitle: Locator;
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dialogCancelButton: Locator;
  readonly dialogSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteButton = page.getByRole('button', { name: /invite user/i });
    this.importCsvButton = page.getByRole('button', { name: /import csv/i });

    this.dialogTitle = page.locator('[role="dialog"]').getByRole('heading');
    this.emailInput = page.locator('[role="dialog"] input#email');
    this.firstNameInput = page.locator('[role="dialog"] input#first_name');
    this.lastNameInput = page.locator('[role="dialog"] input#last_name');
    this.dialogCancelButton = page.locator('[role="dialog"]').getByRole('button', { name: 'Cancel' });
    this.dialogSubmitButton = page.locator('[role="dialog"]').getByRole('button', { name: /invite|save/i });
  }

  async goto() {
    await this.page.goto('/admin/users');
    await this.page.waitForLoadState('networkidle');
  }

  /** Open the row actions dropdown for a specific row index */
  async openRowActions(rowIndex: number) {
    const row = this.page.locator('tbody tr').nth(rowIndex);
    await row.getByRole('button').last().click();
  }

  /** Click Edit in the dropdown menu */
  async clickEdit() {
    await this.page.getByRole('menuitem', { name: /edit/i }).click();
  }

  /** Click Deactivate in the dropdown menu */
  async clickDeactivate() {
    await this.page.getByRole('menuitem', { name: /deactivate/i }).click();
  }

  /** Click Reactivate in the dropdown menu */
  async clickReactivate() {
    await this.page.getByRole('menuitem', { name: /reactivate/i }).click();
  }

  /** Open the invite user dialog */
  async openInviteDialog() {
    await this.inviteButton.click();
    await this.dialogTitle.waitFor();
  }

  /** Close whichever dialog is open */
  async closeDialog() {
    await this.dialogCancelButton.click();
  }

  /** Open the CSV import dialog */
  async openImportDialog() {
    await this.importCsvButton.click();
  }
}
