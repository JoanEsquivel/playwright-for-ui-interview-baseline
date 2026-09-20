# Decision log

Short records of the choices behind this framework and kit. Newest last.

## 1. TypeScript by default, JavaScript as a supported variant
**Decision:** Standards and templates are written in TypeScript; the `playwright-architecture` skill ships a JS/JSDoc variant and the scaffold script accepts `--lang js`.
**Why:** Typed fixtures and `@typescript-eslint/no-floating-promises` catch the most common agent mistakes (missing `await`, wrong fixture names) before a browser starts.
**Consequences:** `tsc --noEmit` is part of `pnpm lint`; JSON data files are imported directly (CommonJS runtime, no `"type": "module"`).

## 2. Thin page objects; assertions only in specs
**Decision:** `pages/**` and `api/**` expose locators and actions and return raw results. Every `expect` lives in `tests/**`.
**Why:** A spec should show what is verified without opening other files; page objects stay reusable across positive and negative tests.
**Consequences:** Lint forbids `expect` and the `expect` import in those layers. Readiness is expressed with `waitFor()` inside `waitLoad()`.

## 3. The bridge guard exception
**Decision:** A flow method in `utils/e2e.ts` may contain one `expect` that confirms a page transition, wrapped in `test.step`.
**Why:** Multi-page flows need a hard stop when navigation fails; a `waitFor()` would only time out with a less useful message.
**Consequences:** The guard is documented in-line and is never used to assert a business outcome.

## 4. Page objects and clients are fixtures
**Decision:** Every page object and API client is registered in a fixture file and merged in `fixtures/index.fixtures.ts`; specs never instantiate classes.
**Why:** Tests declare what they need as parameters; wiring changes in one place; `mergeTests` keeps concerns separated.
**Consequences:** Adding a page object without a fixture entry is a rule violation caught by the delete/create checklists.

## 5. API clients return `APIResponse`; zod validates in specs
**Decision:** Clients do not parse or assert. Specs check status, then `expect(body).toMatchSchema(Schema)` and business rules.
**Why:** Keeps clients reusable for negative cases (4xx) and makes contract drift visible with a readable zod error.
**Consequences:** One schema file per resource; the `toMatchSchema` matcher is defined in the fixtures index.

## 6. One agent with preloaded skills
**Decision:** A single `qa-playwright-engineer` agent preloads `playwright-architecture` and `playwright-cli` and routes to task skills. No orchestrator/sub-agent hierarchy.
**Why:** The previous orchestrator + three specialists design duplicated rules in four places, cost extra turns and could not be mirrored to Copilot or Cursor.
**Consequences:** Parallel sub-agents are used only for independent page scans (three or more pages).

## 7. `AGENTS.md` is the portable source of truth
**Decision:** The always-on contract lives in `AGENTS.md`; `CLAUDE.md` imports it; `.github/copilot-instructions.md` points to it; Cursor reads it natively.
**Why:** One file, three tools, no drift.
**Consequences:** Claude-only details stay in `CLAUDE.md` below the import.

## 8. Rules are authored once and mirrored by script
**Decision:** Path-scoped rules live in `.claude/rules/*.md`; `scripts/sync-agent-config.mjs` generates `.cursor/rules/*.mdc` and `.github/instructions/*.instructions.md`.
**Why:** Each tool has its own frontmatter (`paths`, `globs`, `applyTo`); generating avoids hand-maintained copies.
**Consequences:** CI fails if generated files are stale.

## 9. Lint is the enforcement layer
**Decision:** Architecture rules that can be expressed as ESLint rules are; a `PostToolUse` hook runs ESLint after edits in Claude Code; the `Lint` workflow blocks merges.
**Why:** Instruction files are context, not enforcement; any tool can ignore them.
**Consequences:** Some rules (live scan before locators, no weakened assertions) remain procedural and are covered by skill checklists.

