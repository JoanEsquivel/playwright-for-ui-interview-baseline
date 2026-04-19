# Test Case: Checkout Happy Path

## Metadata

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-CHECKOUT-HP-001 |
| **Title** | Complete end-to-end checkout flow with valid data |
| **Feature / Module** | Checkout |
| **Priority** | High (P1) |
| **Test Type** | Functional / End-to-End / Positive |
| **Test Level** | System Test |
| **Design Technique** | Use Case Testing (ISTQB) |
| **Automation Candidate** | Yes |
| **Author** | QA Team |
| **Created** | 2026-04-19 |
| **Application Under Test** | Sauce Demo (https://www.saucedemo.com/) |

---

## Objective

Verify that an authenticated user can successfully add a product to the cart, proceed through the checkout workflow, submit valid shipping/billing information, and complete an order reaching the order confirmation page.

---

## Preconditions

1. The Sauce Demo application is reachable at `https://www.saucedemo.com/`.
2. A valid standard user account exists (credentials supplied via `process.env.email` / `process.env.password`).
3. The inventory catalog is populated with at least one purchasable item (e.g., "Sauce Labs Backpack").
4. Browser has no prior session (cart is empty, storage is clean) OR an auth storage state is available via `.auth/auth.json`.
5. Network connection is stable.

---

## Test Data

| Field | Value |
|-------|-------|
| Username | `process.env.email` (e.g., `standard_user`) |
| Password | `process.env.password` (e.g., `secret_sauce`) |
| Product | Sauce Labs Backpack |
| First Name | `John` |
| Last Name | `Doe` |
| Postal Code | `90210` |

---

## Test Steps

| # | Step / Action | Test Data | Expected Result |
|---|---------------|-----------|-----------------|
| 1 | Navigate to `https://www.saucedemo.com/` | — | Login page loads; username, password inputs and Login button are visible. |
| 2 | Enter valid username and password, click **Login** | `process.env.email` / `process.env.password` | User is authenticated and redirected to `/inventory.html`; the "Products" header is visible. |
| 3 | On the inventory page, click **Add to cart** on the "Sauce Labs Backpack" card | — | Button label changes to "Remove"; cart badge increments to `1`. |
| 4 | Click the shopping cart icon in the header | — | User is navigated to `/cart.html`; the cart shows the Sauce Labs Backpack line item with correct name, description, and price. |
| 5 | Click the **Checkout** button on the cart page | — | User is navigated to `/checkout-step-one.html`; "Checkout: Your Information" heading, first name, last name, postal code inputs, Cancel and Continue buttons are visible. |
| 6 | Enter First Name | `John` | First name input accepts the value. |
| 7 | Enter Last Name | `Doe` | Last name input accepts the value. |
| 8 | Enter Postal Code | `90210` | Postal code input accepts the value. |
| 9 | Click **Continue** | — | User is navigated to `/checkout-step-two.html`; "Checkout: Overview" heading is visible; item summary, payment info, shipping info, item total, tax, and total price are displayed. |
| 10 | Review the order summary | — | Item listed matches step 3; subtotal equals item price; tax and total are calculated and non-empty. |
| 11 | Click **Finish** | — | User is navigated to `/checkout-complete.html`; "Thank you for your order!" confirmation message is displayed along with the Pony Express image and "Back Home" button. |
| 12 | Click **Back Home** | — | User is returned to `/inventory.html`; cart badge is no longer displayed (cart was cleared upon order completion). |

---

## Expected Results (Summary)

- The user completes the purchase workflow without any validation or system errors.
- Final URL after step 11 is `https://www.saucedemo.com/checkout-complete.html`.
- Confirmation text **"Thank you for your order!"** is visible on the final page.
- Cart is emptied after the order is finalized.

---

## Postconditions

- User remains authenticated.
- Cart badge is cleared.
- Application is in a clean state ready for the next workflow.

---

## Acceptance Criteria

| ID | Criterion | Pass Condition |
|----|-----------|----------------|
| AC-1 | Authentication succeeds | Redirect to `/inventory.html` after login |
| AC-2 | Item is added to cart | Cart badge shows `1` and cart page lists the item |
| AC-3 | Checkout form accepts valid data | No error banner appears on `/checkout-step-one.html` after Continue |
| AC-4 | Order summary is accurate | Totals displayed = item price + tax |
| AC-5 | Order completes | Confirmation message visible on `/checkout-complete.html` |

---

## Traceability

| Requirement | Linked Test |
|-------------|-------------|
| REQ-CHK-001 — Authenticated users must be able to complete a checkout | TC-CHECKOUT-HP-001 |
| REQ-CHK-002 — Order confirmation must be shown on successful purchase | TC-CHECKOUT-HP-001 |

---

## Notes

- This test should be executed against the `standard_user` profile. The `problem_user`, `performance_glitch_user`, and `error_user` profiles may exhibit different behavior and warrant their own dedicated test cases.
- When automated, the spec file belongs under `tests/e2e/` and must use the `e2e` fixture and page objects — never direct `page.goto()` calls (see project `CLAUDE.md`).
