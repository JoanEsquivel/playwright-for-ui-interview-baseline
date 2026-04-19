import { LoginPage } from '../pages/login';
import { InventoryPage } from '../pages/inventory';
import { CartPage } from '../pages/cart';
import { CheckoutStepOnePage } from '../pages/checkout-step-one';
import { CheckoutStepTwoPage } from '../pages/checkout-step-two';
import { CheckoutCompletePage } from '../pages/checkout-complete';
import { expect } from '@playwright/test';

export class E2E {
    constructor(page) {
        this.page = page;
        this.loginPage = new LoginPage(page);
        this.inventoryPage = new InventoryPage(page);
        this.cartPage = new CartPage(page);
        this.checkoutStepOnePage = new CheckoutStepOnePage(page);
        this.checkoutStepTwoPage = new CheckoutStepTwoPage(page);
        this.checkoutCompletePage = new CheckoutCompletePage(page);
    }

    async login() {
        await this.loginPage.load();
        await this.loginPage.waitLoad();
        await this.loginPage.submitLoginInForm(process.env.email, process.env.password);
        await this.inventoryPage.waitLoad();
        await expect(this.inventoryPage.title).toBeVisible();
    }

    /**
     * Adds items to cart, navigates through the full checkout flow, and lands on the confirmation page.
     * @param {{ firstName: string, lastName: string, postalCode: string }} userInfo
     * @param {number} [itemCount=1] - Number of items to add from inventory
     */
    async checkoutHappyPath(userInfo, itemCount = 1) {
        await this.inventoryPage.addItemsToCart(itemCount);
        await this.inventoryPage.clickCartLink();
        await this.cartPage.waitLoad();
        await expect(this.cartPage.checkoutButton).toBeVisible();

        await this.cartPage.clickCheckout();
        await this.checkoutStepOnePage.waitLoad();
        await expect(this.checkoutStepOnePage.firstNameInput).toBeVisible();

        await this.checkoutStepOnePage.fillCheckoutForm(
            userInfo.firstName,
            userInfo.lastName,
            userInfo.postalCode
        );
        await this.checkoutStepOnePage.clickContinue();
        await this.checkoutStepTwoPage.waitLoad();
        await expect(this.checkoutStepTwoPage.finishButton).toBeVisible();

        await this.checkoutStepTwoPage.clickFinish();
        await this.checkoutCompletePage.waitLoad();
    }
}
