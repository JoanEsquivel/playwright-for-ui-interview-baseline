// @ts-check
import { test } from '@playwright/test';

export class LoginPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/login'
        this.emailInput = page.getByRole('textbox', { name: 'Email Address *' }).describe('Email input field');
        this.passwordInput = page.getByRole('textbox', { name: 'Password *' }).describe('Password input field');
        this.signInButton = page.getByRole('button', { name: 'Sign In' }).describe('Sign in button');
        this.emailWarning = page.locator('[data-testid="login-email-error"]').describe('Email warning'),
            this.passwordWarning = page.locator('[data-testid="login-password-error"]').describe('Password warning')
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for login page to load', async () => {
            await this.emailInput.waitFor({ state: 'visible' });
        });
    }

    /**
     * @param {string} email
     * @param {string} password
    */
    async submitSignInForm(email, password) {
        await this.emailInput.fill(email)
        await this.passwordInput.fill(password)
        await this.signInButton.click()
    }
}