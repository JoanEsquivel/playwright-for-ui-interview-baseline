---
paths:
  - "tests/**"
---

# Specs (`tests/**`)

- Import only from the fixtures index: `import { test, expect } from '../../fixtures/index.fixtures'`. Never from `@playwright/test` (type imports excepted). Enforced by lint.
- Location by style: `tests/ui` single page, `tests/api` endpoints, `tests/e2e` multi-page flows, `tests/setup` auth. Name `<feature>.spec.ts`.
- `test.describe('<Feature>', { tag: ['@ui' | '@api' | '@e2e'] }, …)`; tag each test `@smoke` or `@regression`.
- `beforeEach` loads the page through the page object: `await page.load(); await page.waitLoad();` inside `test.step`. Never `page.goto()` in specs. Enforced by lint.
- Test names: `should <verb> <noun> <qualifier>`.
- Use `test.step` for multi-step flows so reports read like the scenario.
- Web-first assertions only (`await expect(locator).toBeVisible()`), never `isVisible()` checks, `waitForTimeout`, `networkidle` or `if` inside a test. Enforced by `eslint-plugin-playwright`.
- Credentials from `utils/env` (`env.E2E_USERNAME`); other data from `data/*.json`. Never string literals for credentials. Enforced by lint.
- `tests/ui/login.spec.ts`-style specs that must start logged out declare `test.use({ storageState: { cookies: [], origins: [] } })`.
- API specs: assert status first, then `expect(body).toMatchSchema(Schema)`, then business rules on `Schema.parse(body)`. Type the payload as `unknown` before matching.
- Never weaken an assertion to make a test pass. If the application is wrong, write a bug report (see `playwright-fix-test`).

```ts
// WRONG
import { test, expect } from '@playwright/test';
test('x', async ({ page }) => { await page.goto('/cart'); });

// CORRECT
import { test, expect } from '../../fixtures/index.fixtures';
test('should show cart items', { tag: ['@smoke'] }, async ({ cartPage }) => {
  await cartPage.load();
  await cartPage.waitLoad();
  await expect(cartPage.cartItems).toHaveCount(2);
});
```
