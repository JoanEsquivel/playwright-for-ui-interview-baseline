---
name: scan-to-tests
description: >
  Scans a web page with playwright-cli, discovers its interactive elements,
  and generates the page object, fixture entry, and spec file following the
  playwright-architecture rules. Invoke when the user provides a URL or path
  and asks to generate tests for it.
---

# scan-to-tests

Orchestrates two skills in sequence:
1. **playwright-cli** — live browser scan to discover elements
2. **playwright-architecture** — code generation following project rules

---

## Input

The user provides one of:
- Full URL: `https://www.saucedemo.com/inventory.html`
- Path relative to the baseURL in `playwright.config.js`: `/inventory.html`

If the input is a path, prepend `https://www.saucedemo.com` to form the full URL.

---

## Project file map

```
playwright-for-ui/
├── pages/                   ← Page Object classes, one per page
├── utils/e2e.js             ← Multi-step E2E class (aggregates page objects)
├── fixtures/
│   ├── page.fixtures.js     ← Wires each PageObject via base.extend()
│   ├── e2e.fixtures.js      ← Wires the E2E class
│   └── index.fixtures.js    ← mergeTests() — ONLY import source in specs
├── tests/
│   ├── *.spec.js            ← Page Object style (single-page tests)
│   └── e2e/*.spec.js        ← E2E style (multi-page flows)
└── data/test.json           ← Shared test data (no credentials)
```

---

## PHASE 1 — Page scan

### Step 1.1 — Open browser and navigate

Use the `playwright-cli` skill to navigate to the URL and get a snapshot of the elements:

```
Invoke playwright-cli:
  - Navigate to <FULL_URL>
  - Take a page snapshot
  - Evaluate document.title and the h1 content
  - Take a screenshot for visual reference
```

The snapshot returns lines in this format:
```
e1  [textbox "Username"]
e2  [textbox "Password"]
e3  [button "Login"]
e4  [heading "Swag Labs" level=1]
e5  [link "Forgot password?"]
```

### Step 1.2 — Detect required authentication

Visit the URL directly. If the resulting URL is `/` or `/#/` and the snapshot contains a `[textbox "Username"]` instead of the expected content → `REQUIRES_AUTH = true`.

If the page loads normally → `REQUIRES_AUTH = false`.

### Step 1.3 — Build element inventory

For each element in the snapshot, record:

| Field | How to obtain |
|-------|--------------|
| Role | The label between brackets: `textbox`, `button`, `link`, `heading`, `checkbox`, `combobox`, `img` |
| Accessible name | The string between quotes: `"Add to cart"`, `"Username"` |
| data-testid | The `data-testid="..."` attribute if present |

**Categories to capture (testable elements):**
- Inputs: `textbox`, `searchbox`, `spinbutton`, `combobox`, `checkbox`, `radio`, `switch`
- Actions: `button`, `link`, `menuitem`, `tab`
- Content landmarks: `heading`, `img` (with alt text), `status`, `alert`

Ignore purely structural elements (`generic`, `none`, `presentation`) unless they have `data-testid`.

### Step 1.4 — Understand the page's purpose

Answer these questions before continuing:
1. What is the user's primary action on this page? (submit form, browsing, checkout step, etc.)
2. What are the 2–5 most important flows? (happy path, error states, edge cases)
3. Is it a standalone screen or a step in a multi-page flow?

### Step 1.5 — Check if a page object already exists

Before generating code, check if a page object already exists for this route:
- Read the `pages/` directory
- Read `fixtures/page.fixtures.js` to see what is wired

If it already exists, go directly to Step 2.3 — only add missing locators and action methods.

### Step 1.6 — Close browser

Close the browser via playwright-cli.

---

## PHASE 2 — Code generation

Use the inventory from Phase 1. Follow all the rules in this section to the letter.

---

### Step 2.1 — Derive names from the URL

From the URL, derive:
- `<pagename>`: lowercase, hyphen-separated. E.g.: `inventory`, `cart`, `product-detail`, `checkout-step-one`
- `<PageName>`: PascalCase. E.g.: `Inventory`, `Cart`, `ProductDetail`, `CheckoutStepOne`
- `<pageName>`: camelCase (fixture name). E.g.: `inventoryPage`, `cartPage`, `productDetailPage`

---

### Step 2.2 — Create the Page Object

**File:** `pages/<pagename>.js`

