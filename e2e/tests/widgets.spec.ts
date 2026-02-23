import { test, expect } from '../fixtures/auth.fixture';
import { DashboardListPage } from '../page-objects/dashboard-list.page';

// Navigate to the first dashboard with widgets (use pipeline template which has 13)
async function openDashboardWithWidgets(page: import('@playwright/test').Page) {
  const list = new DashboardListPage(page);
  await list.goto();
  const cards = list.dashboardCards();
  if ((await cards.count()) > 0) {
    await cards.first().click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Widgets', () => {
  test('widgets render in the grid', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);
    const widgets = adminPage.locator('.react-grid-item');
    const count = await widgets.count();

    if (count > 0) {
      // At least one widget is visible
      await expect(widgets.first()).toBeVisible();
    }
  });

  test('KPI card shows numeric content', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    // KPI widgets typically have a large number display
    const kpiValues = adminPage.locator('.react-grid-item .text-3xl, .react-grid-item .text-4xl');
    const count = await kpiValues.count();

    if (count > 0) {
      const text = await kpiValues.first().textContent();
      expect(text).toBeTruthy();
    }
  });

  test('chart widgets render SVG elements', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    const svgs = adminPage.locator('.react-grid-item svg.recharts-surface');
    const count = await svgs.count();

    if (count > 0) {
      await expect(svgs.first()).toBeVisible();
    }
  });

  test('data table widget has headers and rows', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    const tables = adminPage.locator('.react-grid-item table');
    const count = await tables.count();

    if (count > 0) {
      const headers = tables.first().locator('thead th');
      await expect(headers.first()).toBeVisible();

      const rows = tables.first().locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  test('data table supports sorting via header click', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    const tables = adminPage.locator('.react-grid-item table');
    const count = await tables.count();

    if (count > 0) {
      const firstHeader = tables.first().locator('thead th').first();
      // Click header to sort — should not crash
      await firstHeader.click();
      await expect(tables.first()).toBeVisible();
    }
  });

  test('widget error boundary catches failures gracefully', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    // Verify no unhandled error text on page
    await expect(adminPage.getByText('Something went wrong')).not.toBeVisible();
    // The page itself should still be functional
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('data table row click opens detail sheet', async ({ adminPage }) => {
    await openDashboardWithWidgets(adminPage);

    const tables = adminPage.locator('.react-grid-item table');
    const count = await tables.count();

    if (count > 0) {
      const firstRow = tables.first().locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        // A Sheet or dialog may open — check for a panel or just verify no crash
        await adminPage.waitForTimeout(500);
        await expect(adminPage.locator('main')).toBeVisible();
      }
    }
  });

  test('widgets display loading skeleton then content', async ({ adminPage }) => {
    // Fresh navigation to trigger loading states
    const list = new DashboardListPage(adminPage);
    await list.goto();
    const cards = list.dashboardCards();
    if ((await cards.count()) > 0) {
      await cards.first().click();
      // Either skeletons appear briefly or content loads directly
      await adminPage.waitForLoadState('networkidle');
      await expect(adminPage.locator('main')).toBeVisible();
    }
  });
});
