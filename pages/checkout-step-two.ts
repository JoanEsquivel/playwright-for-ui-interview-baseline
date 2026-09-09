import { test, type Locator, type Page } from '@playwright/test';

export class CheckoutStepTwoPage {
  readonly page: Page;
  readonly url = '/checkout-step-two.html';
  readonly title: Locator;
  readonly orderItems: Locator;
  readonly orderItemNames: Locator;
  readonly orderItemPrices: Locator;
  readonly orderItemQuantities: Locator;
  readonly subtotalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.orderItems = page.locator('[data-test="inventory-item"]').describe('Order item rows');
    this.orderItemNames = page.locator('[data-test="inventory-item-name"]').describe('Order item names');
    this.orderItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Order item prices');
    this.orderItemQuantities = page.locator('[data-test="item-quantity"]').describe('Order item quantities');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]').describe('Item total label');
    this.finishButton = page.getByRole('button', { name: 'Finish' }).describe('Finish button');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel button');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Checkout Step Two page to load', async () => {
      await this.finishButton.waitFor({ state: 'visible' });
    });
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
  }
}
