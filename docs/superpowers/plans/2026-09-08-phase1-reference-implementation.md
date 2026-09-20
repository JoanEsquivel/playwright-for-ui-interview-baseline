# Phase 1 — Reference Implementation Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current JS saucedemo Playwright project into the TypeScript reference implementation of the new standards: typed fixtures, `setup/ui/api/e2e` projects, API layer with zod schemas, architecture-enforcing ESLint, and three CI strategies.

**Architecture:** Thin page objects (locators + actions, no assertions) wired as typed fixtures and merged in one `fixtures/index.fixtures.ts` that also exposes a `toMatchSchema` matcher. API access goes through client classes (`api/clients`) that return raw `APIResponse`, with zod schemas (`api/schemas`) validated in specs. `playwright.config.ts` defines `setup → ui/e2e` (storageState) and a browser-less `api` project; CI always emits a blob report and merges it to HTML.

**Tech Stack:** Node ≥ 20.11, pnpm 10.17 (via `corepack pnpm`), `@playwright/test` 1.63.0 (pinned), `@playwright/cli` 0.1.19, TypeScript 5.9.x, ESLint 10 + `typescript-eslint` 8.70 + `eslint-plugin-playwright` 2.11, zod 4.5, dotenv 17.

**Spec:** `docs/superpowers/specs/2026-09-08-playwright-standards-kit-design.md` (this plan covers "Phase 1" only; Phases 2–3 get their own plans once this code exists, because the kit templates copy from it).

## Global Constraints

- `@playwright/test` and `@playwright/cli` pinned to exact versions (no `^`).
- Assertions (`expect`) only in `tests/**` and, as a documented bridge guard, inside `utils/e2e.ts` flow methods wrapped in `test.step`. Never in `pages/**` or `api/**`.
- Spec files import `test`/`expect` only from `fixtures/index.fixtures`.
- No `page.goto()` in specs (use `<page>.load()`), no `waitForTimeout`, no conditionals in tests, no string-literal credentials.
- Every locator chains `.describe('<Name> <role>')`; prefer `getByRole`/`getByLabel`, then `[data-test=...]`, never CSS classes.
- Env var names: `BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`, `API_BASE_URL`, `API_USERNAME`, `API_PASSWORD`, optional `BROWSERS`, `WORKERS`. Reference values: saucedemo + dummyjson (example only).
- Test layout: `tests/setup`, `tests/ui`, `tests/api`, `tests/e2e`. Tags: `@smoke`, `@regression`, `@ui`, `@api`, `@e2e`.
- Commit after every task with the session attribution trailer.
- Run pnpm as `corepack pnpm` (pnpm is not on PATH on this machine).

---

### Task 1: Toolchain, config and project skeleton

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`, `playwright.config.ts`, `.env.example`, `utils/env.ts`
- Delete: `playwright.config.js`, `data/test.json`

**Interfaces:**
- Produces: `STORAGE_STATE` (string const exported from `playwright.config.ts`), `env` object from `utils/env.ts` with lazy getters `BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`, `API_BASE_URL`, `API_USERNAME`, `API_PASSWORD`.

- [ ] **Step 1: Replace `package.json`**

```json
{
  "name": "playwright-standards-reference",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Reference implementation of the Playwright standards kit (UI: saucedemo, API: dummyjson as example targets)",
  "packageManager": "pnpm@10.17.0",
  "engines": { "node": ">=20.11" },
  "scripts": {
    "test": "playwright test",
    "test:setup": "playwright test --project=setup",
    "test:ui": "playwright test --project=ui",
    "test:api": "playwright test --project=api",
    "test:e2e": "playwright test --project=e2e",
    "test:smoke": "playwright test --grep @smoke",
    "test:headed": "playwright test --headed",
    "test:debug": "PLAYWRIGHT_HTML_OPEN=never playwright test --debug=cli",
    "report": "playwright show-report",
    "report:merge": "playwright merge-reports --reporter html ./blob-report",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && tsc --noEmit",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "@playwright/cli": "0.1.19",
    "@playwright/test": "1.63.0",
    "@types/node": "^24.0.0",
    "dotenv": "^17.4.2",
    "eslint": "^10.10.0",
    "eslint-plugin-playwright": "^2.11.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.70.0",
    "zod": "^4.5.4"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["**/*.ts", "eslint.config.mjs", "scripts/**/*.mjs"],
  "exclude": ["node_modules", "test-results", "playwright-report", "blob-report"]
}
```

- [ ] **Step 3: Create `utils/env.ts`**

```ts
/**
 * Central access to environment variables. Getters are lazy so API-only runs
 * do not require UI variables and vice versa. Copy `.env.example` to `.env`.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}". Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  get BASE_URL(): string { return requireEnv('BASE_URL'); },
  get E2E_USERNAME(): string { return requireEnv('E2E_USERNAME'); },
  get E2E_PASSWORD(): string { return requireEnv('E2E_PASSWORD'); },
  get API_BASE_URL(): string { return requireEnv('API_BASE_URL'); },
  get API_USERNAME(): string { return requireEnv('API_USERNAME'); },
  get API_PASSWORD(): string { return requireEnv('API_PASSWORD'); },
};
```

- [ ] **Step 4: Create `playwright.config.ts`** (delete `playwright.config.js`)

```ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isCI = !!process.env.CI;

/** Storage state produced by tests/setup/auth.setup.ts and consumed by ui/e2e projects. */
export const STORAGE_STATE = '.auth/user.json';

const deviceFor = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
} as const;
type Browser = keyof typeof deviceFor;

