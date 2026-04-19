---
name: modify-tests
description: Guide for modifying or removing existing Playwright tests, page objects, fixtures, and E2E utilities. Use when the user asks to update, change, rename, fix, or remove an existing test case, locator, action method, E2E workflow method, or entire page object.
---

# modify-tests

> **Scope:** Updating and deleting existing tests only.
> For creating new tests → use `playwright-create-test`.
> For architecture rules → see `CLAUDE.md` (always loaded).

---

## Memory Check

Before starting, read `.claude/skills/memory/modify-tests.md` (if it exists).
Apply any recorded learnings to this session.

---

## Debugging Before Modifying

When a test is failing, diagnose before editing. Two patterns are available:

### Pattern A — View a recorded trace (post-failure, no re-run needed)

Traces are captured automatically on the first retry (`trace: 'on-first-retry'` in `playwright.config.js`). After a failed run, a `.zip` trace file is saved under `test-results/`.

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

Opens the Playwright trace viewer in the browser. Use it to time-travel through each action: see the exact DOM snapshot, network requests, console output, and screenshots at every step. No need to re-run the test.

### Pattern B — Attach to a live test run (real-time, step-by-step)

Use this when the failure is intermittent or you need to inspect state mid-execution.

```bash
# Step 1 — run the test in CLI debug mode (pauses before the first action)
npx playwright test tests/login.spec.js --debug=cli

# Step 2 — note the session name printed in the output, e.g.:
#   Debugger listening on playwright-cli session: my-session-abc123

# Step 3 — attach and inspect (in a second terminal, or via playwright-cli skill)
playwright-cli attach my-session-abc123
playwright-cli snapshot        # see current page state
playwright-cli click e5        # step through actions manually
```

---

## Operation: UPDATE

### Update a locator

Open `pages/<page>.js`, find the property in the constructor, replace the selector. Keep `.describe()` chained. Do not rename the property unless the element's semantic role changed — renaming breaks all tests that reference it.

### Add a new test case

Add a `test()` block inside the existing `test.describe()`. If the new test needs a different setup, use a nested `test.describe()` with its own `test.beforeEach()`:

```javascript
test.describe('Login Test Suite', () => {

    test.describe('valid credentials', () => {
        test.beforeEach(async ({ loginPage }) => {
            await loginPage.load();
            await loginPage.waitLoad();
        });
        test('should login successfully', async ({ loginPage }) => { ... });
    });

    test.describe('invalid credentials', () => {
        test.beforeEach(async ({ loginPage }) => {
            await loginPage.load();
            await loginPage.waitLoad();
        });
        test('should show error for wrong password', async ({ loginPage }) => { ... });
    });

});
```

### Add a new action method to a page object

Add to `pages/<page>.js`. Rules:
- Actions only — no `expect()` assertions
- Accept parameters; never hard-code test data inside page objects
- Optionally wrap in `test.step()` if it contains multiple labeled sub-actions

### Add a new E2E workflow method

Add to `utils/e2e.js`. Same rules: action-only, use page object methods — do not bypass the page object layer by directly calling `this.page`.

### Update auth setup

If the post-login landing page changes, update `waitLoad()` in the relevant page object and update `e2e.login()` in `utils/e2e.js` to call the correct `waitLoad()` as its last step.

---

## Operation: DELETE

### Delete a single test case

Remove the `test()` block. If it was the only test in a `test.describe()`, remove the describe block too.

### Delete an entire spec file

1. Delete the spec file from `tests/` or `tests/e2e/`
2. Check if any page fixtures used in that spec are referenced elsewhere — search for the fixture name across all `*.spec.js` files
3. If the fixture is used nowhere else, proceed to the full page object cleanup below

### Full page object cleanup (5 steps)

Only do this when the page object is referenced nowhere in any test or E2E utility.

1. Delete `pages/<pagename>.js`
2. Remove the import and fixture entry from `fixtures/page.fixtures.js`
3. Remove the import and `this.<pageName>Page` property from `utils/e2e.js`
4. Remove any E2E workflow methods in `utils/e2e.js` that used the page object
5. Verify — search for orphaned references:

```bash
grep -r "<PageName>Page" pages/ fixtures/ utils/ tests/
# Should return zero results
```

### Delete an E2E workflow method

Remove the method from `utils/e2e.js`. Search all `tests/e2e/*.spec.js` files first to confirm no test calls it.

---

## Memory Update

After completing the task, if you discovered anything new about this project
(a selector pattern, an auth behavior, a page structure, a gotcha), append it
to `.claude/skills/memory/modify-tests.md` in the appropriate section.
Only record things that are non-obvious and would save future effort.
