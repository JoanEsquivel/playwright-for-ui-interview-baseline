import { test, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly url = '/';
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' }).describe('Username input');
    this.passwordInput = page.getByRole('textbox', { name: 'Password' }).describe('Password input');
    this.loginButton = page.getByRole('button', { name: 'Login' }).describe('Login button');
    this.errorMessage = page.locator('[data-test="error"]').describe('Login error message');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Login page to load', async () => {
      await this.loginButton.waitFor({ state: 'visible' });
    });
  }

  async submitLoginForm(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
