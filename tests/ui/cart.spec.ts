import { test, expect } from '../../fixtures/index.fixtures';
import data from '../../data/cart.json';

test.describe('Cart page', { tag: ['@ui'] }, () => {
  let addedItemNames: string[] = [];

  test.beforeEach(async ({ inventoryPage, cartPage }) => {
    await test.step('Add items to cart from the inventory', async () => {
      await inventoryPage.load();
      await inventoryPage.waitLoad();
      addedItemNames = await inventoryPage.addItemsToCart(data.itemsToAdd);
    });

    await test.step('Load Cart page', async () => {
      await cartPage.load();
      await cartPage.waitLoad();
    });
  });

  test('should show the items previously added from the inventory', { tag: ['@smoke'] }, async ({ cartPage }) => {
    await expect(cartPage.cartItems).toHaveCount(data.itemsToAdd);
    await expect(cartPage.cartItemNames).toHaveText(addedItemNames);
  });

  test('should return to the inventory when continuing shopping', { tag: ['@regression'] }, async ({ cartPage, inventoryPage }) => {
    await cartPage.continueShopping();
    await expect(cartPage.page).toHaveURL(/inventory\.html$/);
    await expect(inventoryPage.title).toHaveText(data.inventoryTitle);
    await expect(inventoryPage.cartBadge).toHaveText(String(data.itemsToAdd));
  });
});
