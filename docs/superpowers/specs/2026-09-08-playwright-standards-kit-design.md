# Playwright Standards Kit + QA Agent — Design Spec

Date: 2026-09-08
Status: approved by Joan Esquivel (plan mode) on 2026-09-08

## Context

The repo is a Playwright POM framework (saucedemo) with a hand-written `playwright-architecture` skill that encodes the owner's standards (thin page objects, assertions only in tests, fixtures via `mergeTests`, semantic locators with `.describe()`, env credentials, `load()`/`waitLoad()`). A previous attempt at an agent (qa_bot + 3 subagents + skill-memory + HARD GATE) was reverted; it was a quick pass, not a durable design (absolute paths, rules duplicated in 4 places, orchestration overhead).

Goal now: a **durable, enterprise-grade kit** that (1) standardizes the existing skill, (2) incorporates gaps found against 2026 Playwright best practices, (3) powers a single `qa-engineer` agent that can scaffold a framework from zero, add UI and API tests, fix tests with `playwright-cli`, delete tests safely, and set up CI (serial / parallel / sharding), and (4) works in Claude Code, GitHub Copilot and Cursor.

Decisions already made with the user:
- **TypeScript by default, JS variant available.**
- **This repo = reference implementation + kit.** Kit must be extractable to a Claude Code plugin later without edits (no absolute paths, no app-specific values inside skills).
- **Kit is app-agnostic and API-agnostic.** saucedemo (UI) and dummyjson.com (API) are only the reference example values. The agent takes `BASE_URL`, `API_BASE_URL`, credential env var names, language and package manager **as parameters** (asks if missing).
- **Single agent + preloaded skills**, no orchestrator/subagents (subagents only for ad-hoc parallel scans).
- **Do NOT use Playwright's planner/generator/healer agents.** Own structure only; `playwright-cli` is the "eyes" and the debug tool.
- **Test layout:** `tests/ui`, `tests/api`, `tests/e2e`, `tests/setup`.

## Research findings that shape the design

Cross-tool compatibility (verified in official docs):
- `.claude/skills/**/SKILL.md` is read natively by Claude Code, GitHub Copilot (VS Code, CLI, cloud agent) and Cursor. One skills folder serves all three.
- `AGENTS.md` is read natively by Cursor and Copilot; Claude Code reads it through `@AGENTS.md` inside `CLAUDE.md`.
- VS Code Copilot also reads `CLAUDE.md` and `.claude/rules/`. Cursor needs `.cursor/rules/*.mdc` (`globs`, `alwaysApply`); Copilot CLI/cloud need `.github/instructions/*.instructions.md` (`applyTo`) → generate both from `.claude/rules` with a sync script.
- Agents: Claude `.claude/agents/*.md` (frontmatter: `skills`, `memory`, `tools`, `permissionMode`, `maxTurns`); Copilot `.github/agents/*.agent.md` (`name`, `description`, `tools`); Cursor has no agent file, skills + AGENTS.md cover it.
- `@playwright/cli` official workflow for fixing tests: `PLAYWRIGHT_HTML_OPEN=never npx playwright test <spec> --debug=cli` → `playwright-cli attach <session>` → `snapshot`, `console error`, `requests`, `pause-at file:line`, `step-over`, `resume`; every action prints the equivalent Playwright code. `playwright-cli install --skills` installs/updates the official skill.

Gaps vs. best practices to add to the standards: TypeScript + `eslint-plugin-playwright` + `@typescript-eslint/no-floating-promises`; pinned Playwright version (no `^`); tags (`@smoke`, `@regression`) and `--grep` in CI; `setup` project + `storageState` enabled by default; API layer (clients + zod schemas + `api` fixture); seed data via API not UI; `fullyParallel` + `blob` reporter + `merge-reports` for sharding; `.env.example`; explicit bans on `waitForTimeout`, conditional logic in tests, `isVisible()` checks instead of web-first assertions; soft assertions guidance; formal definition of "guards" (`waitLoad()` in pages, bridge `expect` only inside `utils/e2e` flow methods, wrapped in `test.step`). Existing inconsistency to fix: `utils/e2e.ts login()` uses `expect` (allowed only as documented bridge guard); `InventoryPage`/`CartPage` use CSS class locators (`.inventory_item_name`) → prefer `data-test`.

