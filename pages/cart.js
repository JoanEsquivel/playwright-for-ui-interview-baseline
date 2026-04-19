// @ts-check
import { test } from '@playwright/test';

export class CartPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/cart.html';
        this.title = page.locator('[data-test="title"]').describe('Cart page title');
        this.cartItems = page.locator('.cart_item').describe('Cart item rows');
        this.checkoutButton = page.getByRole('button', { name: 'Checkout' }).describe('Checkout button');
        this.continueShoppingButton = page.locator('[data-test="continue-shopping"]').describe('Continue shopping button');
        this.cartItemNames = page.locator('.inventory_item_name').describe('Item names in cart');
        this.cartItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Item prices in cart');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Cart page to load', async () => {
            await this.checkoutButton.waitFor({ state: 'visible' });
        });
    }

    async clickCheckout() {
        await this.checkoutButton.click();
    }
}
