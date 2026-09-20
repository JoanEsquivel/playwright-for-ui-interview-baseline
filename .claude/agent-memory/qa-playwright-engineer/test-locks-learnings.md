---
name: test-locks-learnings
description: What was learned building and reviewing the Playwright test locks demo (lock option, 1.63) — real bugs found, measured behaviour locally and in CI, and what this repo does NOT have yet
metadata:
  type: project
---

Source: the author's research repo <https://github.com/JoanEsquivel/playwright-lock-demo> (local copy: `../playwright-lock-demo`), integrated into the kit on 2026-09-19. Procedure lives in the `playwright-locks` skill; this file keeps only what is easy to forget.

- 2026-09-13: `lock` is `TestDetails.lock?: string | string[]` in `@playwright/test` 1.63.0 (already pinned here and in the scaffold templates). Verified in `types/test.d.ts` and in the runner: held locks live in the dispatcher's memory, a job's locks are the union of its tests' locks plus every enclosing `describe`.
- 2026-09-13: First version of the demo had two real bugs found in review: (1) public `ui` specs inherited the project `storageState` and read the shared file **without** the lock; (2) the writer restored the resource only at the end of the test body, so a crash poisoned the rest of the run. Fixes: logged-out `test.use` for tests that do not need the resource; snapshot in `beforeEach` + restore in `afterEach`.
- 2026-09-13: One race, three symptoms: `Received: "<other user>"`, `Expected: hidden / Received: visible`, and `Error reading storage state …: Unexpected end of JSON input`. Writers never failed; only readers did.
- 2026-09-13: Laptop collided 1 of 9 readers, the `ubuntu-latest` runner 5 of 9 (`5 failed, 8 passed (33.0s)`); with locks `15 passed (30.0s)`. Runner default is 2 workers: stress with `--workers=4 --retries=0`.
- 2026-09-13: Locks do not cross shards: two locked tests passed in one invocation and collided as `--shard=1/2` + `--shard=2/2` (`Shard exit codes: 0, 1`). That experiment is only in the demo's git history (`git show b22e218:docs/PLAYWRIGHT_SHARDING_AND_LOCK.md`).
- 2026-09-13: The tutorial's first wording of the `beforeAll`/serial granularity was wrong and had to be corrected; check such claims against the docs or the runner source, not from memory.
- 2026-09-13: Use `testInfo.parallelIndex` (stable slot) in timelines, not `workerIndex` (grows on every worker restart).
- 2026-09-19: **This repo has no locked test and no lock name yet.** As far as observed, SauceDemo keeps its state in the browser context and DummyJSON simulates writes without persisting them, so nothing here is genuinely shared between tests. Do not add a lock "as an example"; the demo's shared `.auth/user.json` is a deliberate teaching anti-pattern (the kit rule stays: one `.auth/<role>.json` per role).

**Why:** the collision looks like an application bug or CI noise, passes on retry, and costs hours when the class (`contention`) is not recognised.
**How to apply:** when a test fails only with several workers, reproduce with `--workers=4 --repeat-each=3 --retries=0` including the specs that write what it reads; isolate first, lock only what cannot be duplicated, on every participant. When a lock is added to this project, record its name and the resource it protects here.
