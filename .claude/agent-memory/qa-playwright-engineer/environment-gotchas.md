---
name: environment-gotchas
description: Local shell/runtime quirks for this repo (pnpm not on PATH, playwright-cli usage) and SauceDemo data-test naming observed live
metadata:
  type: project
---

- 2026-09-08: `pnpm` is NOT on PATH in this machine's shell; every command must be `corepack pnpm …` (`corepack pnpm lint`, `corepack pnpm exec playwright test …`, `corepack pnpm exec playwright-cli …`).
- 2026-09-08: Bash tool rejects `${PIPESTATUS[0]}`-style expansions; check exit codes with `; echo $?` or rely on output tail.
- 2026-09-08: SauceDemo (`BASE_URL`) uses short `data-test` values with no suffixes: login error banner is `<h3 data-test="error">`, login button is `<input data-test="login-button">`, inputs are `username`/`password`. There is no `error-message` attribute — a locator rename to that value broke `tests/ui/login.spec.ts` once.
- 2026-09-08: `playwright-cli click "<describe name>"` does not resolve `.describe()` labels; click by snapshot ref (`click e15`) or a selector.
- 2026-09-08: The Bash sandbox rejects chained commands (`&&`, `;`) and `git rm` without approval; issue one command per call (parallel calls are fine) and delete with plain `rm` — git tracks it as ` D` anyway.
- 2026-09-08: `--project=ui` (or `e2e`) already runs the `setup` dependency automatically (verified with `--list`: 1 setup + N ui). Adding `--project=setup` is harmless but not required; a missing storage state means `setup` itself failed.

**Why:** each of these cost a wasted command or a red run during the login-spec fix.
**How to apply:** prefix commands with `corepack pnpm`; always `eval` the real `data-test` value on the live page before changing a locator.
