// @ts-check
import { test } from '@playwright/test';

export class CheckoutStepTwoPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/checkout-step-two.html';
        this.title = page.locator('[data-test="title"]').describe('Checkout overview page title');
        this.finishButton = page.locator('[data-test="finish"]').describe('Finish order button');
        this.cancelButton = page.locator('[data-test="cancel"]').describe('Cancel button');
        this.orderItems = page.locator('.cart_item').describe('Order item rows');
        this.orderItemNames = page.locator('.inventory_item_name').describe('Order item names');
        this.orderItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Order item prices');
        this.orderItemQuantities = page.locator('[data-test="item-quantity"]').describe('Order item quantities');
        this.subtotalLabel = page.locator('[data-test="subtotal-label"]').describe('Item total label');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Checkout Step Two page to load', async () => {
            await this.finishButton.waitFor({ state: 'visible' });
        });
    }

    async clickFinish() {
        await this.finishButton.click();
    }
}
