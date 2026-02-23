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

  /** Get the Scope picker trigger button (Popover trigger next to "Scope" label) */
  scopeTrigger() {
    return this.container.locator('label').filter({ hasText: 'Scope' }).locator('..').getByRole('button');
  }

  /** Change the time period preset */
  async setTimePeriod(label: string) {
    await this.timePeriodTrigger().click();
    await this.page.getByRole('option', { name: label }).click();
  }

  /** Change the hierarchy scope by clicking a preset button in the popover */
  async setScope(label: string) {
    await this.scopeTrigger().click();
    // Preset buttons are inside the popover content
    const popover = this.page.locator('[data-radix-popper-content-wrapper]');
    await popover.getByRole('button', { name: label }).click();
  }

  /** Reset all filters to defaults */
  async reset() {
    await this.resetButton.click();
  }

  /** Get all available scope preset labels by opening the popover */
  async getScopeOptions(): Promise<string[]> {
    await this.scopeTrigger().click();
    const popover = this.page.locator('[data-radix-popper-content-wrapper]');
    // Get preset buttons (not checkboxes)
    const presets = popover.locator('button:not([role="checkbox"])');
    const labels = await presets.allTextContents();
    await this.page.keyboard.press('Escape');
    return labels;
  }
}
