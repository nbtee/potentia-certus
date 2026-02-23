import { test, expect } from '../fixtures/auth.fixture';

test.describe('Smoke Tests', () => {
  test('home page loads', async ({ adminPage }) => {
    await adminPage.goto('/');
    await expect(adminPage).not.toHaveURL(/error|500/);
  });

  test('/dashboard loads', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/dashboards loads', async ({ adminPage }) => {
    await adminPage.goto('/dashboards');
    await expect(adminPage.getByRole('heading', { name: 'My Dashboards' })).toBeVisible();
  });

  test('/chat loads', async ({ adminPage }) => {
    await adminPage.goto('/chat');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin loads', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/users loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/hierarchy loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/hierarchy');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/rules loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/rules');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/targets loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/targets');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/data-assets loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/data-assets');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/context-docs loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/context-docs');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/synonyms loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/synonyms');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/ingestion loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/ingestion');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('/admin/audit-log loads', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('unauthenticated user sees login page', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await context.close();
  });
});