```javascript
// @ts-check
import { test } from '@playwright/test';

export class <PageName>Page {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '<route>';            // e.g.: '/inventory.html'

        // --- Locators (one property per interactive element) ---
        this.heading = page.getByRole('heading', { name: 'Page Title' }).describe('Page Title heading');
        this.someButton = page.getByRole('button', { name: 'Label' }).describe('Label button');
        this.someInput = page.getByRole('textbox', { name: 'Label' }).describe('Label input field');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for <PageName> page to load', async () => {
            await this.<anchorElement>.waitFor({ state: 'visible' });
        });
    }

    // --- Action methods (interaction only, zero assertions) ---
    async <actionName>(<params>) {
        await this.<input>.fill(<param>);
        await this.<submitButton>.click();
    }
}
```

**Snapshot element to locator mapping table (priority top to bottom):**

| Snapshot element | Preferred locator | Fallback |
|-----------------|------------------|---------|
| `[textbox "Label"]` | `page.getByRole('textbox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[button "Label"]` | `page.getByRole('button', { name: 'Label' })` | `page.locator('[data-testid="..."]')` |
| `[link "Label"]` | `page.getByRole('link', { name: 'Label' })` | `page.getByText('Label')` |
| `[heading "Label" level=N]` | `page.getByRole('heading', { name: 'Label' })` | — |
| `[checkbox "Label"]` | `page.getByRole('checkbox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[combobox "Label"]` | `page.getByRole('combobox', { name: 'Label' })` | `page.getByLabel('Label')` |
| `[img "alt text"]` | `page.getByRole('img', { name: 'alt text' })` | `page.getByAltText('alt text')` |
| Has data-testid only | `page.locator('[data-testid="<id>"]')` | — |
| No role or testid | `page.getByText('visible text', { exact: true })` | — |

**`.describe()` rule:** Always chain `.describe('<Accessible Name> <role>')`:
- `'Login button'`, `'Username input field'`, `'Products heading'`, `'Add to cart button'`

**`waitLoad()` rule:** Use the most reliable element to indicate the page has fully loaded — typically the main heading or primary CTA. Do not use spinners or generic containers.

**Action method rules:**
- One method per distinct user interaction
- Accept all variable data as parameters — never hard-code strings
- No `expect()`. No `page.waitForURL()`. No `waitFor()` unless it's an internal guard.
- Naming: verb + noun: `submitLoginForm`, `addItemToCart`, `applyFilter`

---

### Step 2.3 — Wire in `fixtures/page.fixtures.js`

Open `fixtures/page.fixtures.js` and add:

1. Import at the top of the file:
```javascript
import { <PageName>Page } from '../pages/<pagename>';
```

2. New entry inside `base.extend({...})`:
```javascript
<pageName>Page: async ({ page }, use) => {
    await use(new <PageName>Page(page));
},
```

`fixtures/index.fixtures.js` picks it up automatically via `mergeTests()` — do NOT touch that file.

---

### Step 2.4 — Decide test style

| Phase 1 condition | Style | Spec location |
|-------------------|-------|---------------|
| `REQUIRES_AUTH = false` AND standalone page | **Page Object style** | `tests/<pagename>.spec.js` |
| `REQUIRES_AUTH = true` AND step in multi-page flow | **E2E style** | `tests/e2e/<pagename>.spec.js` |
| `REQUIRES_AUTH = true` AND can be visited directly post-login | **Both** — Page Object spec for elements, E2E spec for full flow | Both locations |

---

### Step 2.5 — Update `utils/e2e.js` (E2E style only)

Only when `REQUIRES_AUTH = true` or the page is part of a multi-step flow:

1. Add the import:
```javascript
import { <PageName>Page } from '../pages/<pagename>';
```

2. Instantiate in the `E2E` constructor:
```javascript
this.<pageName>Page = new <PageName>Page(page);
```

3. If the page is a **step** in an existing flow, add a workflow method:
```javascript
async <flowName>() {
    await this.<pageName>Page.load();
    await this.<pageName>Page.waitLoad();
    await this.<pageName>Page.<action>(<params>);
    // Bridge guard — confirms page transition, NOT a test assertion:
    await expect(this.<nextPage>.someElement).toBeVisible();
}
```

The bridge guard with `expect()` is only allowed here when the method causes a page transition and the caller needs to know the transition occurred.

---

### Step 2.6 — Write the spec file

**Page Object style — `tests/<pagename>.spec.js`:**

