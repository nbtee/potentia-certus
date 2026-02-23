import { type Page, type Locator } from '@playwright/test';

export class AdminTablePage {
  readonly page: Page;
  readonly container: Locator;
  readonly searchInput: Locator;
  readonly recordCount: Locator;
  readonly table: Locator;
  readonly tableHeaders: Locator;
  readonly tableRows: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly pageInfo: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.rounded-lg.border.border-gray-200.bg-white');
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.recordCount = page.locator('span.text-xs.text-gray-400').filter({ hasText: /records/ });
    this.table = page.locator('table');
    this.tableHeaders = page.locator('thead th');
    this.tableRows = page.locator('tbody tr');
    this.prevButton = page.getByRole('button', { name: /previous/i }).or(
      page.locator('button:has(svg.lucide-chevron-left)')
    );
    this.nextButton = page.getByRole('button', { name: /next/i }).or(
      page.locator('button:has(svg.lucide-chevron-right)')
    );
    this.pageInfo = page.locator('text=Page').locator('..');
    this.emptyState = page.getByText('No results found');
  }

  /** Wait for the table to finish loading (skeletons gone, rows present) */
  async waitForLoaded() {
    // Wait for any skeleton/pulse animations to disappear
    await this.page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    // Wait for either rows or empty state
    await this.tableRows.first().or(this.emptyState).waitFor({ timeout: 15_000 });
  }

  /** Search the table */
  async search(query: string) {
    await this.searchInput.fill(query);
    // Give debounce time
    await this.page.waitForTimeout(500);
  }

  /** Clear search */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /** Click a column header to sort */
  async sortByColumn(headerText: string) {
    await this.page.locator('thead th').filter({ hasText: headerText }).click();
  }

  /** Get the number of visible table rows */
  async rowCount(): Promise<number> {
    return this.tableRows.count();
  }

  /** Go to next page */
  async nextPage() {
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  /** Go to previous page */
  async prevPage() {
    await this.prevButton.click();
    await this.page.waitForTimeout(300);
  }
}
