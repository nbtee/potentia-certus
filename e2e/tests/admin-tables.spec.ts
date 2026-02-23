import { test, expect } from '../fixtures/auth.fixture';
import { AdminTablePage } from '../page-objects/admin-table.page';

// Pages that use AdminDataTable (have <table> elements)
const tablePages = [
  { name: 'Users', path: '/admin/users' },
  { name: 'Hierarchy', path: '/admin/hierarchy' },
  { name: 'Business Rules', path: '/admin/rules' },
  { name: 'Targets', path: '/admin/targets' },
  { name: 'Data Assets', path: '/admin/data-assets' },
];

// Pages that use Cards or custom layouts (no AdminDataTable)
const nonTablePages = [
  { name: 'Context Docs', path: '/admin/context-docs' },
  { name: 'Synonyms', path: '/admin/synonyms' },
  { name: 'Audit Log', path: '/admin/audit-log' },
  { name: 'Ingestion', path: '/admin/ingestion' },
];

test.describe('Admin Tables', () => {
  for (const { name, path } of tablePages) {
    test(`${name} page loads and table renders`, async ({ adminPage }) => {
      await adminPage.goto(path);
      await adminPage.waitForLoadState('networkidle');

      const table = new AdminTablePage(adminPage);
      await table.waitForLoaded();

      await expect(adminPage.locator('main')).toBeVisible();
    });
  }

  for (const { name, path } of nonTablePages) {
    test(`${name} page loads`, async ({ adminPage }) => {
      await adminPage.goto(path);
      await adminPage.waitForLoadState('networkidle');

      // These pages don't use AdminDataTable — just verify main content renders
      await expect(adminPage.locator('main')).toBeVisible();
      // Wait for any loading skeletons to clear
      await adminPage.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    });
  }
});
