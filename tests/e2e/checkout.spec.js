// @ts-check
import { test, expect } from '../../fixtures/index.fixtures';
import checkoutData from '../../data/checkout-data.json';

const { userInfo } = checkoutData;

test.describe('Checkout — Happy Path', () => {

    test.beforeEach(async ({ e2e }) => {
        await test.step('Login and navigate to inventory', async () => {
            await e2e.login();
        });
    });

    test('should complete checkout with a single item', async ({ e2e, checkoutCompletePage }) => {
        await test.step('Run checkout happy path with one item', async () => {
            await e2e.checkoutHappyPath(userInfo, 1);
        });

        await expect(checkoutCompletePage.successHeading).toBeVisible();
        await expect(checkoutCompletePage.successHeading).toHaveText('Thank you for your order!');
        await expect(checkoutCompletePage.backHomeButton).toBeVisible();
    });

    test('should complete checkout with multiple items', async ({ e2e, checkoutCompletePage }) => {
        await test.step('Run checkout happy path with three items', async () => {
            await e2e.checkoutHappyPath(userInfo, 3);
        });

        await expect(checkoutCompletePage.successHeading).toBeVisible();
        await expect(checkoutCompletePage.successHeading).toHaveText('Thank you for your order!');
        await expect(checkoutCompletePage.backHomeButton).toBeVisible();
    });

    test('should display correct item count in cart before checkout', async ({ e2e, inventoryPage, cartPage }) => {
        await test.step('Add two items to cart', async () => {
            await e2e.inventoryPage.addItemsToCart(2);
        });

        await expect(inventoryPage.cartBadge).toHaveText('2');

        await test.step('Navigate to cart', async () => {
            await inventoryPage.clickCartLink();
            await cartPage.waitLoad();
        });

        await expect(cartPage.cartItems).toHaveCount(2);
    });

    test('should display order summary on step two before finishing', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
    }) => {
        await test.step('Add one item and navigate to cart', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
        });

        await test.step('Proceed through step one', async () => {
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
            await checkoutStepOnePage.fillCheckoutForm(
                userInfo.firstName,
                userInfo.lastName,
                userInfo.postalCode
            );
            await checkoutStepOnePage.clickContinue();
            await checkoutStepTwoPage.waitLoad();
        });

        await expect(checkoutStepTwoPage.orderItems).toHaveCount(1);
        await expect(checkoutStepTwoPage.subtotalLabel).toBeVisible();
        await expect(checkoutStepTwoPage.finishButton).toBeVisible();
    });

    test('should return to inventory after clicking Back Home on confirmation page', async ({
        e2e,
        checkoutCompletePage,
        inventoryPage,
    }) => {
        await test.step('Complete checkout', async () => {
            await e2e.checkoutHappyPath(userInfo, 1);
        });

        await test.step('Click back to products', async () => {
            await checkoutCompletePage.clickBackHome();
            await inventoryPage.waitLoad();
        });

        await expect(inventoryPage.title).toBeVisible();
        await expect(inventoryPage.title).toHaveText('Products');
    });
});

test.describe('Checkout — Unhappy Path', () => {

    test.beforeEach(async ({ e2e }) => {
        await test.step('Login and navigate to inventory', async () => {
            await e2e.login();
        });
    });

    test('should show error when first name is missing', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
    }) => {
        await test.step('Add item and navigate to checkout step one', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
        });

        await test.step('Submit form without first name', async () => {
            await checkoutStepOnePage.fillCheckoutForm('', userInfo.lastName, userInfo.postalCode);
            await checkoutStepOnePage.clickContinue();
        });

        await expect(checkoutStepOnePage.errorMessage).toBeVisible();
        await expect(checkoutStepOnePage.errorMessage).toContainText('First Name is required');
    });

    test('should show error when last name is missing', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
    }) => {
        await test.step('Add item and navigate to checkout step one', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
        });

        await test.step('Submit form without last name', async () => {
            await checkoutStepOnePage.fillCheckoutForm(userInfo.firstName, '', userInfo.postalCode);
            await checkoutStepOnePage.clickContinue();
        });

        await expect(checkoutStepOnePage.errorMessage).toBeVisible();
        await expect(checkoutStepOnePage.errorMessage).toContainText('Last Name is required');
    });

    test('should show error when postal code is missing', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
    }) => {
        await test.step('Add item and navigate to checkout step one', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
        });

        await test.step('Submit form without postal code', async () => {
            await checkoutStepOnePage.fillCheckoutForm(userInfo.firstName, userInfo.lastName, '');
            await checkoutStepOnePage.clickContinue();
        });

        await expect(checkoutStepOnePage.errorMessage).toBeVisible();
        await expect(checkoutStepOnePage.errorMessage).toContainText('Postal Code is required');
    });

    test('should show error when all fields are empty', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
    }) => {
        await test.step('Add item and navigate to checkout step one', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
        });

        await test.step('Submit empty form', async () => {
            await checkoutStepOnePage.fillCheckoutForm('', '', '');
            await checkoutStepOnePage.clickContinue();
        });

        await expect(checkoutStepOnePage.errorMessage).toBeVisible();
        await expect(checkoutStepOnePage.errorMessage).toContainText('First Name is required');
    });

    test('should stay on step one when cancel is clicked', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
    }) => {
        await test.step('Add item and navigate to checkout step one', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
        });

        await test.step('Click cancel on step one', async () => {
            await checkoutStepOnePage.cancelButton.click();
            await cartPage.waitLoad();
        });

        await expect(cartPage.checkoutButton).toBeVisible();
    });

    test('should cancel from step two and return to inventory', async ({
        e2e,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        inventoryPage,
    }) => {
        await test.step('Navigate to checkout step two', async () => {
            await e2e.inventoryPage.addItemsToCart(1);
            await e2e.inventoryPage.clickCartLink();
            await cartPage.waitLoad();
            await cartPage.clickCheckout();
            await checkoutStepOnePage.waitLoad();
            await checkoutStepOnePage.fillCheckoutForm(
                userInfo.firstName,
                userInfo.lastName,
                userInfo.postalCode
            );
            await checkoutStepOnePage.clickContinue();
            await checkoutStepTwoPage.waitLoad();
        });

        await test.step('Click cancel on step two', async () => {
            await checkoutStepTwoPage.cancelButton.click();
            await inventoryPage.waitLoad();
        });

        await expect(inventoryPage.title).toBeVisible();
        await expect(inventoryPage.title).toHaveText('Products');
    });
});