## Target repository layout

```
AGENTS.md                         # portable source of truth (<150 lines): commands, layout, non-negotiable rules, skill index
CLAUDE.md                         # "@AGENTS.md" + short Claude-only section (agent name, hooks note)
.env.example                      # BASE_URL, API_BASE_URL, E2E_USERNAME, E2E_PASSWORD, API_USERNAME, API_PASSWORD
.claude/
  settings.json                   # PostToolUse hook: lint on pages/tests/api/fixtures/utils edits
  agents/qa-engineer.md           # single agent, skills preloaded, memory: project
  rules/                          # path-scoped rules (source for cursor/copilot mirrors)
    pages.md        (paths: pages/**)
    tests.md        (paths: tests/**)
    fixtures.md     (paths: fixtures/**, utils/**)
    api.md          (paths: api/**, tests/api/**)
    ci.md           (paths: .github/workflows/**)
  skills/
    playwright-architecture/      # standards (generic), references/{ts,js}-templates.md, decision tables
    playwright-scaffold/          # framework from 0; templates/ts/**, templates/js/**
    playwright-create-test/       # UI (live scan gate) + API (request probe → client + schema + spec)
    playwright-fix-test/          # run → trace → --debug=cli attach → fix → rerun → report app bug if not test bug
    playwright-delete-test/       # orphan-safe deletion checklist
    playwright-ci/                # templates: serial.yml, parallel.yml, sharded.yml + selection guide
    playwright-cli/               # official, untouched (update via `playwright-cli install --skills`)
.github/
  agents/qa-engineer.agent.md     # Copilot mirror of the agent
  instructions/*.instructions.md  # generated from .claude/rules
  copilot-instructions.md         # 3 lines pointing to AGENTS.md
  workflows/
    playwright-serial.yml
    playwright-parallel.yml
    playwright-sharded.yml
    lint.yml
.cursor/rules/*.mdc               # generated from .claude/rules
scripts/
  sync-agent-config.mjs           # .claude/rules → .cursor/rules + .github/instructions
  check-architecture.mjs          # (optional) extra arch checks not expressible in ESLint
api/                              # reference API layer
  clients/{auth,products,carts}.client.ts
  schemas/{auth,products,carts}.schema.ts   (zod)
pages/*.ts, utils/e2e.ts, fixtures/{page,e2e,api,index}.fixtures.ts
tests/{setup/auth.setup.ts, ui/*.spec.ts, api/*.spec.ts, e2e/*.spec.ts}
data/*.json
eslint.config.mjs, tsconfig.json, playwright.config.ts
docs/decisions.md                 # short ADR list (why TS, why thin POM, why single agent, why AGENTS.md)
```

## Phase 1 — Reference implementation upgraded to the new standards