const browsers = (process.env.BROWSERS ?? 'chromium')
  .split(',')
  .map((b) => b.trim())
  .filter((b): b is Browser => b in deviceFor);

const suffix = (browser: Browser) => (browser === 'chromium' ? '' : `-${browser}`);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : undefined,
  reporter: isCI ? [['blob'], ['github'], ['list']] : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testDir: './tests/setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_BASE_URL },
    },
    ...browsers.flatMap((browser) => [
      {
        name: `ui${suffix(browser)}`,
        testDir: './tests/ui',
        use: { ...devices[deviceFor[browser]], storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
      {
        name: `e2e${suffix(browser)}`,
        testDir: './tests/e2e',
        use: { ...devices[deviceFor[browser]], storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
    ]),
  ],
});
```

- [ ] **Step 5: Create `.env.example`**

```
# ---- UI under test (example: saucedemo) ----
BASE_URL=https://www.saucedemo.com
E2E_USERNAME=standard_user
E2E_PASSWORD=secret_sauce

# ---- API under test (example: dummyjson) ----
API_BASE_URL=https://dummyjson.com
API_USERNAME=emilys
API_PASSWORD=emilyspass

# ---- Optional ----
# BROWSERS=chromium,firefox,webkit   # extra browser projects: ui-firefox, e2e-webkit, ...
# WORKERS=1                          # force serial execution locally
```

- [ ] **Step 6: Update local `.env`** (gitignored): add `BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`, `API_BASE_URL`, `API_USERNAME`, `API_PASSWORD` next to the existing `email`/`password` values (copy the values). Do not commit.

- [ ] **Step 7: Install and verify**

Run: `rm playwright.config.js data/test.json && corepack pnpm install && corepack pnpm exec playwright install chromium --with-deps && corepack pnpm exec playwright test --list`
Expected: install succeeds; `--list` prints projects `setup`, `api`, `ui`, `e2e` (test count may be 0 or the old files fail to compile — that is fixed in Tasks 2–4).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json playwright.config.ts .env.example utils/env.ts
git rm -q playwright.config.js data/test.json
git commit -m "chore: TypeScript toolchain, typed config with setup/ui/api/e2e projects"
```

---

### Task 2: Page objects and E2E flow in TypeScript

**Files:**
- Create: `pages/login.ts`, `pages/inventory.ts`, `pages/cart.ts`, `pages/checkout-step-one.ts`, `pages/checkout-step-two.ts`, `pages/checkout-complete.ts`, `utils/e2e.ts`
- Delete: the `.js` versions of the same files

**Interfaces:**
- Produces classes `LoginPage`, `InventoryPage`, `CartPage`, `CheckoutStepOnePage`, `CheckoutStepTwoPage`, `CheckoutCompletePage`, `E2E`; each page has `url`, `load()`, `waitLoad()`; `E2E.login()`.

- [ ] **Step 1: Verify the real `data-test` attributes with playwright-cli before writing locators**

Run (needs a `.env` with saucedemo values):
```bash
corepack pnpm exec playwright-cli open https://www.saucedemo.com
corepack pnpm exec playwright-cli snapshot
```
Log in through the CLI (`fill` username/password refs, `click` Login), then `snapshot` on `/inventory.html` and `/cart.html` after adding one item, and run `playwright-cli eval "el => el.getAttribute('data-test')" <ref>` on: page title, an item name, an item price, a cart row, the sort dropdown, the cart badge. Confirm they are `title`, `inventory-item-name`, `inventory-item-price`, `inventory-item`, `product-sort-container`, `shopping-cart-badge`. If any differ, use the observed value in Step 2. Finish with `playwright-cli close`.

- [ ] **Step 2: Write `pages/login.ts`**

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly url = '/';
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' }).describe('Username input');
    this.passwordInput = page.getByRole('textbox', { name: 'Password' }).describe('Password input');
    this.loginButton = page.getByRole('button', { name: 'Login' }).describe('Login button');
    this.errorMessage = page.locator('[data-test="error"]').describe('Login error message');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Login page to load', async () => {
      await this.loginButton.waitFor({ state: 'visible' });
    });
  }

  async submitLoginForm(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

- [ ] **Step 3: Write `pages/inventory.ts`**

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly url = '/inventory.html';
  readonly title: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly addToCartButtons: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly sortDropdown: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.items = page.locator('[data-test="inventory-item"]').describe('Inventory item cards');
    this.itemNames = page.locator('[data-test="inventory-item-name"]').describe('Inventory item names');
    this.addToCartButtons = page.locator('[data-test^="add-to-cart"]').describe('Add to cart buttons');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]').describe('Shopping cart link');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]').describe('Cart item count badge');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]').describe('Product sort dropdown');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Inventory page to load', async () => {
      await this.title.waitFor({ state: 'visible' });
    });
  }

  /** Adds the first `count` items to the cart and returns their names. */
  async addItemsToCart(count: number): Promise<string[]> {
    const names = (await this.itemNames.allTextContents()).slice(0, count);
    for (let i = 0; i < count; i++) {
      await this.addToCartButtons.first().click();
    }
    return names;
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
```

- [ ] **Step 4: Write `pages/cart.ts`**

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly url = '/cart.html';
  readonly title: Locator;
  readonly cartItems: Locator;
  readonly cartItemNames: Locator;
  readonly cartItemPrices: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.cartItems = page.locator('[data-test="inventory-item"]').describe('Cart item rows');
    this.cartItemNames = page.locator('[data-test="inventory-item-name"]').describe('Cart item names');
    this.cartItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Cart item prices');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' }).describe('Checkout button');
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' }).describe('Continue shopping button');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Cart page to load', async () => {
      await this.checkoutButton.waitFor({ state: 'visible' });
    });
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
```

- [ ] **Step 5: Write `pages/checkout-step-one.ts`**

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class CheckoutStepOnePage {
  readonly page: Page;
  readonly url = '/checkout-step-one.html';
  readonly title: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' }).describe('First name input');
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' }).describe('Last name input');
    this.postalCodeInput = page.getByRole('textbox', { name: 'Zip/Postal Code' }).describe('Postal code input');
    this.continueButton = page.getByRole('button', { name: 'Continue' }).describe('Continue button');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel button');
    this.errorMessage = page.locator('[data-test="error"]').describe('Checkout error message');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Checkout Step One page to load', async () => {
      await this.firstNameInput.waitFor({ state: 'visible' });
    });
  }

  async fillCheckoutForm(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview(): Promise<void> {
    await this.continueButton.click();
  }
}
```

- [ ] **Step 6: Write `pages/checkout-step-two.ts`**

```ts
import { test, type Locator, type Page } from '@playwright/test';

