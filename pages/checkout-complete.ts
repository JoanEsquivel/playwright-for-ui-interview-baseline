import { test, type Locator, type Page } from '@playwright/test';

export class CheckoutCompletePage {
  readonly page: Page;
  readonly url = '/checkout-complete.html';
  readonly title: Locator;
  readonly successHeading: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.successHeading = page.locator('[data-test="complete-header"]').describe('Order complete heading');
    this.backHomeButton = page.getByRole('button', { name: 'Back Home' }).describe('Back home button');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Checkout Complete page to load', async () => {
      await this.successHeading.waitFor({ state: 'visible' });
    });
  }

  async backToProducts(): Promise<void> {
    await this.backHomeButton.click();
  }
}
