# Test lock semantics

Source of truth: `TestDetails` in `@playwright/test` 1.63 (`lock?: string | string[]`), the [Test locks docs](https://playwright.dev/docs/test-parallel#test-locks) and the [1.63.0 release notes](https://github.com/microsoft/playwright/releases/tag/v1.63.0). *(source)* = read in the 1.63.0 runner code; *(measured)* = observed in the reference demo.

## API

`lock` is a key of the details object, next to `tag` and `annotation`. It is accepted by `test()`, `test.describe()` and their variants (`only`, `skip`, `fixme`, `fail`, …).

```ts
test('title', { lock: 'user-settings' }, async ({ page }) => {});
test('title', { lock: ['seeded-account', 'payment-sandbox'] }, async () => {});
test.describe('group', { tag: ['@e2e', '@locked'], lock: 'seeded-account' }, () => {});
```

- A lock is a **name**. Nothing to register, configure or clean up. Two tests coordinate because they spell the same string.
- Same name → never concurrent, "even when they are declared in different files or belong to different projects" (of the same phase, see below). Different name or no name → unaffected.
- `lock: ['a', 'b']` starts only when **all** are free (all-or-nothing, so no deadlock). It blocks holders of `a`, holders of `b` and holders of both; not holders of `c`.
- A test's locks are its own plus those of every enclosing `describe` (union). *(source)*
- **Validated at load time.** Anything other than a string or an array of strings throws when the file is loaded. *(source)*
- **Fixed at collection time.** The name is read when the test is declared, before any fixture runs. It cannot depend on `testInfo` (`parallelIndex`, `testId`) or on a fixture value. A computed name is fine only when its inputs are known at file load (an env var, a row of `data/*.json` in a loop).

## When it is held

"Playwright acquires all the locks of a test before the test starts and releases them when it finishes."

- Held for the **whole test**: test-scoped fixtures setup, `beforeEach`, body, `afterEach`, test-scoped fixtures teardown. The browser context is created *inside* the lock, so a `storageState` file is read inside it too.
- Released after teardown. *(measured)* the next holder started 6 ms after the previous one ended.
- `afterEach` runs inside the lock, so a restore done there is never observed half-way by another holder. It does **not** run when the worker process dies (crash, kill, interrupted run).
- **Worker-scoped fixtures are not covered.** They live across tests and are torn down when the worker shuts down, outside any test's lock (only after a failure are they torn down inside the failing test). Never keep the shared resource in a worker-scoped fixture. *(source)*
- **Retries keep the locks** of the original group. With `retryStrategy: 'isolated'` a retry runs while no other worker is busy, so a collision is guaranteed to pass on retry. *(source)*

## Exclusive, not read/write

Locks are plain mutexes. There is no "many readers, one writer": three read-only tests holding the same name also take turns with each other. The locked tests cost roughly the sum of their durations instead of the longest one; it is one more reason to make readers independent of the resource when possible.

## Granularity depends on the file mode

The unit that holds a lock is the *job*: the group of tests the runner must execute together on one worker. A job's locks are the union of its tests' locks. *(source)*

| Mode | Job = unit that holds the lock |
|---|---|
| `fullyParallel: true` (kit standard), no `beforeAll`/`afterAll` | each test |
| default file mode (`fullyParallel: false`) | the whole file: a lock declared by **any** test is held for **all** of it, and its lock-free tests wait behind it too |
| `test.describe.configure({ mode: 'serial' })` | the serial group |
| parallel mode **and** a `beforeAll`/`afterAll` in an enclosing suite | the tests are split into chunks of `ceil(n / workers)`; the lock is held for a whole chunk |

Keep `fullyParallel: true` and avoid `beforeAll` in locked files, or the lock serialises more than you intended.

## How the scheduler applies it *(source)*

- The dispatcher keeps held locks **in the memory of the runner process**. When a worker is free it takes the **first** queued job whose locks are all free and skips the others. A waiting test does not occupy a worker: the worker runs lock-free tests meanwhile. If only locked jobs are left, workers idle.
- First-fit, no fairness: a job that needs `['a', 'b']` can be overtaken repeatedly by jobs that need only `a` or only `b`. Timing and order are not guaranteed; never assert on them.
- Nothing is written to disk or shared between processes. That is the mechanical reason locks cannot cross shards or jobs.

## Projects and phases *(source)*

The run is split into **phases**: a project enters the phase in which all its `dependencies` have finished. Phases run one after another and each has its own dispatcher, so:

- locks coordinate projects of the **same phase** (`ui`, `e2e`, `ui-firefox`, …);
- tests of different phases never overlap anyway, with or without a lock;
- in the kit's standard config, phase 1 = `setup` + `api` (no dependencies), phase 2 = `ui*` + `e2e*`.

A `setup` project that *creates* the shared resource needs no lock against its **dependents**: they start after it finished. A project that does not depend on it (`api` here) runs at the same time as `setup`; if such a test touches what `setup` creates, give it the dependency or the same lock.

## Worker, project, shard

- **Worker**: an OS process. Separate memory and browser contexts; a module-level variable is not shared between workers. Shared things are therefore always *outside* the test process: a file, an account, a backend record, a sandbox.
- **Project**: a named configuration in the same run, scheduled on the same worker pool.
- **Shard**: a separate `playwright test --shard=i/n` invocation, usually on another machine. **Locks do not cross shards**, nor concurrent jobs or workflow runs (`ci.md`).
- `testInfo.parallelIndex` is the stable slot number (`0..workers-1`); `testInfo.workerIndex` grows every time a worker process restarts. Use `parallelIndex` when printing timelines. Both are numbered per invocation: worker 0 of shard 1 and worker 0 of shard 2 are unrelated.

## What a lock is not

- Not an order: "not at the same time", never "A before B".
- Not cleanup: exclusive access only.
- Not distributed: one process, one run.
- Not a rate limiter: it caps concurrency on the resource at 1; it does not space requests out.
- Not a substitute for isolation: every locked test is a test that no longer runs in parallel with its peers.
