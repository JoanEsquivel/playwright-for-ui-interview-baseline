---
name: scan-to-test-cases
description: Scans a live web page or workflow with playwright-cli and generates ISTQB-style test case documents in Markdown format under the testcases/ folder. Invoke when the user wants structured test case artifacts (not Playwright scripts) for a page URL or a multi-step workflow description.
---

# scan-to-test-cases

Uses `playwright-cli` to scan a page or workflow, then applies ISTQB test design techniques to generate human-readable test case documents in `.md` format.

**Output:** `testcases/<name>.md` — structured test cases, not Playwright code.
**Companion skill:** `/scan-to-scripts` generates the Playwright automation scripts for the same pages.

---

## Memory Check

Before starting, read `.claude/skills/memory/scan-to-test-cases.md` (if it exists).
Apply any recorded learnings to this session.

---

## Input Modes

Determine the mode from the user's instruction:

| Input type | Mode | Example |
|------------|------|---------|
| URL or relative path | **Page mode** — scan a single page | `/inventory.html`, `https://...` |
| Workflow description | **Workflow mode** — scan multiple pages in sequence | `"login, add to cart, checkout"` |

If a relative path is given, prepend `https://www.saucedemo.com`.

---

## Phase 1 — Scan

### Step 1.1 — Open browser and navigate

Use `playwright-cli`:

**Page mode:**
```
- Navigate to <FULL_URL>
- Take a page snapshot
- Evaluate document.title and h1 content
- Take a screenshot for visual reference
```

**Workflow mode:**
```
- Navigate to the first page in the flow
- Take snapshot + screenshot
- Perform the action that advances to the next page
- Repeat for each step in the workflow
- Record the URL and snapshot at each transition point
```

### Step 1.2 — Detect authentication requirement

If navigating to the URL redirects to `/` and shows a username textbox → `REQUIRES_AUTH = true`.
Note this as a **Precondition** for all test cases on that page.

### Step 1.3 — Build element inventory

For each page (or each step in a workflow), record:

| Field | Source |
|-------|--------|
| Role | Label in snapshot brackets: `textbox`, `button`, `link`, `heading`, `checkbox`, `combobox` |
| Accessible name | String in quotes: `"Username"`, `"Add to cart"` |
| data-testid | `data-testid="..."` attribute if present |
| Possible states | e.g., button enabled/disabled, error message visible/hidden |

Capture all inputs, action elements, and content landmarks. Ignore purely structural elements.

### Step 1.4 — Understand the page/flow purpose

Before selecting techniques, answer:
1. What is the user's primary goal on this page or in this flow?
2. What are the 2–5 most important scenarios? (success path, error states, edge cases)
3. Are there conditional outcomes based on multiple inputs?
4. Does the page have distinct states? (empty, loading, populated, error)
5. Is this a standalone page or one step in a multi-page journey?

### Step 1.5 — Close browser

Close the browser via `playwright-cli`.

---

## Phase 2 — Select ISTQB Techniques

Based on the element inventory and page purpose, select which techniques apply:

| What was found | Technique to apply |
|---------------|--------------------|
| Text inputs, number fields, dropdowns with value ranges | **Equivalence Partitioning (EP)** — group inputs into valid and invalid partitions |
| Numeric fields or fields with min/max boundaries | **Boundary Value Analysis (BVA)** — test at, just below, and just above each boundary |
| Multiple input conditions that combine to produce different outcomes | **Decision Table Testing** — enumerate all condition combinations and their expected actions |
| Page or system has distinct named states (e.g., empty cart → items added → checkout) | **State Transition Testing** — test valid transitions and attempt invalid ones |
| Multi-step user journey (login → browse → add → checkout) | **Use Case Testing** — main flow + alternative flows (cancel, go back, error recovery) |
| Any interactive element present | **Error Guessing** — apply common error patterns (empty fields, wrong format, special characters, boundary overflows) |

Apply all relevant techniques. A single page typically produces 3–4 techniques; a workflow may produce all five.

### Technique quick reference

**Equivalence Partitioning (EP)**
Divide inputs into classes where each member is expected to behave identically. Always include at least one valid partition and all distinct invalid partitions.
- Example — age field accepting 18–65: partitions are `< 18` (invalid), `18–65` (valid), `> 65` (invalid)

**Boundary Value Analysis (BVA)**
Test the values at the edges of each partition: the value just below the boundary, the boundary itself, and the value just above.
- Example — minimum 18: test with `17`, `18`, `19`; maximum 65: test with `64`, `65`, `66`

**Decision Table Testing**
Create a table where columns are rules (combinations of conditions) and rows are conditions + expected actions. One test case per column.
- Example — login: (valid user + valid pass → success), (valid user + wrong pass → error), (empty user + any pass → error)

**State Transition Testing**
Identify all states and the events that trigger transitions. Write test cases for each valid transition and at least one invalid transition per state.
- Example — cart: Empty →[add item]→ Has Items →[remove all]→ Empty; also attempt checkout from Empty state

**Use Case Testing**
Derive tests from main success scenario and named alternative/exception flows.
- Main flow: the happy path from start to goal
- Alternative flows: optional branches (e.g., apply coupon, change quantity)
- Exception flows: error recovery paths (payment fails, session expires)

**Error Guessing**
Apply experience-based intuition for common defects:
- Empty required fields
- Fields exceeding max length
- Special characters and SQL injection patterns in text fields
- Double-click on submit buttons
- Navigating back after completing a step
- Refreshing mid-flow

---

## Phase 3 — Generate Test Case Document

### Step 3.1 — Derive the output filename

