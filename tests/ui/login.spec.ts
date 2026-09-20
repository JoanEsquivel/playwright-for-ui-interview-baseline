import { test, expect } from '@/fixtures/index.fixtures';
import { env } from '@/utils/env';
import data from '@/data/login.json';

// Login tests must start logged out: override the project's storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', { tag: ['@ui'] }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await test.step('Load login page', async () => {
      await loginPage.load();
      await loginPage.waitLoad();
    });
  });

  test('should redirect to inventory with valid credentials', { tag: ['@smoke'] }, async ({ loginPage, inventoryPage }) => {
    await loginPage.submitLoginForm(env.E2E_USERNAME, env.E2E_PASSWORD);
    await expect(loginPage.page).toHaveURL(/inventory\.html$/);
    await expect(inventoryPage.title).toHaveText('Products');
  });

  test('should show an error for a locked out user', { tag: ['@regression'] }, async ({ loginPage }) => {
    await loginPage.submitLoginForm(data.lockedOutUser.username, env.E2E_PASSWORD);
    await expect(loginPage.errorMessage).toHaveText(data.errors.lockedOut);
  });

  test('should require a username', { tag: ['@regression'] }, async ({ loginPage }) => {
    await loginPage.submitLoginForm(data.emptyCredentials.username, data.emptyCredentials.password);
    await expect(loginPage.errorMessage).toHaveText(data.errors.usernameRequired);
  });
});
