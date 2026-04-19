# playwright-create-test — Learnings

## Selector Patterns
- [2026-04-19] Inventory page: individual product add-to-cart buttons use `data-test="add-to-cart-sauce-labs-backpack"` pattern (product name kebab-cased). Cart link: `data-test="shopping-cart-link"`. Cart badge: `data-test="shopping-cart-badge"`.
- [2026-04-19] Checkout error banner: `data-test="error"`. Checkout complete header: `data-test="complete-header"`. Back to products button: `data-test="back-to-products"`. Pony Express image: `.pony_express` (class selector, no data-test attribute).
- [2026-04-19] Checkout step two subtotal: `data-test="subtotal-label"`. Finish button: `data-test="finish"`. Cancel button: `data-test="cancel"` (shared key on both checkout step one and two).

## Auth & Navigation
- [2026-04-19] The `e2e` fixture does NOT automatically apply storageState. Auth is manual via `e2e.login()` which navigates to `/`, fills credentials from `process.env.email`/`process.env.password`, and waits for inventory title. Always call `e2e.login()` in `beforeEach` for E2E specs under `tests/e2e/`.
- [2026-04-19] `utils/e2e.js` imports both `test` and `expect` from `@playwright/test` — `test` is needed for `test.step()` inside workflow methods, `expect` is used as a navigation guard (not a test assertion) inside `completeCheckout`.

## Known Issues / Gotchas
- [2026-04-19] When adding `test.step()` calls to `utils/e2e.js` workflow methods, `test` must be explicitly imported from `@playwright/test` — the original file only imported `expect`. Page objects import `test` from `@playwright/test` solely for `test.step()` inside `waitLoad()`.
- [2026-04-19] All page objects and fixtures for the full checkout flow (login → inventory → cart → step-one → step-two → complete) were already in place before these specs were created. Only missing pieces were: specific product locators, a few action methods (`clickCheckout`, `clickBackHome`, `addSauceLabsBackpackToCart`, `goToCart`), the error banner locator, and the E2E `completeCheckout` workflow method.