| Input type | Filename |
|------------|----------|
| Single URL `/inventory.html` | `testcases/inventory.md` |
| Workflow description | `testcases/<slug-of-flow>.md` e.g., `testcases/checkout-flow.md` |

Use lowercase, hyphen-separated slugs.

### Step 3.2 — Assign test case IDs

Format: `TC-<PAGE>-<NNN>` where `<PAGE>` is an uppercase abbreviation of the page/flow name.
- Login page → `TC-LOGIN-001`, `TC-LOGIN-002`, ...
- Inventory → `TC-INV-001`, ...
- Checkout flow → `TC-CHECKOUT-001`, ...

Number sequentially. Group related test cases together (all EP cases, then BVA, etc.).

### Step 3.3 — Write the document

**File:** `testcases/<name>.md`

```markdown
# Test Cases — [Page or Workflow Name]

**Generated:** YYYY-MM-DD
**Target:** [Full URL or workflow description]
**Techniques applied:** [comma-separated list of techniques used]

---

## TC-[PAGE]-001: [Test Case Title]

| Field | Detail |
|-------|--------|
| **Priority** | High / Medium / Low |
| **Technique** | [ISTQB technique name] |
| **Preconditions** | [System state required before execution; include "User is logged in" if REQUIRES_AUTH = true] |

### Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | [Specific user action] | [Observable system response] |
| 2 | [Next action] | [Expected response] |

**Test Data:** [Specific input values, e.g., username = "standard_user", age = 17]
**Postconditions:** [System state after the test completes]

---
```

### Priority assignment guide

| Scenario type | Priority |
|--------------|----------|
| Primary happy path (main success flow) | High |
| Authentication and access control | High |
| Required field validation | High |
| Error messages for invalid input | Medium |
| Boundary values | Medium |
| Alternative flows (optional branches) | Medium |
| Edge cases, special characters | Low |
| Error guessing / exploratory scenarios | Low |

### Step 3.4 — Coverage summary

At the end of the document, add a coverage table:

```markdown
## Coverage Summary

| Technique | Test Cases | Coverage Goal |
|-----------|-----------|---------------|
| Equivalence Partitioning | TC-XXX-001 to TC-XXX-003 | All partitions covered |
| Boundary Value Analysis | TC-XXX-004 to TC-XXX-007 | Min/max boundaries covered |
| Decision Table | TC-XXX-008 to TC-XXX-011 | All rules covered |
| State Transition | TC-XXX-012 to TC-XXX-015 | All valid transitions + 1 invalid per state |
| Use Case | TC-XXX-016 to TC-XXX-019 | Main flow + all named alternative flows |
| Error Guessing | TC-XXX-020 to TC-XXX-023 | Common error patterns |
```

---

## Phase 4 — Confirm Output

After writing the file:
1. State the full path of the generated file: `testcases/<name>.md`
2. State the total number of test cases generated
3. List which techniques were applied and how many test cases each produced

---

## Complete Example

**Input:** `/` (Login page — `REQUIRES_AUTH = false`, this IS the auth page)

**Scan produces:**
```
e1  [textbox "Username"]
e2  [textbox "Password"]
e3  [button "Login"]
e4  [heading "Swag Labs" level=1]
```

**Techniques selected:** EP, BVA (username length), Decision Table (user+pass combos), Error Guessing

**Output file:** `testcases/login.md`

```markdown
# Test Cases — Login Page

**Generated:** 2026-04-19
**Target:** https://www.saucedemo.com/
**Techniques applied:** Equivalence Partitioning, Decision Table Testing, Error Guessing

---

## TC-LOGIN-001: Successful login with valid credentials

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Technique** | Equivalence Partitioning — valid partition |
| **Preconditions** | Application is loaded at the login page |

### Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Enter a valid username in the Username field | Username is accepted |
| 2 | Enter the correct password in the Password field | Password is accepted (masked) |
| 3 | Click the Login button | User is redirected to the inventory page |

**Test Data:** username = valid registered user, password = correct password
**Postconditions:** User is on the inventory page, session is active

---

## TC-LOGIN-002: Login attempt with invalid username

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Technique** | Equivalence Partitioning — invalid partition |
| **Preconditions** | Application is loaded at the login page |

### Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Enter an unregistered username | Username is accepted in the field |
| 2 | Enter any password | Password is accepted |
| 3 | Click the Login button | Error message is displayed: "Username and password do not match" |

**Test Data:** username = "unknown_user", password = "any_password"
**Postconditions:** User remains on the login page

---

## TC-LOGIN-003: Login attempt with empty username

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Technique** | Error Guessing — required field empty |
| **Preconditions** | Application is loaded at the login page |

### Steps

| # | Action | Expected Result |
|---|--------|----------------|
| 1 | Leave the Username field empty | Field is empty |
| 2 | Enter any password | Password is accepted |
| 3 | Click the Login button | Error message is displayed: "Username is required" |

**Test Data:** username = (empty), password = "any_password"
**Postconditions:** User remains on the login page

---

## Coverage Summary

| Technique | Test Cases | Coverage Goal |
|-----------|-----------|---------------|
| Equivalence Partitioning | TC-LOGIN-001 to TC-LOGIN-002 | Valid and invalid user partitions |
| Decision Table | TC-LOGIN-001 to TC-LOGIN-004 | Valid/invalid user × valid/invalid pass combinations |
| Error Guessing | TC-LOGIN-003, TC-LOGIN-005 | Empty username, empty password |
```

---

## Memory Update

After completing the task, if you discovered anything new about this project
(a page structure, an auth behavior, an element pattern, a gotcha), append it
to `.claude/skills/memory/scan-to-test-cases.md` in the appropriate section.
Only record things that are non-obvious and would save future effort.
