import { test, expect } from '../fixtures/auth.fixture';
import { SidebarPage } from '../page-objects/sidebar.page';

test.describe('Role-Based Access — Admin', () => {
  test('admin sees all nav items including admin section', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    const names = await sidebar.getVisibleNavNames();

    expect(names).toContain('Dashboard');
    expect(names).toContain('My Dashboards');
    expect(names).toContain('AI Chat');
    expect(names).toContain('Admin Overview');
    expect(names).toContain('Users');
    expect(names).toContain('Hierarchy');
    expect(names).toContain('Business Rules');
    expect(names).toContain('Targets');
    expect(names).toContain('Data Assets');
    expect(names).toContain('Context Docs');
    expect(names).toContain('Synonyms');
    expect(names).toContain('Ingestion');
    expect(names).toContain('Audit Log');
  });

  test('admin can access /admin/users', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await expect(adminPage.locator('main')).toBeVisible();
    // Should NOT see "Access Denied"
    await expect(adminPage.getByText('Access Denied')).not.toBeVisible();
  });

  test('admin can access /admin/hierarchy', async ({ adminPage }) => {
    await adminPage.goto('/admin/hierarchy');
    await expect(adminPage.locator('main')).toBeVisible();
    await expect(adminPage.getByText('Access Denied')).not.toBeVisible();
  });

  test('admin can access /admin/audit-log', async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-log');
    await expect(adminPage.locator('main')).toBeVisible();
    await expect(adminPage.getByText('Access Denied')).not.toBeVisible();
  });

  test('admin does not see read-only banner', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByText('Read-only access')).not.toBeVisible();
  });
});

test.describe('Role-Based Access — Consultant', () => {
  test('consultant does not see admin nav items', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const names = await sidebar.getVisibleNavNames();

    expect(names).not.toContain('Admin Overview');
    expect(names).not.toContain('Users');
    expect(names).not.toContain('Hierarchy');
    expect(names).not.toContain('Business Rules');
    expect(names).not.toContain('Data Assets');
    expect(names).not.toContain('Context Docs');
    expect(names).not.toContain('Synonyms');
    expect(names).not.toContain('Audit Log');
  });

  test('consultant visiting /admin sees Access Denied', async ({ consultantPage }) => {
    await consultantPage.goto('/admin');
    await expect(consultantPage.getByText('Access Denied')).toBeVisible();
  });

  test('consultant visiting /admin/users sees Access Denied', async ({ consultantPage }) => {
    await consultantPage.goto('/admin/users');
    await expect(consultantPage.getByText('Access Denied')).toBeVisible();
  });

  test('consultant sees base nav items', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const names = await sidebar.getVisibleNavNames();

    expect(names).toContain('Dashboard');
    expect(names).toContain('My Dashboards');
    expect(names).toContain('AI Chat');
    expect(names).toContain('My Performance');
  });

  test('consultant does not see Team View', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const names = await sidebar.getVisibleNavNames();
    expect(names).not.toContain('Team View');
  });

  test('consultant does not see Analytics or Reports', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const names = await sidebar.getVisibleNavNames();
    expect(names).not.toContain('Analytics');
    expect(names).not.toContain('Reports');
  });

  test('consultant sidebar footer shows role', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const roleText = await sidebar.getRoleText();
    expect(roleText).toContain('Consultant');
  });
});