export class CheckoutStepTwoPage {
  readonly page: Page;
  readonly url = '/checkout-step-two.html';
  readonly title: Locator;
  readonly orderItems: Locator;
  readonly orderItemNames: Locator;
  readonly orderItemPrices: Locator;
  readonly orderItemQuantities: Locator;
  readonly subtotalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]').describe('Page title');
    this.orderItems = page.locator('[data-test="inventory-item"]').describe('Order item rows');
    this.orderItemNames = page.locator('[data-test="inventory-item-name"]').describe('Order item names');
    this.orderItemPrices = page.locator('[data-test="inventory-item-price"]').describe('Order item prices');
    this.orderItemQuantities = page.locator('[data-test="item-quantity"]').describe('Order item quantities');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]').describe('Item total label');
    this.finishButton = page.getByRole('button', { name: 'Finish' }).describe('Finish button');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' }).describe('Cancel button');
  }

  async load(): Promise<void> {
    await this.page.goto(this.url);
  }

  async waitLoad(): Promise<void> {
    await test.step('Wait for Checkout Step Two page to load', async () => {
      await this.finishButton.waitFor({ state: 'visible' });
    });
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
  }
}
```

- [ ] **Step 7: Write `pages/checkout-complete.ts`** (port `pages/checkout-complete.js`; keep its locators, e.g. `successHeading = page.locator('[data-test="complete-header"]').describe('Order complete heading')`, `backHomeButton = page.getByRole('button', { name: 'Back Home' }).describe('Back home button')`, `load()`, `waitLoad()` waiting for `successHeading`, action `backToProducts()`).

- [ ] **Step 8: Write `utils/e2e.ts`**

```ts
import { expect, test, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login';
import { InventoryPage } from '../pages/inventory';
import { CartPage } from '../pages/cart';
import { CheckoutStepOnePage } from '../pages/checkout-step-one';
import { CheckoutStepTwoPage } from '../pages/checkout-step-two';
import { CheckoutCompletePage } from '../pages/checkout-complete';
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
```

- [ ] **Step 9: Delete old JS files and type-check**

Run: `git rm -q pages/*.js utils/e2e.js && corepack pnpm exec tsc --noEmit`
Expected: errors only from `fixtures/*.js` / `tests/**/*.js` (not yet migrated); zero errors under `pages/` and `utils/`.

- [ ] **Step 10: Commit**

```bash
git add pages utils
git commit -m "refactor: page objects and E2E flow in TypeScript with data-test locators"
```

---

### Task 3: API layer (clients + zod schemas)

**Files:**
- Create: `api/clients/auth.client.ts`, `api/clients/products.client.ts`, `api/clients/carts.client.ts`, `api/schemas/auth.schema.ts`, `api/schemas/products.schema.ts`, `api/schemas/carts.schema.ts`

**Interfaces:**
- Produces: `AuthClient.login(username, password)`, `AuthClient.me()`; `ProductsClient.list({limit, skip, select})`, `ProductsClient.getById(id)`, `ProductsClient.search(query)`; `CartsClient.add(userId, products)`, `CartsClient.getById(id)`; all return `Promise<APIResponse>`. Schemas: `LoginResponseSchema`, `UserSchema`, `ProductSchema`, `ProductListSchema`, `CartSchema`, plus `CartProductInput` type.

- [ ] **Step 1: Write `api/clients/auth.client.ts`**

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';

/** Auth endpoints. Returns raw responses; assertions belong to specs. */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<APIResponse> {
    return this.request.post('/auth/login', { data: { username, password } });
  }

  /** Requires an `Authorization: Bearer <token>` header on the request context. */
  async me(): Promise<APIResponse> {
    return this.request.get('/auth/me');
  }
}
```

- [ ] **Step 2: Write `api/clients/products.client.ts`**

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface ProductListParams {
  limit?: number;
  skip?: number;
  /** Comma-separated field names, e.g. "id,title,price". */
  select?: string;
}

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async list(params: ProductListParams = {}): Promise<APIResponse> {
    return this.request.get('/products', { params: { ...params } });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  async search(query: string): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q: query } });
  }
}
```

- [ ] **Step 3: Write `api/clients/carts.client.ts`**

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';

export interface CartProductInput {
  id: number;
  quantity: number;
}

export class CartsClient {
  constructor(private readonly request: APIRequestContext) {}

  async add(userId: number, products: CartProductInput[]): Promise<APIResponse> {
    return this.request.post('/carts/add', { data: { userId, products } });
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/carts/${id}`);
  }
}
```

- [ ] **Step 4: Write `api/schemas/auth.schema.ts`**

```ts
import { z } from 'zod';

