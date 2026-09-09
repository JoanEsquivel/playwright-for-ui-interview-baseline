import { test, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly url = '/cart.html';
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly cartItemNames: Locator;
  readonly cartItemPrices: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.cartItems = page.locator('[data-test="inventory-item"]').describe('Cart item rows');
    this.cartItemNames = page.locator('[data-test="inventory-item-name"]').describe('Cart item names');
    this.cartItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Cart item prices');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' }).describe('Checkout button');
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' }).describe('Continue shopping button');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Cart page to load', async () => {
      await this.checkoutButton.waitFor({ state: 'visible' });
    });
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }
}
