import { type Page, type Locator } from '@playwright/test';

export class AddWidgetDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly searchInput: Locator;
  readonly backButton: Locator;
  readonly cancelButton: Locator;

  // Step 3
  readonly widgetTitleInput: Locator;
  readonly addWidgetSubmit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('[role="dialog"]');
    this.searchInput = page.locator('[role="dialog"] input[placeholder*="Search"]');
    this.backButton = page.locator('[role="dialog"] button:has(svg)').first();
    this.cancelButton = page.getByRole('button', { name: 'Back' });

    this.widgetTitleInput = page.locator('input#widget-title');
    this.addWidgetSubmit = page.getByRole('button', { name: /add widget/i });
  }

  /** Select a data asset by name (Step 1) */
  async selectAsset(assetName: string) {
    await this.dialog.getByText(assetName, { exact: false }).first().click();
  }

  /** Select a widget type by name (Step 2) */
  async selectWidgetType(typeName: string) {
    await this.dialog.getByText(typeName, { exact: false }).first().click();
  }

  /** Complete the 3-step add widget flow */
  async addWidget(assetName: string, widgetType: string, title: string) {
    // Step 1: Select data asset
    await this.selectAsset(assetName);

    // Step 2: Select widget type
    await this.selectWidgetType(widgetType);

    // Step 3: Configure and submit
    await this.widgetTitleInput.waitFor();
    await this.widgetTitleInput.fill(title);
    await this.addWidgetSubmit.click();
  }
}