export const LoginResponseSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.string(),
  image: z.url(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const ErrorResponseSchema = z.object({ message: z.string() });
```

- [ ] **Step 5: Write `api/schemas/products.schema.ts`**

```ts
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  price: z.number().nonnegative(),
  discountPercentage: z.number(),
  rating: z.number().min(0).max(5),
  stock: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  brand: z.string().optional(),
  sku: z.string(),
  thumbnail: z.url(),
  images: z.array(z.url()),
});
export type Product = z.infer<typeof ProductSchema>;

/** Summary returned by list/search when `select` narrows the fields. */
export const ProductSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.string(),
});

export const ProductListSchema = z.object({
  products: z.array(ProductSummarySchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
});
export type ProductList = z.infer<typeof ProductListSchema>;
```

- [ ] **Step 6: Write `api/schemas/carts.schema.ts`**

```ts
import { z } from 'zod';

export const CartProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  total: z.number().nonnegative(),
  discountPercentage: z.number(),
  thumbnail: z.url(),
});

export const CartSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  products: z.array(CartProductSchema),
  total: z.number().nonnegative(),
  discountedTotal: z.number().nonnegative(),
  totalProducts: z.number().int().nonnegative(),
  totalQuantity: z.number().int().nonnegative(),
});
export type Cart = z.infer<typeof CartSchema>;
```

- [ ] **Step 7: Type-check and commit**

Run: `corepack pnpm exec tsc --noEmit 2>&1 | grep -E '^(api|utils|pages)/' ; echo "exit ${PIPESTATUS[0]}"`
Expected: no lines printed for `api/`.

```bash
git add api
git commit -m "feat: API client layer with zod schemas (dummyjson reference)"
```

---

### Task 4: Typed fixtures, custom matcher, data files

**Files:**
- Create: `fixtures/page.fixtures.ts`, `fixtures/e2e.fixtures.ts`, `fixtures/api.fixtures.ts`, `fixtures/index.fixtures.ts`, `data/login.json`, `data/checkout.json`, `data/api.json`
- Delete: `fixtures/*.js`, `data/checkout-data.json`

**Interfaces:**
- Produces: `test` (merged fixtures: `loginPage`, `inventoryPage`, `cartPage`, `checkoutStepOnePage`, `checkoutStepTwoPage`, `checkoutCompletePage`, `e2e`, `api`, `authToken`, `authedApi`) and `expect` with `toMatchSchema(schema)` from `fixtures/index.fixtures`.

- [ ] **Step 1: Write `fixtures/page.fixtures.ts`**

```ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login';
import { InventoryPage } from '../pages/inventory';
import { CartPage } from '../pages/cart';
import { CheckoutStepOnePage } from '../pages/checkout-step-one';
import { CheckoutStepTwoPage } from '../pages/checkout-step-two';
import { CheckoutCompletePage } from '../pages/checkout-complete';

export interface PageFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutStepOnePage: CheckoutStepOnePage;
  checkoutStepTwoPage: CheckoutStepTwoPage;
  checkoutCompletePage: CheckoutCompletePage;
}

export const pageFixture = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => { await use(new LoginPage(page)); },
  inventoryPage: async ({ page }, use) => { await use(new InventoryPage(page)); },
  cartPage: async ({ page }, use) => { await use(new CartPage(page)); },
  checkoutStepOnePage: async ({ page }, use) => { await use(new CheckoutStepOnePage(page)); },
  checkoutStepTwoPage: async ({ page }, use) => { await use(new CheckoutStepTwoPage(page)); },
  checkoutCompletePage: async ({ page }, use) => { await use(new CheckoutCompletePage(page)); },
});
```

- [ ] **Step 2: Write `fixtures/e2e.fixtures.ts`**

```ts
import { test as base } from '@playwright/test';
import { E2E } from '../utils/e2e';

export interface E2EFixtures {
  e2e: E2E;
}

export const e2eFixture = base.extend<E2EFixtures>({
  e2e: async ({ page }, use) => { await use(new E2E(page)); },
});
```

- [ ] **Step 3: Write `fixtures/api.fixtures.ts`**

```ts
import { test as base, request, type APIRequestContext } from '@playwright/test';
import { AuthClient } from '../api/clients/auth.client';
import { ProductsClient } from '../api/clients/products.client';
import { CartsClient } from '../api/clients/carts.client';
import { env } from '../utils/env';

export interface ApiClients {
  auth: AuthClient;
  products: ProductsClient;
  carts: CartsClient;
}

export interface ApiFixtures {
  /** Anonymous clients bound to the project's baseURL. */
  api: ApiClients;
  /** Clients whose context sends `Authorization: Bearer <authToken>`. */
  authedApi: ApiClients;
}

