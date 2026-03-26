
import { test as base } from '@playwright/test';

import { LoginPage } from '../pages/login';
import { HomePage } from '../pages/home';
import { CheckoutPage } from '../pages/checkout';

export const pageFixture = base.extend({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    homePage: async ({ page }, use) => {
        await use(new HomePage(page));
    },
    checkoutPage: async ({ page }, use) => {
        await use(new CheckoutPage(page));
    },
})