## 10. Playwright's built-in planner/generator/healer agents are not used
**Decision:** The kit keeps its own skills and uses `@playwright/cli` for live browsing and `--debug=cli` attach sessions.
**Why:** The built-in agents generate a different structure (specs in markdown, flat tests) that conflicts with these standards.
**Consequences:** `playwright-cli install --skills` is the only upstream artifact vendored (`.claude/skills/playwright-cli`).

## 11. Targets are parameters
**Decision:** URLs, credentials, language and package manager are inputs (`.env`, scaffold flags), never constants in skills or templates.
**Why:** The kit must scaffold and maintain frameworks for any application; the example targets exist only to keep this repository runnable.
**Consequences:** `grep` for hard-coded targets is part of the kit's verification.

## 12. Shared resources: isolation first, test locks for what cannot be duplicated
**Decision:** A test owns the data it changes (own record, own user, one `.auth/<role>.json` per role). Only a resource that cannot be duplicated (a seeded account, a global setting, a one-slot sandbox) gets a Playwright test lock (`{ lock: '<resource-name>' }`, 1.63+), declared on **every** participant together with the `@locked` tag, group form by default, with writers restoring the resource in `afterEach`. The knowledge lives in the `playwright-locks` skill and `docs/test-locks.md`; this repository ships **no** locked test, race config or locks workflow.
**Why:** Before 1.63 the only answers to a collision were `--workers=1`, `describe.serial` (same file only) or retries, which slow the whole suite or hide the failure. A lock serialises only the participants, who then cost roughly the sum of their durations while the rest stays parallel. In the research repo's CI ([playwright-lock-demo](https://github.com/JoanEsquivel/playwright-lock-demo)) the lock-free copies of the session specs gave `5 failed, 8 passed` and the whole suite with locks, stressed, `15 passed`. The example targets here (SauceDemo, DummyJSON) have no genuinely shared mutable resource, so a locked test in this repo would be a manufactured anti-pattern like the demo's shared session file, which is a teaching prop and contradicts the per-role storage-state rule.
**Consequences:** "Every participant declares the lock" cannot be expressed in ESLint and stays procedural (skill checklist, `tests.md` rule, review checklist). Locks are runner-local: they do not cross shards, matrix jobs or concurrent runs, and inside one run they coordinate only projects of the same phase (here `setup` + `api`, then `ui*` + `e2e*`). `playwright-sharded.yml` therefore needs a partitioned resource for locked tests; running the `@locked` tests in one non-sharded job and a `concurrency:` group per environment are this kit's own guidance, not something the research measured. `--grep` sees tags and not lock names, hence the `@locked` tag. Lock validation runs with `--workers=4 --retries=0` because retries and the 2-worker runner default hide collisions. `fix-test` gained the `contention` failure class. The Copilot skill list in `scripts/sync-agent-config.mjs` is now derived from `.claude/skills/` so a new skill cannot leave it stale.

## 13. One root import alias, `@/`, enforced by lint
**Decision:** Every import that leaves its own folder is written from the repository root: `@/fixtures/index.fixtures`, `@/pages/login`, `@/data/cart.json`, `@/playwright.config`. The mapping is one line, `"paths": { "@/*": ["./*"] }`, in `tsconfig.json` (`jsconfig.json` in the JS variant), with no `baseUrl`. Same-folder `./` imports stay. `../` is a lint error everywhere.
**Why:** `'../../fixtures/index.fixtures'` depends on where the importing file sits, so moving a spec breaks it, and `create-test` had to carry a troubleshooting row for wrong relative paths. A single root alias was chosen over per-folder aliases (`@pages/*`, `@api/*`) because those need a new mapping for every new top-level folder, in this repo and in both scaffold templates, and `@api/...` reads like a scoped npm package. `@/` cannot be a package name.
**Consequences:** No dependency was added: `tsc`, typed ESLint (`projectService`) and the Playwright runtime all read `paths` from the same file, and Playwright resolves an existing file as-is, so JSON data imports keep their extension. The gate is a `regex: '^\\.\\./'` pattern in `no-restricted-imports`; flat config replaces a rule's options per file instead of merging them, so the pattern is a shared constant repeated in the global, spec and action-layer blocks, and a new block that sets `no-restricted-imports` must repeat it too. The scaffold templates (TS and JS), rules, skills and agent carry the same standard. Links such as `../templates/x` inside skill markdown are document links, not imports, and are unaffected.

