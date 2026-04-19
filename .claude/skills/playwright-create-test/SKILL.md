---
name: playwright-create-test
description: Step-by-step guide for adding a new page object, fixture entry, and spec file to this project. Use when the user asks to add, create, or scaffold tests for a new page or feature that does not yet exist in pages/.
---

# playwright-create-test

> **Scope:** Creating new tests and page objects only.
> For modifying or deleting existing tests → use `modify-tests`.
> For architecture rules → see `CLAUDE.md` (always loaded).

---

## Memory Check

Before starting, read `.claude/skills/memory/create-test.md` (if it exists).
Apply any recorded learnings to this session.

---

## Choosing an Approach

| Scenario | Use | Test file location |
|----------|-----|--------------------|
| Single-page behavior — form validation, error states, element visibility | **Page Object approach** — `loginPage`, `homePage`, `checkoutPage` fixtures | `tests/*.spec.js` |
| Multi-page user journey — login → navigate → complete action | **E2E approach** — `e2e` fixture + individual page fixtures for assertions | `tests/e2e/*.spec.js` |
| Shared auth state across many tests | Auth setup project + `storageState` | `tests/auth.setup.js` (already exists) |

---

## Operation: CREATE

### Step 1 — Do you need a new page object?

- If the target page already has a class in `pages/`, skip to Step 3.
- If not, create it.

### Step 2 — Create the page object

**File:** `pages/<pagename>.js`

```javascript
// @ts-check
import { test } from '@playwright/test';

export class <PageName>Page {

    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.url = '/<route>';
        // All locators — semantic selectors + .describe()
        this.someButton = page.getByRole('button', { name: 'Button Label' }).describe('<Button Label> button');
        this.someInput  = page.getByRole('textbox', { name: 'Field Label' }).describe('<Field Label> input');
    }

    async load() {
        await this.page.goto(this.url);
    }

    async waitLoad() {
        await test.step('Wait for <PageName> page to load', async () => {
            await this.someButton.waitFor({ state: 'visible' });
        });
    }

    // Action methods — interaction only, no assertions
    async <actionName>(<params>) {
        await this.someInput.fill(<value>);
        await this.someButton.click();
    }
}
```

### Step 3 — Wire the page object into `fixtures/page.fixtures.js`

Add the import and a new fixture entry:

```javascript
import { <PageName>Page } from '../pages/<pagename>';

// Inside base.extend({...}):
<pageName>Page: async ({ page }, use) => {
    await use(new <PageName>Page(page));
},
```

`fixtures/index.fixtures.js` does **not** need to change — `mergeTests()` picks up everything from `pageFixture` automatically.

### Step 4 — If this page is used in E2E flows, add it to `utils/e2e.js`

```javascript
import { <PageName>Page } from '../pages/<pagename>';

// Inside E2E constructor:
this.<pageName>Page = new <PageName>Page(page);
```

Only add E2E workflow methods for multi-step flows. Keep them action-only (no assertions).

### Step 5 — Create the spec file

**Page Object style** — single page, focused tests:
**File:** `tests/<feature>.spec.js`

```javascript
import { test, expect } from '../fixtures/index.fixtures'

test.describe('<Feature> Test Suite', () => {

    test.beforeEach(async ({ <pageName>Page }) => {
        await test.step('Load <pageName> page', async () => {
            await <pageName>Page.load();
            await <pageName>Page.waitLoad();
        });
    });

    test('should <description>', async ({ <pageName>Page }) => {
        await <pageName>Page.<action>();
        await expect(<pageName>Page.<locator>).<matcher>();
    });

});
```

**E2E Workflow style** — multi-page flow requiring login:
**File:** `tests/e2e/<feature>.spec.js`

```javascript
import { test, expect } from '../../fixtures/index.fixtures'

test.describe('<Feature> E2E Suite', () => {

    test.beforeEach(async ({ e2e }) => {
        await e2e.login();
    });

    test('should <description>', async ({ <pageName>Page }) => {
        // e2e handles the multi-step navigation
        // individual page fixtures handle assertions
        await expect(<pageName>Page.<locator>).<matcher>();
    });

});
```

### Step 6 — Add test data if needed

**File:** `data/test.json` — add keys to the existing JSON object.

```javascript
// Import in tests
import data from '../data/test.json'    // from tests/
import data from '../../data/test.json' // from tests/e2e/
```

---

## Quick Reference: Adding a New Page End-to-End

1. `pages/cart.js` — Create `CartPage` class: constructor with locators, `load()`, `waitLoad()`, action methods
2. `fixtures/page.fixtures.js` — Import `CartPage`, add `cartPage` fixture entry
3. `utils/e2e.js` — Import `CartPage`, add `this.cartPage = new CartPage(page)` (only if needed in E2E flows)
4. `tests/cart.spec.js` — Focused tests using `cartPage` fixture
5. `tests/e2e/purchase.spec.js` — E2E tests using `e2e` fixture for login, `cartPage` for assertions
6. `data/test.json` — Add any product names, quantities, or expected values needed by tests

---

## Authentication Setup

The auth project (`tests/auth.setup.js`) runs `e2e.login()` and saves browser state to `.auth/auth.json`. To enable stored auth for browser projects, uncomment `storageState` and `dependencies` in `playwright.config.js`:

```javascript
{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: '.auth/auth.json' },
    dependencies: ['auth'],
}
```

**When auth setup breaks:** update `e2e.login()` in `utils/e2e.js`. The method's last step must call the correct `waitLoad()` so storage state is captured after a fully loaded post-login page.

---

## Memory Update

After completing the task, if you discovered anything new about this project
(a selector pattern, an auth behavior, a page structure, a gotcha), append it
to `.claude/skills/memory/create-test.md` in the appropriate section.
Only record things that are non-obvious and would save future effort.
