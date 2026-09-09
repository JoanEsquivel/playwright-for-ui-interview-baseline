import { test, type Locator, type Page } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly url = '/inventory.html';
  readonly title: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly addToCartButtons: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly sortDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.items = page.locator('[data-test="inventory-item"]').describe('Inventory item cards');
    this.itemNames = page.locator('[data-test="inventory-item-name"]').describe('Inventory item names');
    this.addToCartButtons = page.locator('[data-test^="add-to-cart"]').describe('Add to cart buttons');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]').describe('Shopping cart link');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]').describe('Cart item count badge');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]').describe('Product sort dropdown');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Inventory page to load', async () => {
      await this.title.waitFor({ state: 'visible' });
    });
  }

  /** Adds the first `count` items to the cart and returns their names. */
  async addItemsToCart(count: number): Promise<string[]> {
    const names = (await this.itemNames.allTextContents()).slice(0, count);
    for (let i = 0; i < count; i++) {
      await this.addToCartButtons.first().click();
    }
    return names;
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