1. **Migrate to TypeScript**: rename `pages/*.js`, `utils/e2e.js`, `fixtures/*.js`, `tests/**` to `.ts`; add `tsconfig.json`; type fixtures with `base.extend<{ loginPage: LoginPage; ... }>()`; keep the existing patterns (constructor locators + `.describe()`, `load()`, `waitLoad()`, action-only methods). Reuse existing classes as the base: `pages/login.js`, `pages/inventory.js`, `pages/cart.js`, `pages/checkout-*.js`, `utils/e2e.js`.
2. **Config** (`playwright.config.ts`): `baseURL: process.env.BASE_URL`; projects `setup` (testMatch `tests/setup/*.setup.ts`), `ui` + `e2e` (chromium, `storageState`, `dependencies: ['setup']`), `api` (testDir `tests/api`, `use.baseURL: process.env.API_BASE_URL`, no browser); optional firefox/webkit projects behind an env flag; `fullyParallel: true`; `reporter: CI ? [['blob'], ['github']] : [['html'], ['list']]`; `trace: 'on-first-retry'`; `retries: CI ? 2 : 0`. Pin `@playwright/test` exact version. Add `@playwright/cli` as devDependency. Rename env vars to `E2E_USERNAME`/`E2E_PASSWORD` (from `email`/`password`) and update the workflow secrets mapping.
3. **Move specs**: `tests/e2e/saucedemo-critical-path.spec.js` → `tests/e2e/checkout.spec.ts`; add `tests/ui/login.spec.ts` (page-object style example incl. invalid-credentials error); `tests/auth.setup.js` → `tests/setup/auth.setup.ts`. Add tags `{ tag: ['@smoke'] }` / `['@regression']`.
4. **Fix locator/guard inconsistencies**: `.inventory_item_name` / `.cart_item` → `[data-test=...]`; keep `expect` in `E2E.login()` only as the documented bridge guard wrapped in `test.step`.
5. **API layer (reference against dummyjson)**: `api/clients/*.client.ts` (class receiving `APIRequestContext`, methods return `APIResponse`, no assertions); `api/schemas/*.schema.ts` (zod); `fixtures/api.fixtures.ts` exposing `api` (typed bundle of clients) and `authToken`; `tests/api/{auth,products,carts}.spec.ts` with status + schema + business assertions; one hybrid example `tests/e2e/*` note showing "seed via API, verify via UI" pattern (documented, since saucedemo has no API).
6. **Lint**: `eslint.config.mjs` with `eslint-plugin-playwright` (recommended) + typescript-eslint (`no-floating-promises`) + architecture rules via `no-restricted-imports` (specs may not import `@playwright/test`; must import `fixtures/index.fixtures`) and `no-restricted-syntax` scoped by `files` (no `expect(` in `pages/**` and `api/clients/**`; no `page.goto(` in `tests/**`; no `waitForTimeout`; no string literal creds pattern). `pnpm lint` script; `pnpm test:ui|api|e2e|smoke` scripts.
7. **CI**: three workflows (serial: `workers: 1`; parallel: default workers, per-project matrix; sharded: `matrix shardIndex 1..4` + blob upload + `merge-reports` job) + `lint.yml`. Keep the existing browser cache steps from `.github/workflows/playwright.yml`, then delete that file.
8. `.env.example`, `.gitignore` additions (`.playwright-cli/` already there), `readme.md` refresh (short; details live in AGENTS.md).

## Phase 2 — The kit (Claude Code first)

