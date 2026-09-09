import { test, type Locator, type Page } from '@playwright/test';

export class CheckoutStepOnePage {
  readonly page: Page;
  readonly url = '/checkout-step-one.html';
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' }).describe('First name input');
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' }).describe('Last name input');
    this.postalCodeInput = page.getByRole('textbox', { name: 'Zip/Postal Code' }).describe('Postal code input');
    this.continueButton = page.getByRole('button', { name: 'Continue' }).describe('Continue button');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel button');
    this.errorMessage = page.locator('[data-test="error"]').describe('Checkout error message');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Checkout Step One page to load', async () => {
      await this.firstNameInput.waitFor({ state: 'visible' });
    });
  }

  async fillCheckoutForm(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview(): Promise<void> {
    await this.continueButton.click();
  }
}
