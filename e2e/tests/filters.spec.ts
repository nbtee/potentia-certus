import { test, expect } from '../fixtures/auth.fixture';
import { FilterBarPage } from '../page-objects/filter-bar.page';
import { DashboardListPage } from '../page-objects/dashboard-list.page';

// Helper: navigate to a dashboard that has a filter bar
async function openDashboardWithFilters(page: import('@playwright/test').Page) {
  const list = new DashboardListPage(page);
  await list.goto();
  const cards = list.dashboardCards();
  if ((await cards.count()) > 0) {
    await cards.first().click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Filters', () => {
  test('filter bar renders with default "Last 30 days"', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);
    await expect(filters.container).toBeVisible();
    await expect(filters.timePeriodTrigger()).toContainText('Last 30 days');
  });

  test('changing time period updates the select', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);

    await filters.setTimePeriod('Last 7 days');
    await expect(filters.timePeriodTrigger()).toContainText('Last 7 days');
  });

  test('"Filters Active" badge appears after changing period', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);

    await filters.setTimePeriod('Last 90 days');
    await expect(filters.filtersActiveBadge).toBeVisible();
  });

  test('Reset button clears filters', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);

    await filters.setTimePeriod('This Year');
    await expect(filters.filtersActiveBadge).toBeVisible();

    await filters.reset();
    await expect(filters.timePeriodTrigger()).toContainText('Last 30 days');
  });

  test('Custom Range shows date pickers', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);

    await filters.setTimePeriod('Custom Range');
    await expect(adminPage.getByRole('button', { name: /pick dates/i })).toBeVisible();
  });

  test('scope select is visible', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);
    await expect(filters.scopeTrigger()).toBeVisible();
  });

  test('admin sees National scope option', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);
    const options = await filters.getScopeOptions();
    expect(options).toContain('National');
  });

  test('consultant has limited scope options', async ({ consultantPage }) => {
    // Consultant may have no dashboards — use template to create one
    const list = new DashboardListPage(consultantPage);
    await list.goto();

    const cards = list.dashboardCards();
    if ((await cards.count()) === 0) {
      // Use template to create a dashboard
      const templateBtn = consultantPage.getByRole('button', { name: /use template/i }).first();
      if (await templateBtn.isVisible()) {
        await templateBtn.click();
        await consultantPage.waitForURL('**/dashboards/**', { timeout: 15_000 });
      } else {
        // No template either — skip this test
        test.skip();
        return;
      }
    } else {
      await cards.first().click();
      await consultantPage.waitForLoadState('networkidle');
    }

    const filters = new FilterBarPage(consultantPage);
    const options = await filters.getScopeOptions();

    expect(options).toContain('My Performance');
    expect(options).not.toContain('National');
  });

  test('changing scope updates the select', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    const filters = new FilterBarPage(adminPage);

    await filters.setScope('National');
    await expect(filters.scopeTrigger()).toContainText('National');
  });

  test('filter bar label shows "Filters"', async ({ adminPage }) => {
    await openDashboardWithFilters(adminPage);
    await expect(adminPage.getByText('Filters').first()).toBeVisible();
  });
});
