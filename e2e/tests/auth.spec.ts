import { test, expect } from '../fixtures/auth.fixture';
import { test as baseTest } from '@playwright/test';
import { LoginPage } from '../page-objects/login.page';
import { HeaderPage } from '../page-objects/header.page';

// These tests use fresh browser contexts (no pre-auth)
baseTest.describe('Authentication', () => {
  baseTest('successful login redirects to /dashboard', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);

    await login.goto();
    await login.loginAndWaitForDashboard(
      process.env.TEST_ADMIN_EMAIL!,
      process.env.TEST_PASSWORD!
    );
    await expect(page).toHaveURL(/\/dashboard/);
    await context.close();
  });

  baseTest('failed login shows error message', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);

    await login.goto();
    await login.login('invalid@example.com', 'wrongpassword123');
    await expect(login.errorMessage).toBeVisible({ timeout: 10_000 });
    await context.close();
  });

  baseTest('login page has link to signup', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);

    await login.goto();
    await expect(login.signUpLink).toBeVisible();
    await expect(login.signUpLink).toHaveAttribute('href', '/signup');
    await context.close();
  });

  baseTest('unauthenticated /dashboard redirects to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  baseTest('unauthenticated /admin redirects to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });
});

// These tests use pre-authenticated sessions
test.describe('Authenticated session', () => {
  test('session persists across navigation', async ({ adminPage }) => {
    await adminPage.goto('/dashboard');
    await expect(adminPage.locator('main')).toBeVisible();

    await adminPage.goto('/dashboards');
    await expect(adminPage.getByRole('heading', { name: 'My Dashboards' })).toBeVisible();

    // Still authenticated — not redirected to login
    await expect(adminPage).not.toHaveURL(/\/login/);
  });

  test('logout redirects to login', async ({ browser }) => {
    // Use a FRESH login session so we don't invalidate the shared admin auth state.
    // Intercept the Supabase logout API BEFORE any navigation — signOut() defaults to
    // scope:'global' which revokes ALL sessions for the user. The glob pattern must use
    // regex because the actual URL includes ?scope=global query param.
    const context = await browser.newContext();
    const page = await context.newPage();

    // Intercept BEFORE navigation — regex matches /auth/v1/logout with any query params
    await page.route(/\/auth\/v1\/logout/, (route) =>
      route.fulfill({ status: 204, body: '' })
    );

    // Login manually
    await page.goto('/login');
    await page.locator('input#email').fill(process.env.TEST_ADMIN_EMAIL!);
    await page.locator('input#password').fill(process.env.TEST_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Now sign out — client-side flow works, server sessions preserved
    const header = new HeaderPage(page);
    await header.signOut();
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  test('login page heading is visible', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.heading).toBeVisible();
    await context.close();
  });
});
