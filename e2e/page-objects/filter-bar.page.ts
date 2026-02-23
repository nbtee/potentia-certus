import { type Page, type Locator } from '@playwright/test';

export class FilterBarPage {
  readonly page: Page;
  readonly container: Locator;
  readonly filtersActiveBadge: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.rounded-xl.border.border-gray-200').filter({ hasText: 'Filters' });
    this.filtersActiveBadge = page.getByText('Filters Active');
    this.resetButton = page.getByRole('button', { name: /reset/i });
  }

  /** Get the Time Period select trigger (first combobox in the filter bar) */
  timePeriodTrigger() {
    return this.container.getByRole('combobox').first();
  }

  /** Get the Scope select trigger (second combobox in the filter bar) */
  scopeTrigger() {
    return this.container.getByRole('combobox').last();
  }

  /** Change the time period preset */
  async setTimePeriod(label: string) {
    await this.timePeriodTrigger().click();
    await this.page.getByRole('option', { name: label }).click();
  }

  /** Change the hierarchy scope */
  async setScope(label: string) {
    await this.scopeTrigger().click();
    await this.page.getByRole('option', { name: label }).click();
  }

  /** Reset all filters to defaults */
  async reset() {
    await this.resetButton.click();
  }

  /** Get all available scope options by opening the dropdown */
  async getScopeOptions(): Promise<string[]> {
    await this.scopeTrigger().click();
    const options = await this.page.getByRole('option').allTextContents();
    // Close dropdown by pressing Escape
    await this.page.keyboard.press('Escape');
    return options;
  }
}