```javascript
import { test, expect } from '../fixtures/index.fixtures'

test.describe('<PageName> Test Suite', () => {

    test.beforeEach(async ({ <pageName>Page }) => {
        await test.step('Load <pageName> page', async () => {
            await <pageName>Page.load()
            await <pageName>Page.waitLoad()
        })
    })

    test('should display page elements', async ({ <pageName>Page }) => {
        await expect(<pageName>Page.<heading>).toBeVisible()
    })

    test('should <description of primary action>', async ({ <pageName>Page }) => {
        await <pageName>Page.<actionMethod>(<testData>)
        await expect(<pageName>Page.<resultLocator>).<matcher>()
    })

})
```

**E2E style — `tests/e2e/<pagename>.spec.js`:**

```javascript
import { test, expect } from '../../fixtures/index.fixtures'

test.describe('<PageName> E2E Suite', () => {

    test.beforeEach(async ({ e2e }) => {
        await e2e.login()
    })

    test('should <description post-login>', async ({ <pageName>Page }) => {
        await <pageName>Page.load()
        await <pageName>Page.waitLoad()
        await expect(<pageName>Page.<locator>).<matcher>()
    })

})
```

**Import path rule — never confuse:**
- `tests/*.spec.js` → `'../fixtures/index.fixtures'`
- `tests/e2e/*.spec.js` → `'../../fixtures/index.fixtures'`

**Assertions guide — what to assert:**

| Element type | Recommended assertion |
|-------------|----------------------|
| Visible heading/label | `await expect(<pageName>Page.heading).toBeVisible()` |
| Input after fill | `await expect(<pageName>Page.input).toHaveValue('...')` |
| URL after navigation | `await expect(<pageName>Page.page).toHaveURL(/regex/)` |
| Error message | `await expect(<pageName>Page.errorMessage).toBeVisible()` |
| Button state | `await expect(<pageName>Page.button).toBeEnabled()` / `.toBeDisabled()` |
| Badge/counter | `await expect(<pageName>Page.badge).toHaveText('N')` |
| Item list | `await expect(<pageName>Page.itemList).toHaveCount(N)` |

**Test naming convention:** `'should <verb> <noun> <qualifier>'`
- `'should display all inventory items'`
- `'should show error for empty username'`
- `'should redirect to inventory after login'`

---

### Step 2.7 — Add test data if applicable

If tests need dynamic data (product names, quantities, expected error messages), add entries to `data/test.json`:

```json
{
  "<pagename>": {
    "<key>": "<value>"
  }
}
```

Import in the spec:
- From `tests/*.spec.js`: `import data from '../data/test.json'`
- From `tests/e2e/*.spec.js`: `import data from '../../data/test.json'`

**NEVER** put credentials in `test.json`. Credentials always come from `process.env.email` and `process.env.password`.

---

## PHASE 3 — Verification

### Step 3.1 — Run the generated tests

```bash
pnpm exec playwright test tests/<pagename>.spec.js --project=chromium
```

For E2E:
```bash
pnpm exec playwright test tests/e2e/<pagename>.spec.js --project=chromium
```

### Step 3.2 — Interpret failures

| Failure type | Probable cause | Fix |
|-------------|---------------|-----|
| Element not found | Locator doesn't match the real DOM | Re-scan with playwright-cli snapshot; update selector |
| `waitLoad()` timeout | Wrong anchor element | Change `waitLoad()` to a more reliable element |
| Import error | Incorrect path to fixtures | Check if spec is in `tests/` or `tests/e2e/` and adjust |
| Fixture not found | Page object not wired in `page.fixtures.js` | Add import and fixture entry |
| URL mismatch | Incorrect `this.url` in page object | Compare with the baseURL in `playwright.config.js` |

### Step 3.3 — Re-scan on selector failures

If tests fail and the cause is unclear, reopen the browser:

```
Invoke playwright-cli:
  - Navigate to <FULL_URL>
  - Take screenshot to see the visual state
  - Take a new snapshot to compare selectors
  - Close browser
```

---

## Architecture Rules (inline — do not consult the playwright-architecture skill)

These are non-negotiable rules. Violating any one produces incorrect output.

### Rule A: No assertions in page objects or E2E utils

Page objects interact. Tests assert.

```javascript
// BAD — assertion inside action method
async addToCart() {
    await this.addButton.click();
    await expect(this.cartBadge).toHaveText('1'); // VIOLATION
}

// GOOD
async addToCart() {
    await this.addButton.click();
}
```

