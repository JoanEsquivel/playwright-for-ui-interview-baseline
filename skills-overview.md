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

### `scan-to-tests`
**Invoke:** `/scan-to-tests`
**Purpose:** Given a URL or relative path, Claude:
1. Opens the browser with `playwright-cli`
2. Takes a snapshot and builds an element inventory
3. Detects auth requirements
4. Generates the full page object, fixture wiring, and spec file automatically

**Trigger phrases:** "scan this URL and create tests", "generate tests for /inventory.html", "create tests for https://..."

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
├── scan-to-tests/
│   └── SKILL.md
├── memory/
│   ├── README.md
│   ├── create-test.md
│   ├── modify-tests.md
│   └── scan-to-tests.md
└── README.md
```
