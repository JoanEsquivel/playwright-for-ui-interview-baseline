// @ts-check
import { test } from '@playwright/test';

export class CheckoutPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/checkout'
        this.shopNowButton = page.getByRole('button', { name: 'Shop Now' }).describe('Shop now button');

    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for login page to load', async () => {
            await this.shopNowButton.waitFor({ state: 'visible' });
        });
    }


}