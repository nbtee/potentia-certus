import { test as base, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

const AUTH_DIR = path.resolve(__dirname, '../.auth');

type AuthFixtures = {
  adminPage: Page;
  consultantPage: Page;
  adminContext: BrowserContext;
  consultantContext: BrowserContext;
};

/**
 * Custom test fixture that provides pre-authenticated pages for admin and consultant roles.
 * Auth state is created once in global-setup.ts and reused here via storageState.
 */
export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, 'admin.json'),
    });
    await use(context);
    await context.close();
  },

  consultantContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve(AUTH_DIR, 'consultant.json'),
    });
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },

  consultantPage: async ({ consultantContext }, use) => {
    const page = await consultantContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