1. **`AGENTS.md`** (generic): stack, commands, directory map, 10 non-negotiable rules (one line each + link to the architecture skill for examples), "parameters this project uses" section (BASE_URL, API_BASE_URL, credential vars) filled for the reference; skill index table. **`CLAUDE.md`**: `@AGENTS.md` + Claude section (agent name, hook behavior, plan mode for config changes).
2. **`.claude/rules/*.md`** with `paths:` frontmatter, each < 60 lines, only rules + one WRONG/CORRECT pair per rule. These are the single source for Cursor/Copilot mirrors.
3. **Skills** (all with `name`, `description` tuned for auto-trigger; templates inside the skill; no app-specific values, use `{{BASE_URL}}`-style placeholders resolved from parameters/.env):
   - `playwright-architecture`: rewrite of current SKILL.md → generic, TS-first, `references/js-variant.md`, `references/api-layer.md`, `references/guards-and-assertions.md`, decision tables (UI vs API vs E2E; when to page-object vs flow).
   - `playwright-scaffold`: inputs (target dir, BASE_URL, API_BASE_URL, creds var names, language, pm); steps: copy `templates/<lang>/**`, write `.env.example`, `AGENTS.md` for the new project (from template), install deps, `playwright install chromium --with-deps`, run `pnpm lint` + smoke test; final checklist.
   - `playwright-create-test`: UI path = the current `scan-to-tests` flow (live scan gate via `playwright-cli`, element inventory → PO → fixture → spec → run) generalized; API path = probe endpoint (`playwright-cli`/`curl`), derive zod schema from a real response, client method, fixture, spec; both end with lint + run.
   - `playwright-fix-test`: 1) run the spec, 2) classify error (locator / timing / data / auth / app bug), 3) inspect trace or `--debug=cli` + `attach` + `snapshot`/`console error`/`requests`/`pause-at`, 4) fix smallest thing, 5) rerun ×2 for flakiness, 6) if app bug → write bug report (reuse the readme's BUG-001 format) and do not weaken the assertion. Load `superpowers:systematic-debugging` when available.
   - `playwright-delete-test`: current DELETE section, extended to API clients/schemas/fixtures; grep verification step.
   - `playwright-ci`: templates for the 3 workflows + `references/strategy-guide.md` (when serial: shared state/rate-limited targets; parallel: default; sharding: suite > ~10 min, needs `fullyParallel` + blob) + tag-based selection (`--grep @smoke` on PR, full on main/nightly).
   - `playwright-cli`: replace vendored copy with output of `playwright-cli install --skills` (keeps `references/playwright-tests.md` with `--debug=cli`/`attach`).
4. **Agent `.claude/agents/qa-engineer.md`**: `skills: [playwright-architecture, playwright-cli]`, `memory: project`, `tools: Read, Write, Edit, Glob, Grep, Bash, Skill, Agent`, `permissionMode: acceptEdits`, `maxTurns: 60`; body = parameter resolution (read `.env.example`/`AGENTS.md`, ask if missing), routing table (scaffold / create UI / create API / fix / delete / CI), gates (live scan before inventing locators; run + lint before claiming done), response protocol. No absolute paths, no app names.
5. **Hook** in `.claude/settings.json`: `PostToolUse` matcher `Edit|Write` → `scripts/lint-changed.sh` (runs `eslint --fix` on the edited file if under `pages|tests|api|fixtures|utils`).
6. `docs/decisions.md` (ADR-lite, 6–8 entries).

## Phase 3 — Copilot & Cursor mirrors

1. `scripts/sync-agent-config.mjs`: parse `.claude/rules/*.md` frontmatter `paths` → emit `.cursor/rules/<name>.mdc` (`globs`, `alwaysApply: false`; rules without paths → `alwaysApply: true`) and `.github/instructions/<name>.instructions.md` (`applyTo`). `pnpm sync:agents` script; CI check that generated files are up to date.
2. `.github/copilot-instructions.md` → "Follow AGENTS.md; skills in .claude/skills; agent in .github/agents/qa-engineer.agent.md".
3. `.github/agents/qa-engineer.agent.md`: same body as the Claude agent, Copilot frontmatter (`name`, `description`, `tools`).
4. Cursor: nothing else needed (`AGENTS.md` + `.claude/skills` + generated `.mdc`). Document in `docs/decisions.md` the compatibility matrix.

## Phase 4 — Validation (end-to-end)

- `pnpm lint` clean; `pnpm exec playwright test` green for `ui`, `api`, `e2e` locally (needs `.env` with reference values).
- All three workflows run green on GitHub (trigger via `workflow_dispatch`); sharded run produces a merged HTML report artifact.
- Agent smoke tasks in Claude Code (`claude --agent qa-engineer`): (a) scaffold a throwaway framework into `/tmp/pw-demo` with parameters for a different site; (b) "add UI tests for /cart.html"; (c) break a locator on purpose → "fix tests/ui/login.spec.ts"; (d) delete the cart spec; (e) "set up sharded CI". Each must finish with lint + run evidence.
- Copilot (VS Code agent mode) and Cursor: verify skills appear in `/` menu and `AGENTS.md` is loaded; run task (b) in one of them.
- Lint negative tests: intentionally add `expect` in a page object and `import from '@playwright/test'` in a spec → lint fails.

## Phase 5 (later, separate effort) — Plugin extraction

Move `.claude/skills/playwright-*`, `.claude/agents/qa-engineer.md`, `.claude/rules`, `scripts/sync-agent-config.mjs` into a plugin repo with `.claude-plugin/plugin.json`; this repo keeps consuming it. Design in Phases 2–3 already guarantees no edits are needed (no absolute paths, parameters from `.env`/`AGENTS.md`).

## Execution notes

- Work on a feature branch (`feat/standards-kit`), commit per phase.
- Spec first: write `docs/superpowers/specs/2026-09-08-playwright-standards-kit-design.md` from this plan (brainstorming skill output), then implementation plan via `superpowers:writing-plans`.
- Keep every instruction file under the documented limits (CLAUDE.md/AGENTS.md < 200 lines, rules < 60 lines, SKILL.md bodies focused with details in `references/`).
- Memory to save after leaving plan mode: user profile (QA engineer, TS-first, enterprise expectations), feedback (kit must be app/API-agnostic and parameterized; no Playwright planner/generator/healer), project (this repo = reference + kit, plugin later).
