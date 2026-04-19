# Skills Overview — Playwright Project

This document describes the Claude Code skill system used in this project.

---

## How It Works

Claude Code skills are prompt injections loaded when invoked with `/skill-name`. Each skill handles one specific task. Architecture rules and project conventions live in `CLAUDE.md` and are always active — no invocation needed.

---

## Skill Map

### `playwright-cli`
**Invoke:** `/playwright-cli`
**Purpose:** Live browser automation — navigate pages, click elements, take snapshots and screenshots, run Playwright scripts.
**Do not modify:** This is a system-managed skill.

---

### `playwright-create-test`
**Invoke:** `/playwright-create-test`
**Purpose:** Step-by-step guide to scaffold a new page under test:
1. Create a Page Object class in `pages/`
2. Wire it into `fixtures/page.fixtures.js`
3. Optionally add it to `utils/e2e.js` for multi-step flows
4. Create the spec file (`tests/` or `tests/e2e/`)
5. Add test data to `data/test.json` if needed

**Trigger phrases:** "add tests for", "create a page object for", "scaffold tests for", "generate a spec for"

---

### `modify-tests`
**Invoke:** `/modify-tests`
**Purpose:** Update or delete existing tests and page objects:
- Update a locator in a page object
- Add a new test case or nested describe block
- Add or rename an action method
- Add an E2E workflow method to `utils/e2e.js`
- Safely delete tests, spec files, or entire page objects (with fixture cleanup)

**Trigger phrases:** "update the locator", "add a test case", "delete the checkout tests", "remove the cart page object", "fix the selector"

---

### `scan-to-scripts`
**Invoke:** `/scan-to-scripts`
**Purpose:** Given a URL or relative path, Claude:
1. Opens the browser with `playwright-cli`
2. Takes a snapshot and builds an element inventory
3. Detects auth requirements
4. Generates the full page object, fixture wiring, and spec file automatically

**Trigger phrases:** "scan this URL and create tests", "generate tests for /inventory.html", "create tests for https://...", "generate scripts for"

---

### `scan-to-test-cases`
**Invoke:** `/scan-to-test-cases`
**Purpose:** Given a URL or a workflow description, Claude:
1. Opens the browser with `playwright-cli`
2. Scans the page or navigates each step of the workflow
3. Applies ISTQB test design techniques (EP, BVA, Decision Table, State Transition, Use Case, Error Guessing)
4. Generates structured test case documents in `.md` format under `testcases/`

**Techniques used:**
- **Equivalence Partitioning** — valid and invalid input groups
- **Boundary Value Analysis** — values at, just below, and just above field boundaries
- **Decision Table Testing** — combinations of conditions and their expected outcomes
- **State Transition Testing** — valid and invalid state changes
- **Use Case Testing** — main flow + alternative and exception flows
- **Error Guessing** — common error patterns and edge cases

**Trigger phrases:** "generate test cases for /inventory.html", "create ISTQB test cases for the checkout flow", "document test cases for https://...", "scan and write test cases for"

---

## Always-Active Rules (`CLAUDE.md`)

The following are always enforced, regardless of which skill is active:

| Rule | Summary |
|------|---------|
| No assertions in page objects | Action methods interact only; `expect()` belongs in tests |
| Guards are allowed | `waitFor()` and bridge `expect()` inside `test.step()` only |
| Spec import path | Always from `fixtures/index.fixtures` — never from `@playwright/test` |
| Locators use `.describe()` | Chain `.describe('<Name> <role>')` on every locator |
| No hard-coded credentials | Use `process.env.email` / `process.env.password` |
| No `page.goto()` in specs | Use `pageName.load()` |
| Every page class needs a fixture entry | `fixtures/page.fixtures.js` must be kept in sync |

---

## Skill Memory System

Skills log project-specific learnings (discovered selectors, auth quirks, page structure gotchas) to:

```
.claude/skills/memory/
├── create-test.md
├── modify-tests.md
└── scan-to-tests.md
```

Claude reads these at the start of each skill invocation and appends to them after discovering something new and non-obvious.

---

## Directory

```
.claude/skills/
├── playwright-cli/         ← system skill (do not modify)
│   ├── SKILL.md
│   └── references/
├── playwright-create-test/
│   └── SKILL.md
├── modify-tests/
│   └── SKILL.md
├── scan-to-scripts/
│   └── SKILL.md
├── scan-to-test-cases/
│   └── SKILL.md
├── memory/
│   ├── README.md
│   ├── create-test.md
│   ├── modify-tests.md
│   ├── scan-to-scripts.md
│   └── scan-to-test-cases.md
└── README.md
```
