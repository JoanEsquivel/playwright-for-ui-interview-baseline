import { test, expect } from '../../fixtures/index.fixtures';
import data from '../../data/checkout.json';

test.describe('Checkout', { tag: ['@e2e'] }, () => {
  test.beforeEach(async ({ inventoryPage }) => {
    await test.step('Open inventory as an authenticated user', async () => {
      await inventoryPage.load();
      await inventoryPage.waitLoad();
    });
  });

  test('should complete a purchase for the first items in the inventory', { tag: ['@smoke'] }, async ({
    inventoryPage, cartPage, checkoutStepOnePage, checkoutStepTwoPage, checkoutCompletePage,
  }) => {
    let addedItemNames: string[] = [];
    let addedItemPrices: string[] = [];

    await test.step('Add items to cart', async () => {
      addedItemNames = await inventoryPage.addItemsToCart(data.itemsToBuy);
      await expect(inventoryPage.cartBadge).toHaveText(String(data.itemsToBuy));
    });

    await test.step('Verify cart contents', async () => {
      await inventoryPage.openCart();
      await cartPage.waitLoad();
      await expect(cartPage.cartItems).toHaveCount(data.itemsToBuy);
      await expect(cartPage.cartItemNames).toHaveText(addedItemNames);
      addedItemPrices = await cartPage.cartItemPrices.allTextContents();
    });

    await test.step('Fill checkout information', async () => {
      await cartPage.proceedToCheckout();
      await checkoutStepOnePage.waitLoad();
      await checkoutStepOnePage.fillCheckoutForm(
        data.userInfo.firstName, data.userInfo.lastName, data.userInfo.postalCode,
      );
      await checkoutStepOnePage.continueToOverview();
    });

    await test.step('Verify order overview', async () => {
      await checkoutStepTwoPage.waitLoad();
      const expectedTotal = addedItemPrices
        .map((p) => Number.parseFloat(p.replace('$', '')))
        .reduce((sum, price) => sum + price, 0)
        .toFixed(2);
      await expect(checkoutStepTwoPage.orderItems).toHaveCount(data.itemsToBuy);
      await expect(checkoutStepTwoPage.orderItemNames).toHaveText(addedItemNames);
      await expect(checkoutStepTwoPage.orderItemPrices).toHaveText(addedItemPrices);
      await expect(checkoutStepTwoPage.subtotalLabel).toContainText(`$${expectedTotal}`);
    });

    await test.step('Finish order', async () => {
      await checkoutStepTwoPage.finishOrder();
      await checkoutCompletePage.waitLoad();
      await expect(checkoutCompletePage.successHeading).toHaveText(data.successMessage);
    });
  });
});
