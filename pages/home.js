// @ts-check
import { test } from '@playwright/test';

export class HomePage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/'
        this.heading = page.getByRole('heading', { name: 'Demo E-commerce Testing Store' }).describe('Heading');
        this.shopButton = page.getByRole('button', { name: 'Shop Now' }).describe('Shop now button');

    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for login page to load', async () => {
            await this.shopButton.waitFor({ state: 'visible' });
        });
    }


}