## 14. API bodies are typed from zod; `unknown` never reaches a spec (amends 5)
**Decision:** The zod schema in `api/schemas` is the only place a request or response shape is written. Responses export `z.infer` types, requests and query params `z.input` types. Clients still return the raw, unparsed response (decision 5 holds) but as `APIResponse<T>`, with `T` defaulting to the response type, so a spec reads `const cart = await response.json()` already typed, proves it with `expect(cart).toMatchSchema(CartSchema)` and asserts business rules on that same value. A negative case passes the contract it expects (`getById<ErrorResponse>(id)`). `: unknown`, `any`, `as` casts and hand-written interfaces for a body are lint errors. Full write-up and the alternatives evaluated: `docs/api-typing.md`.
**Why:** The previous standard told agents to annotate every body as `unknown`, because `json()` returned `any` and the annotation was the only barrier against it. The price was a payload validated twice per test (`toMatchSchema`, then `Schema.parse` just to obtain a type), inferred types that nothing imported, request shapes duplicated as interfaces in clients, and a hand cast in the auth fixture. Playwright 1.63 made `APIResponse` and the request methods generic, which lets the schema's inferred type travel from the client to the spec with no new dependency. `z.input` is used for requests because it is what the caller must provide; `z.output` would demand more if a schema gained a default or transform.
**Consequences:** The static type is the client's claim and `toMatchSchema` its runtime proof, so the order status → typed body → `toMatchSchema` → business rules is mandatory and no property is read before the matcher passes. Response schemas describe the wire format (no `transform`, `default`, `coerce`). Outside specs, where there is no matcher, a fixture or hook parses (`LoginResponseSchema.parse(...)`). `unknown` survives only as the `received` parameter of the matcher, a validation boundary. `CartsClient.add` takes one `AddCartRequest` payload instead of positional arguments; `login(username, password)` stays positional because the credentials lint gate matches that call shape. Request types are compile-time only: clients never parse a request, so negative tests can still send invalid values. Generating schemas from an OpenAPI document is documented as an optional path, not installed. Found along the way and fixed: the JS scaffold template failed its own lint on a fresh project (`no-empty-pattern` on Playwright's `async ({}, use)` fixture signature).

## Appendix — tool compatibility matrix

| Artifact | Claude Code | GitHub Copilot (VS Code / CLI / cloud) | Cursor |
|---|---|---|---|
| `AGENTS.md` | via `@AGENTS.md` in `CLAUDE.md` | native (always-on) | native (always-on) |
| `CLAUDE.md` | native | VS Code reads it | — |
| `.claude/rules/*.md` (`paths`) | native | VS Code reads them; CLI/cloud use the generated `.github/instructions/*.instructions.md` (`applyTo`) | generated `.cursor/rules/*.mdc` (`globs`) |
| `.claude/skills/*/SKILL.md` | native | native (`.claude/skills` is a supported location) | native (`.claude/skills` is a supported location) |
| Agent | `.claude/agents/qa-playwright-engineer.md` (skills preloaded, project memory) | generated `.github/agents/qa-playwright-engineer.agent.md` | no agent files; `AGENTS.md` + skills cover the role |
| Lint hook | `.claude/settings.json` `PostToolUse` | — (rely on `pnpm lint` and the Lint workflow) | — (same) |
| Enforcement | ESLint gates + CI | ESLint gates + CI | ESLint gates + CI |

Generated files carry a `GENERATED` header; `pnpm sync:agents` rewrites them and `pnpm sync:agents:check` fails CI when they drift.
