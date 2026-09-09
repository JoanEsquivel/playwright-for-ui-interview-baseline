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
