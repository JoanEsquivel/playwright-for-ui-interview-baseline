# Test Case: Checkout Unhappy Path — Missing Required Fields

## Metadata

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-CHECKOUT-UHP-001 |
| **Title** | Validate "Your Information" form rejects submission when any required field is missing |
| **Feature / Module** | Checkout — Step One (Your Information) |
| **Priority** | High (P1) |
| **Test Type** | Functional / Negative / Validation |
| **Test Level** | System Test |
| **Design Technique** | Equivalence Partitioning + Error Guessing (ISTQB) |
| **Automation Candidate** | Yes |
| **Author** | QA Team |
| **Created** | 2026-04-19 |
| **Application Under Test** | Sauce Demo (https://www.saucedemo.com/) |

---

## Objective

Verify that the checkout information form at `/checkout-step-one.html` enforces mandatory field validation. When any of the required fields (First Name, Last Name, Postal Code) is left blank and the user clicks **Continue**, the system must:
1. Block navigation to the overview page.
2. Display the correct error message corresponding to the first missing field in validation order.

---

## Preconditions

1. The Sauce Demo application is reachable at `https://www.saucedemo.com/`.
2. A valid standard user account exists (credentials supplied via `process.env.email` / `process.env.password`).
3. The inventory catalog contains at least one purchasable item.
4. The user is able to reach the Checkout Information page (`/checkout-step-one.html`) by logging in, adding an item to the cart, and clicking Checkout.

---

## Test Data

| Field | Value |
|-------|-------|
| Username | `process.env.email` |
| Password | `process.env.password` |
| Product | Sauce Labs Backpack |
| Valid First Name | `John` |
| Valid Last Name | `Doe` |
| Valid Postal Code | `90210` |

---

## Shared Setup (applies to all sub-cases)

| # | Step / Action | Expected Result |
|---|---------------|-----------------|
| S1 | Navigate to `https://www.saucedemo.com/` | Login page loads. |
| S2 | Log in with valid credentials | Redirected to `/inventory.html`. |
| S3 | Click **Add to cart** on "Sauce Labs Backpack" | Cart badge shows `1`. |
| S4 | Click the shopping cart icon | Cart page (`/cart.html`) is displayed with the item. |
| S5 | Click **Checkout** | `/checkout-step-one.html` loads with empty First Name, Last Name, and Postal Code inputs. |

After this shared setup, each sub-case (A, B, C) fills a specific subset of fields and clicks **Continue**.

---

## Sub-Case A — Missing First Name

| Field | Value |
|-------|-------|
| **Sub-Case ID** | TC-CHECKOUT-UHP-001-A |
| **Priority** | High (P1) |
| **Test Type** | Negative / Field Validation |

### Steps

| # | Step / Action | Test Data | Expected Result |
|---|---------------|-----------|-----------------|
| A1 | Execute Shared Setup S1–S5 | — | Checkout step one page loaded, all fields empty. |
| A2 | Leave First Name input **blank** | `` (empty) | Field remains empty. |
| A3 | Enter Last Name | `Doe` | Input accepts value. |
| A4 | Enter Postal Code | `90210` | Input accepts value. |
| A5 | Click **Continue** | — | Navigation is blocked; the user remains on `/checkout-step-one.html`. |
| A6 | Observe error banner | — | An error message is visible: **"Error: First Name is required"**. The error icon (red X) appears in the First Name input. |

### Pass Condition

- URL is still `/checkout-step-one.html`.
- Visible text contains `Error: First Name is required`.

---

## Sub-Case B — Missing Last Name

| Field | Value |
|-------|-------|
| **Sub-Case ID** | TC-CHECKOUT-UHP-001-B |
| **Priority** | High (P1) |
| **Test Type** | Negative / Field Validation |

### Steps

| # | Step / Action | Test Data | Expected Result |
|---|---------------|-----------|-----------------|
| B1 | Execute Shared Setup S1–S5 | — | Checkout step one page loaded, all fields empty. |
| B2 | Enter First Name | `John` | Input accepts value. |
| B3 | Leave Last Name input **blank** | `` (empty) | Field remains empty. |
| B4 | Enter Postal Code | `90210` | Input accepts value. |
| B5 | Click **Continue** | — | Navigation is blocked; user remains on `/checkout-step-one.html`. |
| B6 | Observe error banner | — | An error message is visible: **"Error: Last Name is required"**. The error icon appears in the Last Name input. |

### Pass Condition

- URL is still `/checkout-step-one.html`.
- Visible text contains `Error: Last Name is required`.

---

## Sub-Case C — Missing Postal Code

| Field | Value |
|-------|-------|
| **Sub-Case ID** | TC-CHECKOUT-UHP-001-C |
| **Priority** | High (P1) |
| **Test Type** | Negative / Field Validation |

### Steps

| # | Step / Action | Test Data | Expected Result |
|---|---------------|-----------|-----------------|
| C1 | Execute Shared Setup S1–S5 | — | Checkout step one page loaded, all fields empty. |
| C2 | Enter First Name | `John` | Input accepts value. |
| C3 | Enter Last Name | `Doe` | Input accepts value. |
| C4 | Leave Postal Code input **blank** | `` (empty) | Field remains empty. |
| C5 | Click **Continue** | — | Navigation is blocked; user remains on `/checkout-step-one.html`. |
| C6 | Observe error banner | — | An error message is visible: **"Error: Postal Code is required"**. The error icon appears in the Postal Code input. |

### Pass Condition

- URL is still `/checkout-step-one.html`.
- Visible text contains `Error: Postal Code is required`.

---

## Consolidated Expected Results

| Sub-Case | Missing Field | Expected Error Message | URL Must Remain |
|----------|---------------|------------------------|-----------------|
| A | First Name | `Error: First Name is required` | `/checkout-step-one.html` |
| B | Last Name | `Error: Last Name is required` | `/checkout-step-one.html` |
| C | Postal Code | `Error: Postal Code is required` | `/checkout-step-one.html` |

In all three sub-cases, the application MUST NOT navigate to `/checkout-step-two.html`.

---

## Postconditions

- The user remains authenticated.
- The cart still contains the Sauce Labs Backpack (item is not cleared by a failed validation).
- The checkout form retains any values that were successfully entered prior to submission.

---

## Acceptance Criteria

| ID | Criterion | Pass Condition |
|----|-----------|----------------|
| AC-1 | Required field validation exists for First Name | Sub-Case A produces the expected error message |
| AC-2 | Required field validation exists for Last Name | Sub-Case B produces the expected error message |
| AC-3 | Required field validation exists for Postal Code | Sub-Case C produces the expected error message |
| AC-4 | Navigation is blocked on invalid submission | All three sub-cases remain on `/checkout-step-one.html` |
| AC-5 | Error banner is dismissible / re-shown on retry | Error reappears on subsequent invalid submissions |

---

## Traceability

| Requirement | Linked Test |
|-------------|-------------|
| REQ-CHK-003 — First Name is a required field on checkout | TC-CHECKOUT-UHP-001-A |
| REQ-CHK-004 — Last Name is a required field on checkout | TC-CHECKOUT-UHP-001-B |
| REQ-CHK-005 — Postal Code is a required field on checkout | TC-CHECKOUT-UHP-001-C |
| REQ-CHK-006 — Invalid checkout submission must block navigation | TC-CHECKOUT-UHP-001 (all) |

---

## Notes

- Sauce Demo validates fields sequentially: First Name → Last Name → Postal Code. If multiple fields are blank, only the first missing field's error is shown. Sub-cases intentionally isolate one missing field at a time to exercise each validation branch.
- Consider additional negative cases (out of scope here but candidates for expansion): whitespace-only inputs, extremely long inputs, non-ASCII characters, and numeric input in the name fields.
- When automated, the spec file belongs under `tests/e2e/` and must use the `e2e` fixture and page objects — assertions on error text live in the test, never in the page object (see project `CLAUDE.md`, Rule 1).
