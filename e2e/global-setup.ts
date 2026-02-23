import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { testUsers, validateTestUsers } from './fixtures/test-users';

// Load .env.local so test credentials are available
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Re-read after dotenv loads
const users = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_PASSWORD ?? '',
  },
  consultant: {
    email: process.env.TEST_CONSULTANT_EMAIL ?? '',
    password: process.env.TEST_PASSWORD ?? '',
  },
};

const AUTH_DIR = path.resolve(__dirname, '.auth');

async function loginAndSave(
  baseURL: string,
  email: string,
  password: string,
  savePath: string
) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  await context.storageState({ path: savePath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  if (!users.admin.email || !users.admin.password || !users.consultant.email) {
    throw new Error(
      'Missing test user env vars (TEST_ADMIN_EMAIL, TEST_CONSULTANT_EMAIL, TEST_PASSWORD). ' +
        'Add them to .env.local.'
    );
  }

  const baseURL = config.projects[0].use?.baseURL ?? 'http://localhost:3001';

  // Ensure auth dir exists
  const fs = await import('fs');
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  console.log('  Logging in admin user...');
  await loginAndSave(
    baseURL,
    users.admin.email,
    users.admin.password,
    path.resolve(AUTH_DIR, 'admin.json')
  );

  console.log('  Logging in consultant user...');
  await loginAndSave(
    baseURL,
    users.consultant.email,
    users.consultant.password,
    path.resolve(AUTH_DIR, 'consultant.json')
  );

  console.log('  Global setup complete — auth states saved.');
}
