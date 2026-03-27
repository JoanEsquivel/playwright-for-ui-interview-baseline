// @ts-check
import { test } from '@playwright/test';

export class CheckoutStepOnePage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/checkout-step-one.html';
        this.title = page.locator('[data-test="title"]').describe('Checkout step one page title');
        this.firstNameInput = page.getByRole('textbox', { name: 'First Name' }).describe('First name input');
        this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' }).describe('Last name input');
        this.postalCodeInput = page.getByRole('textbox', { name: 'Zip/Postal Code' }).describe('Zip/Postal code input');
        this.continueButton = page.locator('[data-test="continue"]').describe('Continue button');
        this.cancelButton = page.locator('[data-test="cancel"]').describe('Cancel button');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Checkout Step One page to load', async () => {
            await this.firstNameInput.waitFor({ state: 'visible' });
        });
    }

    /**
     * @param {string} firstName
     * @param {string} lastName
     * @param {string} postalCode
     */
    async fillCheckoutForm(firstName, lastName, postalCode) {
        await this.firstNameInput.fill(firstName);
        await this.lastNameInput.fill(lastName);
        await this.postalCodeInput.fill(postalCode);
    }

    async clickContinue() {
        await this.continueButton.click();
    }
}
