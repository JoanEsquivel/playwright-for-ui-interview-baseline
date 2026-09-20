---
name: playwright-locks
description: Protect a shared resource that tests cannot duplicate with Playwright test locks (the `lock` test option, Playwright 1.63+) — decide lock vs isolation, declare it on every participant, keep writers crash-safe, prove the race and the fix, and handle CI where locks do not cross shards or jobs. Use when asked about "lock", "shared resource", "tests collide in parallel", "seeded account", "fails only with several workers", or "instead of workers=1".
allowed-tools: Bash(npx:*) Bash(pnpm:*) Bash(corepack:*) Bash(npm:*) Bash(yarn:*) Bash(node:*) Bash(ruby:*) Bash(gh:*)
---

# Test locks

Principle: **test isolation first, locks when a shared resource is unavoidable.** A lock is a named mutex inside one `playwright test` run: tests that share a lock name never run at the same time, across files, workers and projects of the same phase (`references/semantics.md`), while everything else stays parallel. It replaces `--workers=1` with serialisation only where the sharing is.

Follows `playwright-architecture` (preloaded in the agent; read it if not). Reference implementation with a real race, the fix and CI: <https://github.com/JoanEsquivel/playwright-lock-demo>.

## 0. Requirement

`lock` exists since `@playwright/test` **1.63**. Check `node -p "require('@playwright/test/package.json').version"`. Older: upgrade (then re-run the suite), or fall back to the serial strategy in `playwright-ci`. On older versions TypeScript rejects the unknown `lock` key; in JS do not count on a runtime warning, so check the version first.

## 1. Decide (`references/decision-guide.md`)

Ask in this order: can the sharing be removed? → can it be read-only for most tests? → only then lock.

| Situation | Do |
|---|---|
| Each test can own a copy (user, record, file, `.auth/<role>.json`), or tests only read | no lock |
| One thing that cannot be duplicated (seeded account, global setting, one-slot sandbox) | `lock` on **every** test that touches it |
| Shared across shards, CI jobs or concurrent runs | a lock does not help → `references/ci.md` |
| Test B needs what test A produced | redesign (setup project, fixture); locks control access, not order |
| The whole suite mutates the same state, or the target is rate-limited | serial strategy (`playwright-ci`); a lock caps concurrency at 1, it does not rate-limit |

## 2. Declare (`references/semantics.md`)

```ts
test('should rename the user', { tag: ['@regression', '@locked'], lock: 'user-settings' }, async ({ … }) => {});
test.describe('Account settings', { tag: ['@e2e', '@locked'], lock: 'seeded-account' }, () => {});   // default: group form
test('should reset account and sandbox', { tag: ['@locked'], lock: ['seeded-account', 'payment-sandbox'] }, async () => {});
```

- Name = kebab-case noun of the **resource** (`seeded-account`), never of the test or file. Same spelling everywhere. It is fixed when the file loads: it cannot depend on `testInfo` or a fixture.
- Add the **`@locked`** tag wherever you add `lock`: `--grep` sees tags, not lock names, and CI needs to select these tests (`references/ci.md`).
- Prefer the group form: forgetting one test is how races come back.
- Find every participant first: `grep -rn "<resource handle>" tests fixtures utils`. A test that touches the resource without the lock is invisible to the scheduler.
- A test that does not need the resource must not touch it (for a session file: `test.use({ storageState: { cookies: [], origins: [] } })`).
- Keep `fullyParallel: true` and no `beforeAll` in locked files; otherwise the lock is held for the whole file or chunk.

## 3. Writers leave it as they found it

A lock gives exclusive access, not cleanup. Snapshot in `beforeEach`; restore at the end of the test body **and** in `afterEach`, which also runs on failure and still inside the lock: `templates/locked-writer.spec.ts`. `afterEach` does not run if the worker process dies; a resource that setup does not recreate needs a reset step at the start of the run too.

## 4. Prove it (`references/reproduce-and-verify.md`)

1. Reproduce **without** the lock: retries off, ≥ 4 workers, repeat — `templates/playwright.race.config.ts`, or `playwright test <specs> --workers=4 --repeat-each=3 --retries=0`. Add `templates/timeline.fixtures.ts` to see which tests overlapped.
2. Add the lock, then stress: `playwright test --workers=4 --repeat-each=2 --retries=0` → must be green every time.

Retries hide races; never validate a lock with retries on.

## 5. CI (`references/ci.md`)

Locks work inside one job. They do **not** cross `--shard` processes, matrix jobs or concurrent workflow runs: partition the resource, in the order given in `references/ci.md`. Optional two-job proof workflow for tutorials: `templates/playwright-locks.yml` (tokens as in `playwright-ci`).

## 6. Verify and report

`lint` clean, the stress run green with output shown. Report: the resource, the lock name, every participant file, why isolation was not possible, and the CI implication. Record the lock name and its resource in the agent memory.

## Never

- Use a lock to force order, or to hide tests that depend on each other.
- Assert on lock timing or on which test ran first; assert outcomes only.
- Lock what could be isolated (per-role storage state, per-test data).
- Add the lock to some participants only, or validate it with retries enabled.
- Assume a lock protects a resource across shards, jobs or machines.
- Hide a collision with `waitForTimeout`, retries or `--workers=1`.

Pitfalls with symptoms: `references/gotchas.md`.
