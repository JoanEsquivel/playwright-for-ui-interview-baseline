import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '@/pages/login';
import { InventoryPage } from '@/pages/inventory';
import { CartPage } from '@/pages/cart';
import { CheckoutStepOnePage } from '@/pages/checkout-step-one';
import { CheckoutStepTwoPage } from '@/pages/checkout-step-two';
import { CheckoutCompletePage } from '@/pages/checkout-complete';
import { env } from './env';

/**
 * Multi-page flows. Action-only, except for the documented "bridge guard":
 * an `expect` that confirms a page transition happened so the next step is safe.
 */
export class E2E {
  readonly loginPage: LoginPage;
  readonly inventoryPage: InventoryPage;
  readonly cartPage: CartPage;
  readonly checkoutStepOnePage: CheckoutStepOnePage;
  readonly checkoutStepTwoPage: CheckoutStepTwoPage;
  readonly checkoutCompletePage: CheckoutCompletePage;

  constructor(readonly page: Page) {
    this.loginPage = new LoginPage(page);
    this.inventoryPage = new InventoryPage(page);
    this.cartPage = new CartPage(page);
    this.checkoutStepOnePage = new CheckoutStepOnePage(page);
    this.checkoutStepTwoPage = new CheckoutStepTwoPage(page);
    this.checkoutCompletePage = new CheckoutCompletePage(page);
  }

  async login(): Promise<void> {
    await test.step('Login as the configured E2E user', async () => {
      await this.loginPage.load();
      await this.loginPage.waitLoad();
      await this.loginPage.submitLoginForm(env.E2E_USERNAME, env.E2E_PASSWORD);
      await this.inventoryPage.waitLoad();
      // Bridge guard: confirms the transition, not a test outcome.
      await expect(this.inventoryPage.title).toBeVisible();
    });
  }
}
