// @ts-check
import { test } from '@playwright/test';

export class InventoryPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/inventory.html';
        this.title = page.locator('[data-test="title"]').describe('Products page title');
        this.addToCartButtons = page.locator('[data-test^="add-to-cart"]').describe('Add to cart buttons');
        this.cartLink = page.locator('[data-test="shopping-cart-link"]').describe('Shopping cart link');
        this.cartBadge = page.locator('[data-test="shopping-cart-badge"]').describe('Cart item count badge');
        this.sortDropdown = page.getByRole('combobox').describe('Product sort dropdown');
        this.itemNames = page.locator('.inventory_item_name').describe('Product names in inventory');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Inventory page to load', async () => {
            await this.title.waitFor({ state: 'visible' });
        });
    }

    /**
     * Dynamically adds the first N items to the cart
     * @param {number} count - Number of items to add
     */
    async addItemsToCart(count) {
        const all = await this.itemNames.allTextContents();
        const names = all.slice(0, count);
        for (let i = 0; i < count; i++) {
            await this.addToCartButtons.first().click();
        }
        return names;
    }

    async clickCartLink() {
        await this.cartLink.click();
    }
}
