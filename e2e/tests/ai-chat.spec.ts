import { test, expect } from '../fixtures/auth.fixture';
import { ChatPanelPage } from '../page-objects/chat-panel.page';
import { ChatPagePage } from '../page-objects/chat-page.page';
import { DashboardListPage } from '../page-objects/dashboard-list.page';

test.describe('AI Chat — Dashboard Panel', () => {
  async function openDashboardWithChat(page: import('@playwright/test').Page) {
    const list = new DashboardListPage(page);
    await list.goto();
    const cards = list.dashboardCards();
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForLoadState('networkidle');
    }
  }

  test('chat trigger FAB is visible on dashboard', async ({ adminPage }) => {
    await openDashboardWithChat(adminPage);
    const chat = new ChatPanelPage(adminPage);
    await expect(chat.trigger).toBeVisible();
  });

  test('clicking trigger opens chat Sheet', async ({ adminPage }) => {
    await openDashboardWithChat(adminPage);
    const chat = new ChatPanelPage(adminPage);

    await chat.open();
    await expect(chat.sheetTitle).toBeVisible();
  });

  test('chat panel shows empty state', async ({ adminPage }) => {
    await openDashboardWithChat(adminPage);
    const chat = new ChatPanelPage(adminPage);

    await chat.open();
    await expect(chat.emptyState).toBeVisible();
  });

  test('chat panel has input and send button', async ({ adminPage }) => {
    await openDashboardWithChat(adminPage);
    const chat = new ChatPanelPage(adminPage);

    await chat.open();
    await expect(chat.textarea).toBeVisible();
    await expect(chat.sendButton).toBeVisible();
  });

  test('chat panel can be closed', async ({ adminPage }) => {
    await openDashboardWithChat(adminPage);
    const chat = new ChatPanelPage(adminPage);

    await chat.open();
    await expect(chat.sheetTitle).toBeVisible();

    await chat.close();
    await expect(chat.sheetTitle).not.toBeVisible();
  });
});

test.describe('AI Chat — Standalone Page', () => {
  // Mock the /api/chat endpoint so no real AI calls happen
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'Mocked AI response for testing.',
      });
    });
  });

  test('/chat page loads', async ({ adminPage }) => {
    const chatPage = new ChatPagePage(adminPage);
    await chatPage.goto();
    await expect(adminPage.locator('main')).toBeVisible();
  });

  test('input is functional on /chat page', async ({ adminPage }) => {
    const chatPage = new ChatPagePage(adminPage);
    await chatPage.goto();

    if (await chatPage.textarea.isVisible()) {
      await chatPage.textarea.fill('Test message');
      const value = await chatPage.textarea.inputValue();
      expect(value).toBe('Test message');
    }
  });

  test('empty state shows on /chat page', async ({ adminPage }) => {
    const chatPage = new ChatPagePage(adminPage);
    await chatPage.goto();
    await expect(chatPage.emptyState).toBeVisible();
  });
});