The only `expect()` allowed in page objects or E2E utils is the navigation bridge guard inside `waitLoad()` or a multi-step workflow method, wrapped in `test.step()`.

### Rule B: Page objects import `test` from `@playwright/test`

Page objects use `test.step()` inside `waitLoad()`. This requires importing `test` from `@playwright/test` — not from fixtures. This is the only place where a direct Playwright import is correct.

```javascript
// CORRECT in pages/*.js
import { test } from '@playwright/test';
```

### Rule C: Specs never import from `@playwright/test`

```javascript
// BAD
import { test, expect } from '@playwright/test'

// GOOD in tests/*.spec.js
import { test, expect } from '../fixtures/index.fixtures'

// GOOD in tests/e2e/*.spec.js
import { test, expect } from '../../fixtures/index.fixtures'
```

### Rule D: Always `load()` + `waitLoad()` in `beforeEach`

```javascript
// BAD — flaky
await <pageName>Page.load()

// GOOD
await <pageName>Page.load()
await <pageName>Page.waitLoad()
```

### Rule E: Never hard-code credentials

```javascript
// BAD
await loginPage.submitLoginInForm('standard_user', 'secret_sauce')

// GOOD
await loginPage.submitLoginInForm(process.env.email, process.env.password)
```

### Rule F: Never `page.goto()` directly in specs

```javascript
// BAD
test('...', async ({ page }) => {
    await page.goto('/inventory.html')
})

// GOOD
test('...', async ({ inventoryPage }) => {
    await inventoryPage.load()
})
```

### Rule G: Every class in `pages/` must have a fixture entry

Each `pages/<pagename>.js` must have its corresponding entry in `fixtures/page.fixtures.js`. Never leave this step incomplete.

---

## Complete example

**Input:** `/inventory.html` (REQUIRES_AUTH = true)

**Scan produces:**
```
e1  [heading "Products" level=3]
e2  [button "Add to cart"]
e3  [button "Open Menu"]
e4  [link "Twitter"]
```

**Phase 2 generates:**

`pages/inventory.js`:
```javascript
// @ts-check
import { test } from '@playwright/test';

export class InventoryPage {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/inventory.html';
        this.heading = page.getByRole('heading', { name: 'Products' }).describe('Products heading');
        this.menuButton = page.getByRole('button', { name: 'Open Menu' }).describe('Open Menu button');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for Inventory page to load', async () => {
            await this.heading.waitFor({ state: 'visible' });
        });
    }

    async openMenu() {
        await this.menuButton.click();
    }
}
```

`fixtures/page.fixtures.js` — add:
```javascript
import { InventoryPage } from '../pages/inventory';
// inside base.extend():
inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
},
```

`utils/e2e.js` — add (because REQUIRES_AUTH = true):
```javascript
import { InventoryPage } from '../pages/inventory';
// in the constructor:
this.inventoryPage = new InventoryPage(page);
```

`tests/e2e/inventory.spec.js`:
```javascript
import { test, expect } from '../../fixtures/index.fixtures'

test.describe('Inventory E2E Suite', () => {

    test.beforeEach(async ({ e2e }) => {
        await e2e.login()
    })

    test('should display products heading after login', async ({ inventoryPage }) => {
        await inventoryPage.load()
        await inventoryPage.waitLoad()
        await expect(inventoryPage.heading).toBeVisible()
    })

})
```

---

## Final checklist

Before finishing, verify all of the following:

- [ ] `pages/<pagename>.js` exists with constructor, `load()`, `waitLoad()`, and at least one action method
- [ ] All locators use `getByRole()` or `getByLabel()` with `.describe()` chained
- [ ] No `expect()` inside page object methods (except bridge guard inside `test.step()`)
- [ ] `fixtures/page.fixtures.js` has the import and fixture entry for the new page
- [ ] The spec imports from `'../fixtures/index.fixtures'` or `'../../fixtures/index.fixtures'` (never from `@playwright/test`)
- [ ] `beforeEach` uses `load()` + `waitLoad()`
- [ ] No hard-coded credentials in any file
- [ ] No direct `page.goto()` calls in specs
- [ ] `utils/e2e.js` updated if `REQUIRES_AUTH = true` or the page is part of a flow
- [ ] Tests pass: `pnpm exec playwright test <spec-file> --project=chromium`
