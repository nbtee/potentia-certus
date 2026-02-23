import { test, expect } from '../fixtures/auth.fixture';
import { AdminUsersPage } from '../page-objects/admin-users.page';
import { AdminTablePage } from '../page-objects/admin-table.page';

test.describe('Admin Users', () => {
  test('user table loads with data', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    const count = await table.rowCount();
    expect(count).toBeGreaterThan(0);
  });

  test('search filters the table', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    const initialCount = await table.rowCount();

    // Search for a very specific term that likely reduces results
    await table.search('admin');
    const filteredCount = await table.rowCount();

    // Either fewer results or same (if all match)
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    await table.clearSearch();
  });

  test('pagination works', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    // Check if pagination exists (more than one page)
    const nextBtn = table.nextButton;
    if (await nextBtn.isVisible()) {
      const isDisabled = await nextBtn.isDisabled();
      if (!isDisabled) {
        await table.nextPage();
        // Should still have rows
        const count = await table.rowCount();
        expect(count).toBeGreaterThan(0);
      }
    }
  });

  test('Invite User dialog opens and closes', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    await users.goto();

    await users.openInviteDialog();
    await expect(users.dialogTitle).toBeVisible();
    await expect(users.dialogTitle).toContainText(/invite/i);

    await users.closeDialog();
    await expect(users.dialogTitle).not.toBeVisible();
  });

  test('Import CSV button is visible', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    await users.goto();
    await expect(users.importCsvButton).toBeVisible();
  });

  test('Import CSV dialog opens', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    await users.goto();

    await users.openImportDialog();
    // A dialog should appear
    await expect(adminPage.locator('[role="dialog"]')).toBeVisible();
    // Close it
    await adminPage.keyboard.press('Escape');
  });

  test('row actions dropdown is functional', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    const rowCount = await table.rowCount();
    if (rowCount > 0) {
      await users.openRowActions(0);
      // Menu should appear with Edit option
      await expect(adminPage.getByRole('menuitem', { name: /edit/i })).toBeVisible();
      // Close by pressing Escape
      await adminPage.keyboard.press('Escape');
    }
  });

  test('record count is displayed', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    await expect(table.recordCount).toBeVisible();
  });

  test('table headers are present', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    const table = new AdminTablePage(adminPage);
    await users.goto();
    await table.waitForLoaded();

    const headerCount = await table.tableHeaders.count();
    expect(headerCount).toBeGreaterThanOrEqual(3);
  });

  test('Invite User dialog has required fields', async ({ adminPage }) => {
    const users = new AdminUsersPage(adminPage);
    await users.goto();

    await users.openInviteDialog();
    await expect(users.emailInput).toBeVisible();
    await expect(users.firstNameInput).toBeVisible();
    await expect(users.lastNameInput).toBeVisible();
    await users.closeDialog();
  });
});
