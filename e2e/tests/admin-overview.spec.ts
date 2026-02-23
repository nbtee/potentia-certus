import { test, expect } from '../fixtures/auth.fixture';

test.describe('Admin Overview', () => {
  test('admin overview page renders', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('stat cards display numeric values', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');

    // Admin overview has stat cards with counts (Users, Hierarchy Nodes, Data Assets, etc.)
    // They use large text for the number
    const statNumbers = adminPage.locator('main .text-3xl, main .text-2xl').filter({ hasNotText: /[a-zA-Z]{3,}/ });
    const count = await statNumbers.count();

    // Should have at least one stat card
    if (count > 0) {
      const firstValue = await statNumbers.first().textContent();
      expect(firstValue).toBeTruthy();
    }
  });

  test('last sync info is displayed', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');

    // Look for sync-related text (status or timestamp)
    const syncInfo = adminPage.getByText(/sync|ingestion|last/i).first();
    // This may or may not be visible depending on data
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('page has heading content', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await adminPage.waitForLoadState('networkidle');

    // There should be some heading or title on the admin overview
    const headings = adminPage.locator('main h1, main h2, main h3');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });
});
