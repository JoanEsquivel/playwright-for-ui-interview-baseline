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
}