export interface ApiWorkerFixtures {
  /** Logged in once per worker; reused by every test in that worker. */
  authToken: string;
}

const createClients = (context: APIRequestContext): ApiClients => ({
  auth: new AuthClient(context),
  products: new ProductsClient(context),
  carts: new CartsClient(context),
});

export const apiFixture = base.extend<ApiFixtures, ApiWorkerFixtures>({
  api: async ({ request }, use) => {
    await use(createClients(request));
  },

  authToken: [
    async ({}, use) => {
      const context = await request.newContext({ baseURL: env.API_BASE_URL });
      const response = await new AuthClient(context).login(env.API_USERNAME, env.API_PASSWORD);
      if (!response.ok()) {
        throw new Error(`API login failed: ${response.status()} ${await response.text()}`);
      }
      const { accessToken } = (await response.json()) as { accessToken: string };
      await context.dispose();
      await use(accessToken);
    },
    { scope: 'worker' },
  ],

  authedApi: async ({ authToken, baseURL }, use) => {
    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${authToken}` },
    });
    await use(createClients(context));
    await context.dispose();
  },
});
```

- [ ] **Step 4: Write `fixtures/index.fixtures.ts`**

```ts
import { expect as baseExpect, mergeTests } from '@playwright/test';
import { z } from 'zod';
import { pageFixture } from './page.fixtures';
import { e2eFixture } from './e2e.fixtures';
import { apiFixture } from './api.fixtures';

/** Single import point for every spec: `import { test, expect } from '<relative>/fixtures/index.fixtures'`. */
export const test = mergeTests(pageFixture, e2eFixture, apiFixture);

export const expect = baseExpect.extend({
  /** Asserts a payload matches a zod schema; prints a readable diff on failure. */
  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);
    return {
      pass: result.success,
      message: () =>
        result.success
          ? 'Expected payload NOT to match schema'
          : `Payload does not match schema:\n${z.prettifyError(result.error)}`,
    };
  },
});
```

- [ ] **Step 5: Create data files** (delete `data/checkout-data.json`)

`data/login.json`
```json
{
  "lockedOutUser": { "username": "locked_out_user" },
  "emptyCredentials": { "username": "", "password": "" },
  "errors": {
    "lockedOut": "Epic sadface: Sorry, this user has been locked out.",
    "usernameRequired": "Epic sadface: Username is required"
  }
}
```

`data/checkout.json`
```json
{
  "userInfo": { "firstName": "Test", "lastName": "User", "postalCode": "12345" },
  "itemsToBuy": 2,
  "successMessage": "Thank you for your order!"
}
```

`data/api.json`
```json
{
  "invalidCredentials": { "username": "not-a-user", "password": "not-a-password" },
  "knownProduct": { "id": 1, "title": "Essence Mascara Lash Princess", "category": "beauty" },
  "missingProductId": 0,
  "searchQuery": "phone",
  "cart": { "userId": 1, "products": [{ "id": 1, "quantity": 2 }, { "id": 2, "quantity": 1 }] }
}
```

- [ ] **Step 6: Delete old fixtures, type-check, commit**

Run: `git rm -q fixtures/*.js data/checkout-data.json && corepack pnpm exec tsc --noEmit 2>&1 | grep -vE '^tests/' ; true`
Expected: no errors outside `tests/`.

```bash
git add fixtures data
git commit -m "feat: typed fixtures (page, e2e, api), toMatchSchema matcher, data files"
```

---

### Task 5: Specs — setup, ui, api, e2e

**Files:**
- Create: `tests/setup/auth.setup.ts`, `tests/ui/login.spec.ts`, `tests/api/auth.spec.ts`, `tests/api/products.spec.ts`, `tests/api/carts.spec.ts`, `tests/e2e/checkout.spec.ts`
- Delete: `tests/auth.setup.js`, `tests/e2e/saucedemo-critical-path.spec.js`

- [ ] **Step 1: Write `tests/setup/auth.setup.ts`**

```ts
import { test as setup } from '../../fixtures/index.fixtures';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate and save storage state', async ({ e2e, page }) => {
  await e2e.login();
  await page.context().storageState({ path: STORAGE_STATE });
});
```

- [ ] **Step 2: Write `tests/ui/login.spec.ts`**

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { env } from '../../utils/env';
import data from '../../data/login.json';

// Login tests must start logged out: override the project's storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', { tag: ['@ui'] }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await test.step('Load login page', async () => {
      await loginPage.load();
      await loginPage.waitLoad();
    });
  });

  test('should redirect to inventory with valid credentials', { tag: ['@smoke'] }, async ({ loginPage, inventoryPage }) => {
    await loginPage.submitLoginForm(env.E2E_USERNAME, env.E2E_PASSWORD);
    await expect(loginPage.page).toHaveURL(/inventory\.html$/);
    await expect(inventoryPage.title).toHaveText('Products');
  });

  test('should show an error for a locked out user', { tag: ['@regression'] }, async ({ loginPage }) => {
    await loginPage.submitLoginForm(data.lockedOutUser.username, env.E2E_PASSWORD);
    await expect(loginPage.errorMessage).toHaveText(data.errors.lockedOut);
  });

  test('should require a username', { tag: ['@regression'] }, async ({ loginPage }) => {
    await loginPage.submitLoginForm(data.emptyCredentials.username, data.emptyCredentials.password);
    await expect(loginPage.errorMessage).toHaveText(data.errors.usernameRequired);
  });
});
```

- [ ] **Step 3: Write `tests/api/auth.spec.ts`**

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { env } from '../../utils/env';
import { ErrorResponseSchema, LoginResponseSchema, UserSchema } from '../../api/schemas/auth.schema';
import data from '../../data/api.json';

test.describe('Auth API', { tag: ['@api'] }, () => {
  test('should return tokens and profile for valid credentials', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.auth.login(env.API_USERNAME, env.API_PASSWORD);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(LoginResponseSchema);
    expect(LoginResponseSchema.parse(body).username).toBe(env.API_USERNAME);
  });

  test('should reject invalid credentials', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.auth.login(data.invalidCredentials.username, data.invalidCredentials.password);
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchSchema(ErrorResponseSchema);
  });

  test('should return the current user for a bearer token', { tag: ['@smoke'] }, async ({ authedApi }) => {
    const response = await authedApi.auth.me();
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(UserSchema);
    expect(UserSchema.parse(body).username).toBe(env.API_USERNAME);
  });
});
```

