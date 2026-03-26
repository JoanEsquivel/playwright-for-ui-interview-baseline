import { LoginPage } from '../pages/login';
import { HomePage } from '../pages/home';
import { CheckoutPage } from '../pages/checkout';
import { expect } from '@playwright/test';

export class E2E {
    constructor(page) {
        this.page = page;
        this.loginPage = new LoginPage(page);
        this.homePage = new HomePage(page);
        this.checkoutPage = new CheckoutPage(page);
    }

    async login() {
        await this.loginPage.load();
        await this.loginPage.waitLoad();
        await this.loginPage.submitSignInForm(process.env.email, process.env.password);
        await this.checkoutPage.waitLoad();
        await expect(this.checkoutPage.shopNowButton).toBeVisible();
    }
}