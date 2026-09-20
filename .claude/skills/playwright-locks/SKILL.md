---
name: playwright-locks
description: Protect a shared resource that tests cannot duplicate with Playwright test locks (the `lock` test option, Playwright 1.63+) — decide whether a lock is the right tool, declare it on every participant, keep writers crash-safe, prove the race without the lock and the fix under stress, and handle CI where locks do not cross shards or jobs. Use when asked about "lock", "shared resource", "tests collide in parallel", "race between tests", "seeded account", "single sandbox", "rate-limited API", "fails only with several workers", or "instead of workers=1 / serial".
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(npm:*) Bash(yarn:*) Bash(curl:*) Bash(node:*) Bash(ruby:*) Bash(gh:*)
---

# Test locks

Principle: **test isolation first, locks when a shared resource is unavoidable.** A lock is a named mutex inside one `playwright test` run: tests that share a lock name never run at the same time, across files, workers and projects, while everything else stays parallel. It replaces `--workers=1` with serialisation only where the sharing is.

Follows `playwright-architecture` (preloaded in the agent; read it if not). Reference implementation with a real race, the fix and CI: <https://github.com/JoanEsquivel/playwright-lock-demo>.

## 0. Requirement

`lock` exists since `@playwright/test` **1.63**. Check `node -p "require('@playwright/test/package.json').version"`. Older: upgrade (then re-run the suite), or fall back to the serial strategy in `playwright-ci`. On older versions TypeScript rejects the unknown `lock` key; in JS do not count on a runtime warning, so check the version first.

## 1. Decide (`references/decision-guide.md`)

Ask in this order: can the sharing be removed? → can it be read-only for most tests? → only then lock.

| Situation | Do |
|---|---|
| Tests only read the shared thing | nothing; reads do not conflict |
| Each test can own a copy (user, record, file, `.auth/<role>.json`) | make it unique per test/role; no lock |
| One thing that cannot be duplicated (seeded account, global setting, one-slot sandbox, rate-limited API) | `lock` on **every** test that touches it |
| Several such things in one test | `lock: ['a', 'b']` |
| Shared across shards, CI jobs or concurrent runs | a lock does not help → `references/ci.md` |
| Test B needs what test A produced | redesign (setup project, fixture); locks control access, not order |

## 2. Declare (`references/semantics.md`)

```ts
test('should rename the user', { tag: ['@regression'], lock: 'user-settings' }, async ({ … }) => {});
test.describe('Account settings', { tag: ['@e2e'], lock: 'seeded-account' }, () => {});   // default: group form
test('should reset account and sandbox', { lock: ['seeded-account', 'payment-sandbox'] }, async () => {});
```

- Name = kebab-case noun of the **resource** (`seeded-account`), never of the test or file. Same spelling everywhere; keep it greppable.
- Prefer the group form: forgetting one test is how races come back.
- Find every participant first: `grep -rn "<resource handle>" tests fixtures utils`. A test that touches the resource without the lock is invisible to the scheduler.
- A test that does not need the resource must not touch it (for a session file: `test.use({ storageState: { cookies: [], origins: [] } })`).
- Keep `fullyParallel: true`; otherwise the lock is held for the whole file (`references/semantics.md`).

## 3. Writers leave it as they found it

A lock gives exclusive access, not cleanup. Snapshot in `beforeEach`, restore in `afterEach` (hooks run inside the lock, pass or fail): `templates/locked-writer.spec.ts`.

## 4. Prove it (`references/reproduce-and-verify.md`)

1. Reproduce **without** the lock: retries off, ≥ 4 workers, repeat — `templates/playwright.race.config.ts`, or `playwright test <specs> --workers=4 --repeat-each=3 --retries=0`. Add `templates/timeline.fixtures.ts` to see which tests overlapped.
2. Add the lock, then stress: `playwright test --workers=4 --repeat-each=2 --retries=0` → must be green every time.

Retries hide races; never validate a lock with retries on.

## 5. CI (`references/ci.md`)

Locks work inside one job. They do **not** cross `--shard` processes, matrix jobs or concurrent workflow runs: partition the resource (per test → per worker/shard → idempotent operation → external coordination). Optional two-job proof workflow: `templates/playwright-locks.yml` (tokens as in `playwright-ci`).

## 6. Verify and report

`lint` clean, the stress run green with output shown. Report: the resource, the lock name, every participant file, why isolation was not possible, and the CI implication. Record the lock name and its resource in the agent memory.

## Never

- Use a lock to force order, or to hide tests that depend on each other.
- Lock what could be isolated (per-role storage state, per-test data).
- Add the lock to some participants only, or validate it with retries enabled.
- Assume a lock protects a resource across shards, jobs or machines.
- Replace a lock with `waitForTimeout`, retries or `--workers=1` "to be safe".

Pitfalls with symptoms: `references/gotchas.md`.