- [ ] **Step 4: Write `tests/api/products.spec.ts`**

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { ErrorResponseSchema, } from '../../api/schemas/auth.schema';
import { ProductListSchema, ProductSchema } from '../../api/schemas/products.schema';
import data from '../../data/api.json';

test.describe('Products API', { tag: ['@api'] }, () => {
  test('should list products with pagination', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.list({ limit: 5, skip: 10, select: 'id,title,price,category' });
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductListSchema);
    const list = ProductListSchema.parse(body);
    expect(list.products).toHaveLength(5);
    expect(list.skip).toBe(10);
    expect(list.total).toBeGreaterThan(5);
  });

  test('should return a product by id', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.products.getById(data.knownProduct.id);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductSchema);
    const product = ProductSchema.parse(body);
    expect(product.id).toBe(data.knownProduct.id);
    expect(product.category).toBe(data.knownProduct.category);
  });

  test('should return 404 for an unknown product', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.getById(data.missingProductId);
    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchSchema(ErrorResponseSchema);
  });

  test('should search products by keyword', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.products.search(data.searchQuery);
    expect(response.status()).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(ProductListSchema);
    expect(ProductListSchema.parse(body).total).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Write `tests/api/carts.spec.ts`**

```ts
import { test, expect } from '../../fixtures/index.fixtures';
import { CartSchema } from '../../api/schemas/carts.schema';
import data from '../../data/api.json';

test.describe('Carts API', { tag: ['@api'] }, () => {
  test('should create a cart and compute totals', { tag: ['@smoke'] }, async ({ api }) => {
    const response = await api.carts.add(data.cart.userId, data.cart.products);
    expect(response.status()).toBe(201);
    const body: unknown = await response.json();
    expect(body).toMatchSchema(CartSchema);

    const cart = CartSchema.parse(body);
    const expectedQuantity = data.cart.products.reduce((sum, p) => sum + p.quantity, 0);
    expect(cart.userId).toBe(data.cart.userId);
    expect(cart.totalProducts).toBe(data.cart.products.length);
    expect(cart.totalQuantity).toBe(expectedQuantity);
    expect(cart.discountedTotal).toBeLessThanOrEqual(cart.total);
  });

  test('should return an existing cart', { tag: ['@regression'] }, async ({ api }) => {
    const response = await api.carts.getById(1);
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchSchema(CartSchema);
  });
});
```
If the live API returns 200 instead of 201 for `POST /carts/add`, record the observed value in the spec and in `data/api.json` as `cart.expectedStatus` rather than weakening to `ok()`.

- [ ] **Step 6: Write `tests/e2e/checkout.spec.ts`** (port of `saucedemo-critical-path.spec.js`; storage state already logged in)

```ts
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
```

- [ ] **Step 7: Remove old specs and run everything**

Run: `git rm -q tests/auth.setup.js tests/e2e/saucedemo-critical-path.spec.js && corepack pnpm exec tsc --noEmit && corepack pnpm exec playwright test --project=api && corepack pnpm exec playwright test --project=ui --project=e2e`
Expected: typecheck clean; api: 9 passed; ui+e2e: setup 1 + ui 3 + e2e 1 passed. Fix any locator mismatch by re-checking with `playwright-cli snapshot` (never by loosening assertions).

- [ ] **Step 8: Commit**

```bash
git add tests
git commit -m "test: setup/ui/api/e2e specs with tags against the reference targets"
```

---

### Task 6: ESLint with architecture rules

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Write `eslint.config.mjs`**

```js
// Architecture rules are enforced here so every tool (Claude Code, Copilot, Cursor, CI) gets the same gate.
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const SPEC_FILES = ['tests/**/*.ts'];
const ACTION_LAYERS = ['pages/**/*.ts', 'api/**/*.ts'];

export default defineConfig([
  {
    ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**', '.playwright-cli/**', '.auth/**'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },

  // ---- Specs: Playwright rules + import/goto/credential gates ----
  { files: SPEC_FILES, ...playwright.configs['flat/recommended'] },
  {
    files: SPEC_FILES,
    rules: {
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expect'] }],
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          message: 'Spec files import { test, expect } from the fixtures index, never from @playwright/test.',
          allowTypeImports: true,
        }],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.property.name='goto']",
          message: 'Do not call page.goto() in specs. Use <pageName>.load().',
        },
        {
          selector: "CallExpression[callee.property.name=/^(login|submitLoginForm)$/] > Literal[value=/.+/]",
          message: 'Never hard-code credentials. Read them from utils/env or a data file.',
        },
      ],
    },
  },
  { files: ['tests/setup/**/*.ts'], rules: { 'playwright/expect-expect': 'off' } },

  // ---- Action layers: no assertions ----
  {
    files: ACTION_LAYERS,
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        paths: [{
          name: '@playwright/test',
          importNames: ['expect'],
          message: 'Assertions live in specs. Page objects and API clients only interact.',
        }],
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.name='expect'], CallExpression[callee.object.name='expect']",
        message: 'No assertions in page objects or API clients. Use waitFor() guards inside waitLoad() only.',
      }],
    },
  },
]);
```

- [ ] **Step 2: Run lint and fix any real findings**

Run: `corepack pnpm lint`
Expected: exit 0. Typical fixes: add `void`/`await` for floating promises, remove unused imports.

- [ ] **Step 3: Negative checks (temporary edits, then revert)**

1. Add `await expect(this.title).toBeVisible();` inside `InventoryPage.waitLoad()` → `corepack pnpm exec eslint pages` must fail with the "No assertions in page objects" message.
2. Add `import { test } from '@playwright/test';` to `tests/ui/login.spec.ts` → eslint must fail with the fixtures-index message.
3. Add `await loginPage.page.goto('/');` in a spec → must fail with the `page.goto()` message.
Revert with `git checkout -- pages tests`.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: ESLint with Playwright rules and architecture gates"
```

---

### Task 7: CI — composite setup action + serial / parallel / sharded / lint workflows

**Files:**
- Create: `.github/actions/setup-playwright/action.yml`, `.github/workflows/lint.yml`, `.github/workflows/playwright-serial.yml`, `.github/workflows/playwright-parallel.yml`, `.github/workflows/playwright-sharded.yml`
- Delete: `.github/workflows/playwright.yml`

- [ ] **Step 1: Write `.github/actions/setup-playwright/action.yml`**

```yaml
name: Setup Playwright
description: Install pnpm, Node, dependencies and cached Playwright browsers
inputs:
  browsers:
    description: Space-separated browsers to install
    default: chromium
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: lts/*
        cache: pnpm
    - name: Install dependencies
      shell: bash
      run: pnpm install --frozen-lockfile
    - name: Resolve Playwright version
      id: pw
      shell: bash
      run: echo "version=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"
    - name: Cache Playwright browsers
      id: cache
      uses: actions/cache@v4
      with:
        path: ~/.cache/ms-playwright
        key: ${{ runner.os }}-playwright-${{ steps.pw.outputs.version }}-${{ inputs.browsers }}
    - name: Install browsers
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      run: pnpm exec playwright install ${{ inputs.browsers }} --with-deps
    - name: Install system dependencies only
      if: steps.cache.outputs.cache-hit == 'true'
      shell: bash
      run: pnpm exec playwright install-deps ${{ inputs.browsers }}
```

- [ ] **Step 2: Write `.github/workflows/lint.yml`**

```yaml
name: Lint
on:
  push:
    branches: [main, master]
  pull_request:
jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
```

- [ ] **Step 3: Write `.github/workflows/playwright-parallel.yml`** (default strategy: PR = smoke, push = full)

```yaml
name: Playwright (parallel)
on:
  push:
    branches: [main, master]
  pull_request:
  workflow_dispatch:
env:
  CI: true
  BASE_URL: ${{ vars.BASE_URL || 'https://www.saucedemo.com' }}
  API_BASE_URL: ${{ vars.API_BASE_URL || 'https://dummyjson.com' }}
  E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
  E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
  API_USERNAME: ${{ secrets.API_USERNAME }}
  API_PASSWORD: ${{ secrets.API_PASSWORD }}
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-playwright
      - name: Run tests (smoke on PR, full suite otherwise)
        run: pnpm exec playwright test ${{ github.event_name == 'pull_request' && '--grep @smoke' || '' }}
      - name: Merge blob report to HTML
        if: ${{ !cancelled() }}
        run: pnpm exec playwright merge-reports --reporter html ./blob-report
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-parallel
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 4: Write `.github/workflows/playwright-serial.yml`** (one worker; for rate-limited or stateful targets)

```yaml
name: Playwright (serial)
on:
  workflow_dispatch:
env:
  CI: true
  BASE_URL: ${{ vars.BASE_URL || 'https://www.saucedemo.com' }}
  API_BASE_URL: ${{ vars.API_BASE_URL || 'https://dummyjson.com' }}
  E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
  E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
  API_USERNAME: ${{ secrets.API_USERNAME }}
  API_PASSWORD: ${{ secrets.API_PASSWORD }}
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-playwright
      - name: Run tests with a single worker
        run: pnpm exec playwright test --workers=1
      - name: Merge blob report to HTML
        if: ${{ !cancelled() }}
        run: pnpm exec playwright merge-reports --reporter html ./blob-report
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report-serial
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 5: Write `.github/workflows/playwright-sharded.yml`**

```yaml
name: Playwright (sharded)
on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'
env:
  CI: true
  BASE_URL: ${{ vars.BASE_URL || 'https://www.saucedemo.com' }}
  API_BASE_URL: ${{ vars.API_BASE_URL || 'https://dummyjson.com' }}
  E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
  E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
  API_USERNAME: ${{ secrets.API_USERNAME }}
  API_PASSWORD: ${{ secrets.API_PASSWORD }}
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-playwright
      - name: Run shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        run: pnpm exec playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true
      - name: Merge shard reports
        run: pnpm exec playwright merge-reports --reporter html ./all-blob-reports
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-report-sharded
          path: playwright-report/
          retention-days: 14
```

- [ ] **Step 6: Validate YAML locally and commit**

Run: `git rm -q .github/workflows/playwright.yml && for f in .github/workflows/*.yml .github/actions/*/action.yml; do node -e "require('fs').readFileSync('$f','utf8')" && python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" && echo "ok $f"; done`
Expected: `ok` for every file (if `yaml` module is missing, `pip3 install pyyaml` or skip to the push check in Phase 4).

```bash
git add .github
git commit -m "ci: composite setup action; serial, parallel and sharded workflows; lint job"
```

---

### Task 8: README refresh and `.gitignore`

**Files:**
- Modify: `readme.md` (replace the top half; keep the "Manual QA Bug Report" section verbatim), `.gitignore`

- [ ] **Step 1: Rewrite the top of `readme.md`** with: one-paragraph purpose ("reference implementation of the Playwright standards kit; UI target and API target are examples, configured through `.env`"), Prerequisites (Node ≥ 20.11, pnpm via corepack, `.env` from `.env.example`), Install (`corepack pnpm install`, `corepack pnpm exec playwright install chromium --with-deps`), Run (table of `pnpm test:*` scripts, `BROWSERS=firefox,webkit pnpm test`, `pnpm test:debug` + `playwright-cli attach`), Reports (`pnpm report`), CI (three workflows and when each is used), and a pointer: "Architecture rules live in `AGENTS.md`; agent skills in `.claude/skills/`" (those files arrive in Phase 2, so phrase it as "see AGENTS.md" once it exists — add the sentence in Phase 2 instead if preferred). Keep the bug report section.

- [ ] **Step 2: `.gitignore`** — confirm `.env`, `.auth/`, `blob-report/`, `.playwright-cli/` are present (they are); add `*.tsbuildinfo`.

- [ ] **Step 3: Full verification**

Run: `corepack pnpm lint && corepack pnpm exec playwright test`
Expected: lint exit 0; all projects pass (setup 1, ui 3, api 9, e2e 1).

- [ ] **Step 4: Commit**

```bash
git add readme.md .gitignore
git commit -m "docs: README for the reference implementation"
```
