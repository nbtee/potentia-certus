import { test, expect } from '../fixtures/auth.fixture';
import { SidebarPage } from '../page-objects/sidebar.page';

test.describe('Navigation', () => {
  test('Dashboard link navigates to /dashboard', async ({ adminPage }) => {
    await adminPage.goto('/dashboards');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('Dashboard');
    await expect(adminPage).toHaveURL(/\/dashboard(\?|$)/);
  });

  test('My Dashboards link navigates to /dashboards', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('My Dashboards');
    await expect(adminPage).toHaveURL(/\/dashboards(\?|$)/);
  });

  test('AI Chat link navigates to /chat', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('AI Chat');
    await expect(adminPage).toHaveURL(/\/chat(\?|$)/);
  });

  test('Admin Overview link navigates to /admin', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('Admin Overview');
    await expect(adminPage).toHaveURL(/\/admin(\?|$)/);
  });

  test('Users link navigates to /admin/users', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('Users');
    await expect(adminPage).toHaveURL(/\/admin\/users(\?|$)/);
  });

  test('Audit Log link navigates to /admin/audit-log', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    const sidebar = new SidebarPage(adminPage);
    await sidebar.navigateTo('Audit Log');
    await expect(adminPage).toHaveURL(/\/admin\/audit-log(\?|$)/);
  });

  test('active nav indicator shows on current page', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    const isActive = await sidebar.isNavActive('Dashboard');
    expect(isActive).toBe(true);
  });

  test('active nav indicator updates after navigation', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);

    await sidebar.navigateTo('My Dashboards');
    // Use auto-retrying assertion — React may not have re-rendered the sidebar yet
    await expect(sidebar.navLink('My Dashboards')).toHaveClass(/from-emerald-500/, { timeout: 5_000 });
    await expect(sidebar.navLink('Dashboard')).not.toHaveClass(/from-emerald-500/, { timeout: 5_000 });
  });

  test('sidebar shows role label in footer', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    const roleText = await sidebar.getRoleText();
    expect(roleText).toBeTruthy();
  });

  test('cross-navigation: dashboard → dashboards → admin → chat', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);

    await sidebar.navigateTo('My Dashboards');
    await expect(adminPage).toHaveURL(/\/dashboards(\?|$)/);

    await sidebar.navigateTo('Admin Overview');
    await expect(adminPage).toHaveURL(/\/admin(\?|$)/);

    await sidebar.navigateTo('AI Chat');
    await expect(adminPage).toHaveURL(/\/chat(\?|$)/);

    await sidebar.navigateTo('Dashboard');
    await expect(adminPage).toHaveURL(/\/dashboard(\?|$)/);
  });

  test('sidebar logo is visible', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    const sidebar = new SidebarPage(adminPage);
    await expect(sidebar.logo).toBeVisible();
  });

  test('consultant sees limited nav items', async ({ consultantPage }) => {
    await consultantPage.goto('/dashboard');
    const sidebar = new SidebarPage(consultantPage);
    const names = await sidebar.getVisibleNavNames();

    // Consultant should see these
    expect(names).toContain('Dashboard');
    expect(names).toContain('My Dashboards');
    expect(names).toContain('AI Chat');

    // Should NOT see admin-only items
    expect(names).not.toContain('Users');
    expect(names).not.toContain('Hierarchy');
    expect(names).not.toContain('Business Rules');
    expect(names).not.toContain('Data Assets');
    expect(names).not.toContain('Audit Log');
  });
});
