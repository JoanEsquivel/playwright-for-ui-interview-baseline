
import { test as base } from '@playwright/test';

import { LoginPage } from '../pages/login';
import { InventoryPage } from '../pages/inventory';
import { CartPage } from '../pages/cart';
import { CheckoutStepOnePage } from '../pages/checkout-step-one';
import { CheckoutStepTwoPage } from '../pages/checkout-step-two';
import { CheckoutCompletePage } from '../pages/checkout-complete';

export const pageFixture = base.extend({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    inventoryPage: async ({ page }, use) => {
        await use(new InventoryPage(page));
    },
    cartPage: async ({ page }, use) => {
        await use(new CartPage(page));
    },
    checkoutStepOnePage: async ({ page }, use) => {
        await use(new CheckoutStepOnePage(page));
    },
    checkoutStepTwoPage: async ({ page }, use) => {
        await use(new CheckoutStepTwoPage(page));
    },
    checkoutCompletePage: async ({ page }, use) => {
        await use(new CheckoutCompletePage(page));
    },
})
