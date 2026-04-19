// @ts-check
import { test } from '@playwright/test';

export class CheckoutCompletePage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/checkout-complete.html';
        this.successHeading = page.locator('[data-test="complete-header"]').describe('Order success heading');
        this.backHomeButton = page.locator('[data-test="back-to-products"]').describe('Back to products button');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Checkout Complete page to load', async () => {
            await this.successHeading.waitFor({ state: 'visible' });
        });
    }

    async clickBackHome() {
        await this.backHomeButton.click();
    }
}
