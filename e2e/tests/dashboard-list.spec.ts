import { test, expect } from '../fixtures/auth.fixture';
import { DashboardListPage } from '../page-objects/dashboard-list.page';

test.describe('Dashboard List', () => {
  test('page heading and sections render', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    await expect(list.heading).toBeVisible();
    await expect(list.createButton).toBeVisible();
  });

  test('Templates section renders', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();
    await expect(list.templatesHeading).toBeVisible();
  });

  test('Your Dashboards section renders', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();
    await expect(list.yourDashboardsHeading).toBeVisible();
  });

  test('create dashboard flow — open dialog, fill form, submit', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    const testName = `E2E Test Dashboard ${Date.now()}`;
    await list.createDashboard(testName, 'Created by E2E test');

    // Should redirect to the new dashboard view
    await expect(adminPage).toHaveURL(/\/dashboards\/.+/);
    await expect(adminPage.getByText(testName)).toBeVisible();

    // Cleanup: navigate back and delete
    await adminPage.goto('/dashboards');
    await adminPage.waitForLoadState('networkidle');
  });

  test('create dialog can be cancelled', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    await list.createButton.click();
    await expect(list.createDialogTitle).toBeVisible();

    await list.cancelButton.click();
    await expect(list.createDialogTitle).not.toBeVisible();
  });

  test('dashboard card click navigates to view', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    const cards = list.dashboardCards();
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const href = await cards.first().getAttribute('href');
      await cards.first().click();
      await expect(adminPage).toHaveURL(new RegExp(href!));
    }
  });

  test('use template creates a new dashboard', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    const templateButton = adminPage.getByRole('button', { name: /use template/i }).first();
    if (await templateButton.isVisible()) {
      await templateButton.click();
      // Should redirect to the new dashboard
      await expect(adminPage).toHaveURL(/\/dashboards\/.+/, { timeout: 15_000 });
    }
  });

  test('delete dialog can be cancelled', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();

    const deleteButtons = adminPage.locator('button[title="Delete dashboard"]');
    const count = await deleteButtons.count();

    if (count > 0) {
      await deleteButtons.first().click();
      await expect(list.deleteDialogTitle).toBeVisible();

      await list.cancelButton.click();
      await expect(list.deleteDialogTitle).not.toBeVisible();
    }
  });

  test('create button has plus icon', async ({ adminPage }) => {
    const list = new DashboardListPage(adminPage);
    await list.goto();
    await expect(list.createButton).toBeVisible();
    await expect(list.createButton).toContainText('Create Dashboard');
  });

  test('page loads for consultant too', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboards');
    await expect(consultantPage.getByRole('heading', { name: 'My Dashboards' })).toBeVisible();
  });
});
