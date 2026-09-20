# Playwright Standards — Agent Contract

This repository is a **Playwright test framework built on a fixed set of standards**, plus the kit that lets a coding agent apply those standards anywhere (`.claude/skills`, `.claude/agents`, `.claude/rules`). The application and API under test are **parameters**, never assumptions: this repo's example targets are SauceDemo (UI) and DummyJSON (API), configured only through `.env`.

## Parameters

| Env var | Meaning | Example (this repo) |
|---|---|---|
| `BASE_URL` | UI under test; every page object `url` is relative to it | `https://www.saucedemo.com` |
| `E2E_USERNAME` / `E2E_PASSWORD` | UI credentials used by `utils/e2e.ts` `login()` and the setup project | demo user |
| `API_BASE_URL` | API under test; base for `api/clients/*` | `https://dummyjson.com` |
| `API_USERNAME` / `API_PASSWORD` | API credentials used by the worker-scoped `authToken` fixture | demo user |
| `BROWSERS` | Optional `chromium,firefox,webkit` → extra `ui-<b>` / `e2e-<b>` projects | unset |
| `WORKERS` | Optional worker count (`1` = serial) | unset |

Never hard-code these values in code, skills or docs. Read them via `utils/env.ts` (`env.BASE_URL`, …). If a task needs a value that is missing, ask for it once, then write it to `.env`/`.env.example`.

## Commands

```bash
corepack pnpm install && corepack pnpm exec playwright install chromium --with-deps
pnpm test            # setup → ui, e2e, api        pnpm test:ui | test:api | test:e2e | test:smoke
pnpm lint            # eslint + tsc (blocking gate) pnpm lint:fix
pnpm test:debug <spec>                    # pauses; then: pnpm exec playwright-cli attach <session>
pnpm exec playwright-cli open <url>       # live browser: snapshot, click, fill, eval, close
```

## Layout

```
pages/       Page objects: locators (constructor, .describe()), load(), waitLoad(), action methods. No assertions.
api/         clients/*.client.ts (one class per resource, returns APIResponse<T> typed from the schema) · schemas/*.schema.ts (zod: request + response schemas and their inferred types)
utils/       e2e.ts (multi-page flows, bridge guards) · env.ts (typed env access)
fixtures/    page.fixtures.ts · e2e.fixtures.ts · api.fixtures.ts · index.fixtures.ts (mergeTests + toMatchSchema)
tests/       setup/*.setup.ts · ui/*.spec.ts · api/*.spec.ts · e2e/*.spec.ts
data/        *.json test data (never credentials)
.github/     workflows: lint, playwright-parallel, playwright-serial, playwright-sharded · actions/setup-playwright
```

## Non-negotiable rules

1. **Assertions live in specs.** `pages/**` and `api/**` never call `expect`. Enforced: `no-restricted-syntax`, `no-restricted-imports`.
2. **Guards are not assertions.** Allowed outside specs: `locator.waitFor()` inside `waitLoad()`, and one bridge `expect` inside a `utils/e2e.ts` flow method, wrapped in `test.step`, to confirm a page transition.
3. **Specs import `test`/`expect` only from `fixtures/index.fixtures`** (written `@/fixtures/index.fixtures`, see rule 11). Never from `@playwright/test` (types excepted). Enforced by lint.
4. **Locators are semantic and described.** Order: `getByRole` / `getByLabel` → `[data-test=…]` / `[data-testid=…]` → `getByText`. Never CSS classes or XPath. Always chain `.describe('<Name> <role>')`.
5. **Verify locators against the live page** with `playwright-cli` (snapshot/eval) before writing or changing them. Never guess from memory.
6. **No `page.goto()` in specs**; call `<page>.load()` then `<page>.waitLoad()`. Enforced by lint.
7. **No credentials in code or data files.** Use `env.*`. Enforced by lint (literal args to `login`/`submitLoginForm`).
8. **Tests are isolated and deterministic.** No `waitForTimeout`, no `if` in tests, no order dependence, web-first assertions only. Enforced: `eslint-plugin-playwright`. Each test owns the data it changes; a resource that cannot be duplicated takes the same test lock on **every** test that touches it (`playwright-locks`). Never go serial, retry or sleep to hide a collision.
9. **Every new page object gets a fixture entry** in `fixtures/page.fixtures.ts`; every API client is wired in `fixtures/api.fixtures.ts`. Orphans are removed on delete.
10. **Definition of done:** `pnpm lint` clean and the targeted `playwright test` run green, with output shown. Never weaken an assertion to make a test pass; if the app is wrong, file a bug report instead.
11. **Cross-folder imports use the `@/` alias.** `@/` maps to the repository root through `paths` in `tsconfig.json` (`jsconfig.json` in JS projects): `@/pages/login`, `@/utils/env`, `@/data/cart.json`, `@/playwright.config`. Never `../`; a same-folder `./` import is fine. Enforced: `no-restricted-imports`.
12. **API bodies are typed from zod.** The schema in `api/schemas` is the only place a shape is written: responses export `z.infer` types, requests and queries `z.input` types. Clients return `APIResponse<T>` with the schema type as default, so specs read `const cart = await response.json()` already typed and prove it with `toMatchSchema`; a negative case passes the contract it expects (`getById<ErrorResponse>(id)`). Never `: unknown`, `any` or an `as` cast on a body; never an `interface` for a payload in `api/clients`. Enforced: `no-restricted-syntax`, `no-unsafe-*`, `tsc`. Alternatives and rationale: `docs/api-typing.md`.

## Choosing a test style

| Situation | Style | Location | Fixtures |
|---|---|---|---|
| Single page behavior (forms, errors, visibility) | UI | `tests/ui` | `<name>Page` |
| Endpoint contract, status, schema, business rule | API | `tests/api` | `api`, `authedApi` |
| Multi-page journey | E2E | `tests/e2e` | page fixtures + storage state |
| Auth once per run | setup | `tests/setup` | `e2e.login()` → `storageState` |
| Data needed before a UI test | seed via API in `beforeEach`, verify in UI | `tests/e2e` | `api` + page fixtures |
| Tests change a resource that cannot be duplicated (seeded account, global setting, one-slot sandbox) | any style + test lock (Playwright 1.63+) on every participant | where the tests already live | `{ tag: [… , '@locked'], lock: '<resource-name>' }`; see `docs/test-locks.md` |

Tags: `@smoke` (runs on every PR), `@regression` (full runs), plus `@ui` / `@api` / `@e2e` on the describe, and `@locked` on anything that declares a `lock`.

## Skills and agent

| Skill | Use when |
|---|---|
| `playwright-architecture` | Any question about structure, conventions, templates (always preloaded in the agent) |
| `playwright-scaffold` | Create a framework from zero in a new directory |
| `playwright-create-test` | Add UI or API tests, page objects, clients, fixtures |
| `playwright-fix-test` | A test fails or is flaky |
| `playwright-delete-test` | Remove tests, page objects or clients safely |
| `playwright-ci` | Add or change GitHub Actions: serial, parallel, sharded |
| `playwright-locks` | Tests collide on a shared resource, or a resource cannot be duplicated: decide, declare `lock`, prove the race and the fix, CI limits |
| `playwright-cli` | Live browser control and `--debug=cli` attach sessions |

Agent: `qa-playwright-engineer` (`.claude/agents/qa-playwright-engineer.md`, mirrored in `.github/agents/`). Invoke with `claude --agent qa-playwright-engineer` or by asking for any QA task. Usage guide and recommended prompts: `docs/agent-guide.md`.
