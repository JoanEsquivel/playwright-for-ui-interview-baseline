import { test, expect } from '../../fixtures/index.fixtures'
import checkoutData from '../../data/checkout-data.json'

test.describe('SauceDemo Critical Path', () => {
    test.beforeEach(async ({ e2e }) => {
        await test.step('Login as standard user', async () => {
            await e2e.login()
        })
    })

    test('should complete full purchase flow', async ({
        inventoryPage,
        cartPage,
        checkoutStepOnePage,
        checkoutStepTwoPage,
        checkoutCompletePage,
    }) => {
        let addedItemNames = []
        let addedItemPrices = []

        await test.step('Add 2 items to cart from inventory', async () => {
            addedItemNames = await inventoryPage.addItemsToCart(2)
            await expect(inventoryPage.cartBadge).toHaveText('2')
        })

        await test.step('Verify cart contains the 2 added items and its names are correct', async () => {
            await cartPage.load()
            await cartPage.waitLoad()
            await expect(cartPage.cartItems).toHaveCount(2)
            await expect(cartPage.cartItemNames).toContainText(addedItemNames)
            addedItemPrices = await cartPage.cartItemPrices.allTextContents()
        })

        await test.step('Fill checkout information form', async () => {
            await cartPage.checkoutButton.click()
            await checkoutStepOnePage.waitLoad()
            await checkoutStepOnePage.fillCheckoutForm(
                checkoutData.userInfo.firstName,
                checkoutData.userInfo.lastName,
                checkoutData.userInfo.postalCode
            )
            await checkoutStepOnePage.clickContinue()
        })

        await test.step('Verify order overview: items, quantities, prices and subtotal', async () => {
            await checkoutStepTwoPage.waitLoad()
            const expectedTotal = addedItemPrices
                .map(p => parseFloat(p.replace('$', '')))
                .reduce((sum, price) => sum + price, 0)
                .toFixed(2)
            await expect(checkoutStepTwoPage.orderItems).toHaveCount(2)
            await expect(checkoutStepTwoPage.orderItemNames).toContainText(addedItemNames)
            await expect(checkoutStepTwoPage.orderItemPrices).toContainText(addedItemPrices)
            await expect(checkoutStepTwoPage.orderItemQuantities).toContainText(['1', '1'])
            await expect(checkoutStepTwoPage.subtotalLabel).toContainText(`$${expectedTotal}`)
        })

        await test.step('Complete order and verify success', async () => {
            await checkoutStepTwoPage.clickFinish()
            await checkoutCompletePage.waitLoad()
            await expect(checkoutCompletePage.successHeading).toBeVisible()
            await expect(checkoutCompletePage.successHeading).toHaveText('Thank you for your order!')
        })
    })
})
