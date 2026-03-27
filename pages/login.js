// @ts-check
import { test } from '@playwright/test';

export class LoginPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/'
        this.usernameInput = page.getByRole('textbox', { name: 'Username' }).describe('Username input field');
        this.passwordInput = page.getByRole('textbox', { name: 'Password' }).describe('Password input field');
        this.loginInButton = page.getByRole('button', { name: 'Login' }).describe('Login in button');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for login page to load', async () => {
            await this.usernameInput.waitFor({ state: 'visible' });
        });
    }

    /**
     * @param {string} username
     * @param {string} password
    */
    async submitLoginInForm(username, password) {
        await this.usernameInput.fill(username)
        await this.passwordInput.fill(password)
        await this.loginInButton.click()
    }
}